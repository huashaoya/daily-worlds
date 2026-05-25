import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

// 模型配置
const SEEDREAM_MODEL = 'doubao-seedream-4-5-251128' // 可选: doubao-seedream-5-0-260128

// 生成提示词
function createPromptTemplate(story) {
  if (story) {
    return `探索视角：基于参考图的故事背景"${story}"，以"深入探索"的方式继续细化扩展。

严格保持：主体元素的位置、大小、比例完全一致，不得放大或缩小任何元素。

新增内容：在现有元素之间和周围，以"发现新细节"的思路补充——纹理更精细、质感更丰富、层次更分明。

风格延续：色彩、光影、氛围必须保持一致，像是在同一时刻、同一光线下继续观察。

整体效果：像是用高倍放大镜观察同一个区域，看到的是更深入、更丰富的细节，而非不同的构图。`
  }
  return `探索视角：以"深入探索"的方式继续细化扩展参考图。

严格保持：主体元素的位置、大小、比例完全一致，不得放大或缩小任何元素。

新增内容：在现有元素之间和周围，以"发现新细节"的思路补充——纹理更精细、质感更丰富、层次更分明。

风格延续：色彩、光影、氛围必须保持一致，像是在同一时刻、同一光线下继续观察。

整体效果：像是用高倍放大镜观察同一个区域，看到的是更深入、更丰富的细节，而非不同的构图。`
};

/**
 * 生成探索细节图
 * @param {string} originalImageUrl - 原始图片 URL
 * @param {string} loupeImageBase64 - 取景框截取的 base64 图片
 * @param {string} worldId - 世界 ID（用于保存路径）
 * @param {string} apiKey - ARK API Key
 * @param {string} story - 世界故事（可选）
 * @returns {Promise<{success: boolean, imageUrl: string, error?: string}>}
 */
