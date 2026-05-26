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
    return `严格保持参考图的所有视觉特征，从全新的观察视角重新构图。

参考图说明：
- 图1（当前窗口图）：作为主要构图参考
- 图2（原始世界图）：作为世界观和风格的一致性参考

风格要求（必须100%一致）：
- 色彩：色相、饱和度、明度完全一致
- 光影：光源方向、光照强度、阴影位置完全一致
- 笔触/质感：与参考图相同的艺术表现手法
- 氛围：整体情绪基调完全一致

构图要求：
- 画幅：1:1 正方形画幅，完全一致
- 视点：全新的观察角度（远景/近景/侧面/背面/俯视/仰视等）
- 主体：保持世界观中的核心元素，可根据故事内容适当补充相关元素
- 场景：可以是同一场景的不同时间点（之前/之后）

故事背景："${story}"
请基于这个故事背景创作，构图参考图1，风格一致性参考图2，可根据故事内容适当添加细节元素，所有视觉特征必须与参考图100%一致。`
  }
  return `严格保持参考图的所有视觉特征，从全新的观察视角重新构图。

参考图说明：
- 图1（当前窗口图）：作为主要构图参考
- 图2（原始世界图）：作为世界观和风格的一致性参考

风格要求（必须100%一致）：
- 色彩：色相、饱和度、明度完全一致
- 光影：光源方向、光照强度、阴影位置完全一致
- 笔触/质感：与参考图相同的艺术表现手法
- 氛围：整体情绪基调完全一致

构图要求：
- 画幅：1:1 正方形画幅，完全一致
- 视点：全新的观察角度（远景/近景/侧面/背面/俯视/仰视等）
- 主体：保持参考图中的核心元素，可根据世界观适当补充细节
- 场景：可以是同一场景的不同时间点（之前/之后）

构图参考图1，风格一致性参考图2，所有视觉特征必须与参考图100%一致。`
}

// 故事延伸提示词模板
function createStoryPrompt(story) {
  if (story) {
    return `严格保持参考图的所有视觉特征，创作故事的自然延续。

参考图说明：
- 图1（当前窗口图）：作为主要构图参考
- 图2（原始世界图）：作为世界观和风格的一致性参考

风格要求（必须100%一致）：
- 色彩：色相、饱和度、明度完全一致
- 光影：光源方向、光照强度、阴影位置完全一致
- 笔触/质感：与参考图相同的艺术表现手法
- 氛围：整体情绪基调完全一致

构图要求：
- 画幅：1:1 正方形画幅，完全一致
- 场景：基于原故事的自然延续或分支发展
- 元素：可根据故事内容适当补充相关元素（如人物、道具、环境细节等）
- 叙事：与原故事有清晰的叙事关联

原故事："${story}"
请基于这个故事创作延续场景，构图参考图1，风格一致性参考图2，可根据故事内容适当添加细节元素，所有视觉特征必须与参考图100%一致。`
  }
  return `严格保持参考图的所有视觉特征，创作故事的自然延续。

参考图说明：
- 图1（当前窗口图）：作为主要构图参考
- 图2（原始世界图）：作为世界观和风格的一致性参考

风格要求（必须100%一致）：
- 色彩：色相、饱和度、明度完全一致
- 光影：光源方向、光照强度、阴影位置完全一致
- 笔触/质感：与参考图相同的艺术表现手法
- 氛围：整体情绪基调完全一致

构图要求：
- 画幅：1:1 正方形画幅，完全一致
- 场景：自然延续的新场景
- 元素：可根据世界观适当补充细节元素
- 叙事：与原世界有清晰的叙事关联

构图参考图1，风格一致性参考图2，所有视觉特征必须与参考图100%一致。`
}

/**
 * 生成平行探索图
 * @param {string} currentImageUrl - 当前图片 URL
 * @param {string} currentImageBase64 - 当前图片 base64
 * @param {string} originalImageBase64 - 原始图片 base64（可选）
 * @param {string} parallelType - 探索类型：'perspective' 或 'story'
 * @param {string} worldId - 世界 ID（用于保存路径）
 * @param {string} apiKey - ARK API Key
 * @param {string} story - 世界故事（可选）
 * @returns {Promise<{success: boolean, imageUrl: string, error?: string}>}
 */
async function generateParallelExploration(currentImageUrl, currentImageBase64, originalImageBase64, parallelType, worldId, apiKey, story = null) {
  try {
    console.log('\n=== Doubao Parallel Exploration ===');
    console.log('Parallel type:', parallelType);
    console.log('World ID:', worldId);

    // 选择提示词模板
    const prompt = parallelType === 'story'
      ? createStoryPrompt(story)
      : createPerspectivePrompt(story);

    console.log('Prompt:', prompt.substring(0, 100) + '...');

    // 准备图片数组（当前图作为主要参考，原图作为额外参考）
    const images = [currentImageBase64];
    if (originalImageBase64 && originalImageBase64 !== currentImageBase64) {
      images.push(originalImageBase64);
      console.log('Added original image as secondary reference');
    }

    // 调用 ARK API
    console.log('Calling Doubao ARK API for parallel exploration');
    console.log('Image count:', images.length);

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