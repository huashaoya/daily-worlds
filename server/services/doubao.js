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
    return `任务目标：基于同一世界与同一叙事背景，从一个全新的机位重新观察当前场景。结果应让人一眼看出这是“同一个世界的另一个视角”，而不是新世界、局部放大图或完全重画。

参考图说明：
- 图1（当前窗口图）：主体关系、空间结构、主要元素参考
- 图2（原始世界图）：世界观、色彩体系、光影氛围、风格一致性参考

必须保持一致：
- 世界观不变：仍然是同一个地点、同一组核心元素、同一种文明或环境设定
- 风格不变：画风、材质表现、细节密度、镜头质感保持高一致性
- 光影不变：主光源方向、明暗关系、整体时间感保持一致
- 色彩不变：主色调、冷暖关系、饱和度区间保持一致
- 画幅固定：1:1 正方形构图

允许发生的变化：
- 机位变化：可切换为侧面、背面、斜侧、俯视、仰视、远一点或近一点的观察角度
- 构图变化：允许重构前中后景层次，但仍要保留与参考图一致的空间逻辑
- 叙事变化：可表现同一场景的稍早、稍后或相邻瞬间
- 细节补充：可依据故事补充合理的小元素，但必须服务于原有世界观

明确禁止：
- 不要变成对图1的裁切放大、局部特写或简单镜像
- 不要替换核心主体，不要新增无关的大型对象
- 不要改变艺术风格、时代背景、材质设定或光线逻辑
- 不要出现文字、水印、拼贴、分屏、多画面

故事背景："${story}"
输出要求：只生成一张高一致性的“新视角画面”，优先参考图1的空间关系，参考图2保持世界观和风格统一。`
  }
  return `任务目标：从全新的机位重新观察参考图中的同一个世界。结果应像“换了站位重新看这个场景”，而不是生成另一张无关的新图。

参考图说明：
- 图1（当前窗口图）：主体关系、空间结构、主要元素参考
- 图2（原始世界图）：世界观、色彩体系、光影氛围、风格一致性参考

必须保持一致：
- 世界观不变：同一个地点、同一组核心元素、同一种环境设定
- 风格不变：画风、材质表现、细节密度、镜头质感保持高一致性
- 光影不变：主光源方向、明暗关系、整体时间感保持一致
- 色彩不变：主色调、冷暖关系、饱和度区间保持一致
- 画幅固定：1:1 正方形构图

允许发生的变化：
- 机位变化：侧面、背面、斜侧、俯视、仰视、远一点或近一点的视角
- 构图变化：允许重构前中后景层次，但仍要符合参考图的空间逻辑
- 细节补充：允许补充少量合理细节，以增强同一世界的真实感

明确禁止：
- 不要变成对图1的裁切放大、局部特写或简单镜像
- 不要替换核心主体，不要新增无关的大型对象
- 不要改变艺术风格、时代背景、材质设定或光线逻辑
- 不要出现文字、水印、拼贴、分屏、多画面

输出要求：只生成一张高一致性的“新视角画面”，优先参考图1的空间关系，参考图2保持世界观和风格统一。`
}

// 故事延伸提示词模板
function createStoryPrompt(story) {
  if (story) {
    return `任务目标：基于参考图与原故事，生成“故事继续发生后的下一幕”。画面需要有明确的新事件或新线索，让观者能感到剧情向前推进，同时仍一眼看出属于同一个世界。

参考图说明：
- 图1（当前窗口图）：当前剧情节点、主要角色/物体、空间关系的核心参考
- 图2（原始世界图）：世界观设定、整体美术风格、色彩与光影基准

必须延续的锚点：
- 世界锚点：地点属性、文明设定、环境规则、核心主体不能被替换
- 视觉锚点：画风、材质表现、细节密度、镜头质感保持一致
- 光影锚点：主光源方向、整体时间感、氛围逻辑保持一致
- 色彩锚点：主色调、冷暖关系、对比强度保持一致
- 画幅固定：1:1 正方形构图

叙事要求：
- 明确表现“下一步发生了什么”：出现一个新的动作、变化、发现、危机、回应或结果
- 新元素必须来自原故事逻辑，例如人物行动痕迹、被激活的装置、开启的通道、环境异变、远处新目标
- 可以切换到稍后的时间点、相邻区域或更能展示剧情变化的镜头，但不要脱离图1的线索
- 画面变化幅度要适中：比原图有明显新信息，但不能像完全无关的新场景

明确禁止：
- 不要生成与原故事无关的新主题、新地点、新世界
- 不要只做局部放大、简单重复或低变化复刻
- 不要改变艺术风格、时代背景、材质设定或光线逻辑
- 不要出现文字、水印、拼贴、分屏、多画面

原故事："${story}"
输出要求：只生成一张“同一世界的剧情下一幕”，优先延续图1中的关键线索，用图2统一世界观与美术风格。`
  }
  return `任务目标：基于参考图生成“故事继续发生后的下一幕”。画面需要有明确的新事件或新线索，让观者能感到剧情向前推进，同时仍一眼看出属于同一个世界。

参考图说明：
- 图1（当前窗口图）：当前剧情节点、主要角色/物体、空间关系的核心参考
- 图2（原始世界图）：世界观设定、整体美术风格、色彩与光影基准

必须延续的锚点：
- 世界锚点：地点属性、环境设定、核心主体不能被替换
- 视觉锚点：画风、材质表现、细节密度、镜头质感保持一致
- 光影锚点：主光源方向、整体时间感、氛围逻辑保持一致
- 色彩锚点：主色调、冷暖关系、对比强度保持一致
- 画幅固定：1:1 正方形构图

叙事要求：
- 明确表现“下一步发生了什么”：出现一个新的动作、变化、发现、危机、回应或结果
- 新元素必须来自参考图逻辑，例如行动痕迹、被激活的装置、开启的通道、环境异变、远处新目标
- 可以切换到稍后的时间点、相邻区域或更能展示剧情变化的镜头，但不要脱离图1的线索
- 画面变化幅度要适中：比原图有明显新信息，但不能像完全无关的新场景

明确禁止：
- 不要生成无关的新主题、新地点、新世界
- 不要只做局部放大、简单重复或低变化复刻
- 不要改变艺术风格、时代背景、材质设定或光线逻辑
- 不要出现文字、水印、拼贴、分屏、多画面

输出要求：只生成一张“同一世界的剧情下一幕”，优先延续图1中的关键线索，用图2统一世界观与美术风格。`
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