async function generateExploration(originalImageUrl, loupeImageBase64, worldId, apiKey, story = null) {
  try {
    console.log('\n=== Doubao Service ===');
    console.log('Original image URL:', originalImageUrl.substring(0, 80) + '...');
    console.log('Loupe image base64 length:', loupeImageBase64?.length || 0);

    // 准备图片数组（最多 2 张）
    const images = [loupeImageBase64]; // 取景框图片作为主要参考

    // 调用 ARK API
    console.log('Calling Doubao ARK API:', ARK_API_URL);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('Image data length:', images[0] ? images[0].length : 0);

    const response = await axios.post(ARK_API_URL, {
      model: SEEDREAM_MODEL,
      prompt: createPromptTemplate(story),
      image: images,
      aspect_ratio: '1:1',
      size: '4K',
      watermark: false,
      response_format: 'url'
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('ARK API Response status:', response.status);

    // 提取图片 URL
    let imageUrl = null;
    const data = response.data;

    if (data.data?.image_urls?.[0]) {
      imageUrl = data.data.image_urls[0];
    } else if (data.data?.[0]?.url) {
      imageUrl = data.data[0].url;
    } else if (data.data?.url) {
      imageUrl = data.data.url;
    } else if (data.images?.[0]?.url) {
      imageUrl = data.images[0].url;
    }

    if (!imageUrl) {
      console.error('No image URL in response:', JSON.stringify(data));
      return { success: false, error: 'No image URL in response' };
    }

    console.log('Generated image URL:', imageUrl.substring(0, 80) + '...');

    // 下载图片到本地
    const localPath = await downloadImage(imageUrl, worldId);

    return {
      success: true,
      imageUrl: localPath
    };

  } catch (error) {
    console.error('Doubao service error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    console.error('Error syscall:', error.syscall);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 下载图片到本地
 */
async function downloadImage(imageUrl, worldId) {
  // 使用本地日期（中国时区）
  const today = new Date().toLocaleDateString('zh-CN').split('/').map(v => v.padStart(2, '0')).join('-');
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'exploration', today, `world${worldId}`);

  // 确保目录存在
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 生成文件名
  const filename = `exp_${Date.now()}.jpg`;
  const filepath = path.join(uploadsDir, filename);

  console.log('Downloading image to:', filepath);

  // 下载图片
  const response = await axios({
    method: 'get',
    url: imageUrl,
    responseType: 'arraybuffer'
  });

  fs.writeFileSync(filepath, response.data);

  // 返回相对路径（用于 URL 访问）
  const relativePath = `/uploads/exploration/${today}/world${worldId}/${filename}`;

  console.log('Image saved, URL:', relativePath);

  return relativePath;
}

// 视角变换提示词模板
function createPerspectivePrompt(story) {
  if (story) {
    return `基于这个世界的故事背景，创作一个全新的观察视角。
故事背景："${story}"

创作要求：
- 保持相同的世界观、艺术风格和氛围
- 呈现完全不同的观察角度（远景/近景/侧面/背面/时间维度等）
- 色彩、光影、整体色调保持一致
- 可以展示故事"之前"或"之后"的场景状态

风格：保持参考图的艺术风格，如色彩、笔触、光影特点等。
构图：全新的构图，但元素保持世界观的连贯性。`
  }
  return `基于参考图的世界观，创作一个全新的观察视角。

创作要求：
- 保持相同的世界观和艺术风格
- 呈现完全不同的观察角度（远景/近景/侧面/背面等）
- 色彩、光影、整体色调保持一致

风格：保持参考图的艺术风格，如色彩、笔触、光影特点等。
构图：全新的构图，但元素保持连贯性。`
}

// 故事延伸提示词模板
function createStoryPrompt(story) {
  if (story) {
    return `基于这个世界的故事，创作一个故事延伸场景。
原故事："${story}"

创作要求：
- 基于原故事的自然延续或分支发展
- 保持相同的世界观、角色设定和艺术风格
- 可以是故事发展的下一个场景、分歧走向、或新角色的视角
- 色彩、光影、整体色调保持一致
- 场景应与原故事有清晰的叙事关联

风格：保持参考图的艺术风格。
场景：与原故事连贯的新场景。`
  }
  return `基于参考图的世界，创作一个故事延伸场景。

创作要求：
- 创作一个自然延续或分支发展的新场景
- 保持相同的世界观和艺术风格
- 色彩、光影、整体色调保持一致

风格：保持参考图的艺术风格。
场景：与原世界连贯的新场景。`
}

/**
 * 生成平行探索图
 * @param {string} originalImageUrl - 原始图片 URL
 * @param {string} originalImageBase64 - 原始图片 base64
 * @param {string} parallelType - 探索类型：'perspective' 或 'story'
 * @param {string} worldId - 世界 ID（用于保存路径）
 * @param {string} apiKey - ARK API Key
 * @param {string} story - 世界故事（可选）
 * @returns {Promise<{success: boolean, imageUrl: string, error?: string}>}
 */
async function generateParallelExploration(originalImageUrl, originalImageBase64, parallelType, worldId, apiKey, story = null) {
  try {
    console.log('\n=== Doubao Parallel Exploration ===');
    console.log('Parallel type:', parallelType);
    console.log('World ID:', worldId);

    // 选择提示词模板
    const prompt = parallelType === 'story'
      ? createStoryPrompt(story)
      : createPerspectivePrompt(story);

    console.log('Prompt:', prompt.substring(0, 100) + '...');

    // 准备图片数组
    const images = [originalImageBase64];

    // 调用 ARK API
    console.log('Calling Doubao ARK API for parallel exploration');

    const response = await axios.post(ARK_API_URL, {
      model: SEEDREAM_MODEL,
      prompt: prompt,
      image_url: images,
      aspect_ratio: '1:1',
      size: '4K',
      watermark: false,
      response_format: 'url'
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('ARK API Response status:', response.status);

    // 提取图片 URL
    let imageUrl = null;
    const data = response.data;

    if (data.data?.image_urls?.[0]) {
      imageUrl = data.data.image_urls[0];
    } else if (data.data?.[0]?.url) {
      imageUrl = data.data[0].url;
    } else if (data.data?.url) {
      imageUrl = data.data.url;
    } else if (data.images?.[0]?.url) {
      imageUrl = data.images[0].url;
    }

    if (!imageUrl) {
      console.error('No image URL in response:', JSON.stringify(data));
      return { success: false, error: 'No image URL in response' };
    }

    console.log('Generated image URL:', imageUrl.substring(0, 80) + '...');

    // 下载图片到本地
    const localPath = await downloadImage(imageUrl, worldId);

    return {
      success: true,
      imageUrl: localPath
    };

  } catch (error) {
    console.error('Doubao parallel exploration error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  generateExploration,
  generateParallelExploration
}