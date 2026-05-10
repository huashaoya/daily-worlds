import express from 'express'
import { createRequire } from 'module'
import doubaoService from '../services/doubao.js'
import * as minimaxService from '../services/minimax.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = express.Router()

// 获取上传目录
const getUploadDir = () => path.join(__dirname, '..', 'uploads')

// 获取今天的日期
const getTodayDir = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// POST /api/generate-exploration - 生成探索细节图
router.post('/generate-exploration', async (req, res) => {
  try {
    const { originalImageUrl, loupeImageBase64, worldId, story } = req.body;

    if (!loupeImageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Missing loupe image data'
      });
    }

    const apiKey = process.env.ARK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'ARK_API_KEY not configured'
      });
    }

    console.log('\n=== Generate Exploration ===');
    console.log('World ID:', worldId);
    console.log('Original image URL:', originalImageUrl ? originalImageUrl.substring(0, 100) : 'null');
    console.log('Loupe image size:', Math.round(loupeImageBase64.length / 1024) + ' KB');
    console.log('Story present:', !!story);

    const result = await doubaoService.generateExploration(
      originalImageUrl,
      loupeImageBase64,
      worldId || '1',
      apiKey,
      story || null
    );

    if (result.success) {
      res.json({
        success: true,
        imageUrl: result.imageUrl
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/daily-images - 获取今日世界图片（支持 SSE 进度）
router.get('/daily-images', async (req, res) => {
  // 检查是否请求 SSE（通过 URL 参数或 Accept 头）
  const useSSE = req.query.sse === 'true' || req.headers.accept?.includes('text/event-stream');

  try {
    const dateDir = req.query.date || getTodayDir();
    const uploadDir = getUploadDir();

    console.log('\n=== Get Daily Images ===');
    console.log('Date:', dateDir);
    console.log('Use SSE:', useSSE);

    // 先检查文件系统中的已有图片
    const existingImages = minimaxService.getDailyImages(dateDir, uploadDir);
    console.log('Existing images:', existingImages.length);

    // 如果图片都存在，直接返回（不触发生成）
    if (existingImages.length >= 9) {
      console.log('All 9 images exist');

      if (useSSE) {
        // SSE 模式：直接返回完成消息
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        res.write(`data: ${JSON.stringify({
          type: 'complete',
          images: existingImages.map(img => ({ ...img, src: img.src.replace('/uploads', '') }))
        })}\n\n`);
        res.end();
      } else {
        res.json({
          success: true,
          images: existingImages,
          generated: false
        });
      }
      return;
    }

    // 图片不足，需要生成
    console.log(`Need to generate ${9 - existingImages.length} images`);

    if (useSSE) {
      // SSE 模式：流式推送进度
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // 先发送已有图片
      existingImages.forEach(img => {
        res.write(`data: ${JSON.stringify({
          type: 'existing',
          image: { ...img, src: img.src.replace('/uploads', '') }
        })}\n\n`);
      });

      // 生成缺失的图片，实时推送进度
      const result = await minimaxService.generateDailyImages(dateDir, uploadDir, (current, total, imageId) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          current,
          total,
          imageId,
          message: `正在生成第 ${imageId} 张图片...`
        })}\n\n`);
      });

      // 发送完成消息
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        images: result.map(img => ({ ...img, src: img.src.replace('/uploads', '') }))
      })}\n\n`);

      res.end();
    } else {
      // 普通模式：同步等待生成完成
      const generated = await minimaxService.generateDailyImages(dateDir, uploadDir);

      res.json({
        success: true,
        images: generated,
        generated: true,
        count: generated.length
      });
    }

  } catch (error) {
    console.error('API error:', error);
    if (useSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// POST /api/generate-daily - 手动触发每日图片生成
router.post('/generate-daily', async (req, res) => {
  try {
    const dateDir = req.body.date || getTodayDir();
    const uploadDir = getUploadDir();

    console.log('\n=== Generate Daily Images ===');
    console.log('Date:', dateDir);

    const images = await minimaxService.generateDailyImages(dateDir, uploadDir);

    res.json({
      success: true,
      images,
      count: images.length
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/health - 健康检查
router.get('/health', (req, res) => {
  const genStatus = minimaxService.getGenerationStatus();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    generating: genStatus.isGenerating,
    date: new Date().toISOString()
  });
});

// GET /api/dates - 获取有图片的日期列表
router.get('/dates', (req, res) => {
  try {
    const uploadDir = getUploadDir();
    const dailyDir = path.join(uploadDir, 'daily');

    if (!fs.existsSync(dailyDir)) {
      return res.json({ dates: [] });
    }

    const dates = fs.readdirSync(dailyDir)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .reverse();

    res.json({ dates });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;