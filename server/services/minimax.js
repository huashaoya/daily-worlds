import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateRandomPrompt, getFormattedDateTime } from '../config/prompts.js'
import { generateStory } from './storyGenerator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_KEY = process.env.MINIMAX_API_KEY
const API_URL = 'https://api.minimaxi.com/v1/image_generation'
const API_MODEL = 'image-01'

// 生成锁 - 防止并发生成
let isGenerating = false
let generationCache = null

// 默认重试配置
const DEFAULT_MAX_RETRIES = 3
const RETRY_DELAY_MS = 3000 // 重试间隔

/**
 * 验证图片文件
 */
function validateImage(filepath) {
  try {
    const stats = fs.statSync(filepath)
    // 最小 1KB
    if (stats.size < 1024) {
      console.log(`  Validation failed: file too small (${stats.size} bytes)`)
      return false
    }
    // 检查文件是否为 JPEG (以 FFD8FF 开头)
    const buffer = Buffer.alloc(3)
    const fd = fs.openSync(filepath, 'r')
    fs.readSync(fd, buffer, 0, 3, 0)
    fs.closeSync(fd)
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
      console.log(`  Validation failed: not a valid JPEG`)
      return false
    }
    console.log(`  Validated: ${stats.size} bytes, JPEG format OK`)
    return true
  } catch (error) {
    console.log(`  Validation error: ${error.message}`)
    return false
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 下载图片并保存
 */
async function downloadImage(url, filePath) {
  console.log(`  Downloading from: ${url.substring(0, 80)}...`)
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      timeout: 30000
    })
    console.log(`  Response status: ${response.status}, size: ${response.data.length} bytes`)
    fs.writeFileSync(filePath, response.data)
    console.log(`  Saved to: ${filePath}`)
    return true
  } catch (error) {
    console.error(`  Download failed: ${error.message}`)
    return false
  }
}

/**
 * 生成单张图片
 */
async function generateImage(prompt, outputPath) {
  console.log(`  Generating: ${prompt.substring(0, 50)}...`)
  try {
    const response = await axios.post(API_URL, {
      model: API_MODEL,
      prompt: prompt,
      num_images: 1,
      aspect_ratio: '1:1'
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    })
    // MiniMax API 返回格式: { data: { image_urls: [...] }, base_resp: {...} }
    const data = response.data
    if (data.data?.image_urls?.[0]) {
      const imageUrl = data.data.image_urls[0]
      const success = await downloadImage(imageUrl, outputPath)
      if (success && validateImage(outputPath)) {
        return { success: true, prompt }
      } else {
        console.error('  Download or validation failed')
        return { success: false, prompt }
      }
    } else {
      console.error('  No image URL in response:', JSON.stringify(data).substring(0, 200))
      return { success: false, prompt }
    }
  } catch (error) {
    console.error(`  Generation error: ${error.message}`)
    return { success: false, prompt, error: error.message }
  }
}

/**
 * 获取失败记录文件路径
 */
function getFailedLogPath(dateDir) {
  const logDir = path.join(__dirname, '..', 'logs')
  return path.join(logDir, `failed_${dateDir}.json`)
}

/**
 * 加载失败记录
 */
function loadFailedRecords(dateDir) {
  const logPath = getFailedLogPath(dateDir)
  if (fs.existsSync(logPath)) {
    try {
      return JSON.parse(fs.readFileSync(logPath, 'utf8'))
    } catch {
      return {}
    }
  }
  return {}
}

/**
 * 保存失败记录
 */
function saveFailedRecords(dateDir, records) {
  const logDir = path.join(__dirname, '..', 'logs')
  ensureDir(logDir)
  fs.writeFileSync(getFailedLogPath(dateDir), JSON.stringify(records, null, 2))
}

/**
 * 记录生成元数据
 */
function saveMetadata(dateDir, imageId, data) {
  const metaDir = path.join(__dirname, '..', 'metadata', dateDir)
  ensureDir(metaDir)
  const metaPath = path.join(metaDir, `${imageId}.json`)
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2))
}

/**
 * 生成今日世界图片（带进度回调）
 */
async function generateDailyImages(dateDir, uploadDir, onProgress = null, options = {}) {
  if (!API_KEY) {
    throw new Error('MINIMAX_API_KEY not configured')
  }

  const maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES
  const retryFailed = options.retryFailed || false

  const imagesDir = path.join(uploadDir, 'daily', dateDir)
  ensureDir(imagesDir)

  console.log(`\nDaily Worlds Image Generator`)
  console.log(`Date: ${dateDir}`)
  console.log(`Output: ${imagesDir}`)
  console.log(`Max retries: ${maxRetries}`)

  // 获取已有图片
  const existingImages = getDailyImages(dateDir, uploadDir)
  console.log(`Existing images: ${existingImages.length}/9`)

  // 如果已有全部 9 张图片且不需要重试，直接返回
  if (existingImages.length >= 9 && !retryFailed) {
    console.log('All images already exist')
    return existingImages
  }

  // 如果正在生成中，等待完成
  if (isGenerating) {
    console.log('Generation in progress, waiting...')
    while (isGenerating) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    return getDailyImages(dateDir, uploadDir)
  }

  isGenerating = true
  generationCache = null

  // 加载失败记录
  const failedRecords = loadFailedRecords(dateDir)

  try {
    const generatedImages = [...existingImages]

    for (let i = 1; i <= 9; i++) {
      const imagePath = path.join(imagesDir, `${i}.jpg`)

      // 检查是否已存在且有效
      if (fs.existsSync(imagePath) && validateImage(imagePath)) {
        console.log(`[${i}] Already exists, skipping`)
        if (!generatedImages.find(img => img.id === i)) {
          generatedImages.push({
            id: i,
            src: `/uploads/daily/${dateDir}/${i}.jpg`,
            loaded: true
          })
        }
        if (onProgress) onProgress(generatedImages.length, 9, i)
        continue
      }

      // 检查失败次数
      const currentRetries = failedRecords[i]?.retries || 0
      if (currentRetries >= maxRetries && !retryFailed) {
        console.log(`[${i}] Skipped: max retries (${maxRetries}) reached`)
        if (onProgress) onProgress(generatedImages.length, 9, i)
        continue
      }

      console.log(`\n[${i}] Generating... (attempt ${currentRetries + 1}/${maxRetries})`)
      if (onProgress) onProgress(generatedImages.length, 9, i)

      const prompt = generateRandomPrompt()
      const result = await generateImage(prompt, imagePath)

      if (result.success) {
        // 清除失败记录
        if (failedRecords[i]) {
          delete failedRecords[i]
          saveFailedRecords(dateDir, failedRecords)
        }

        // 保存元数据
        const metadata = {
          prompt: result.prompt,
          model: API_MODEL,
          generatedAt: getFormattedDateTime(),
          imageId: i,
          date: dateDir
        }

        // 生成故事（使用 ARK API）
        const arkApiKey = process.env.ARK_API_KEY
        if (arkApiKey) {
          console.log(`  Generating story for image ${i}...`)
          const story = await generateStory(imagePath, arkApiKey)
          if (story) {
            metadata.story = story
            console.log(`  Story generated: ${story.substring(0, 50)}...`)
          }
        }

        saveMetadata(dateDir, i, metadata)

        generatedImages.push({
          id: i,
          src: `/uploads/daily/${dateDir}/${i}.jpg`,
          loaded: true
        })

        generationCache = [...generatedImages]
      } else {
        // 记录失败
        failedRecords[i] = {
          prompt: result.prompt,
          error: result.error || 'Unknown error',
          retries: currentRetries + 1,
          lastAttempt: getFormattedDateTime()
        }
        saveFailedRecords(dateDir, failedRecords)
        console.log(`  Marked as failed: ${result.error}`)
      }

      // 避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log(`\nDone! Generated ${generatedImages.length}/9 images`)

    // 报告失败的图片
    const failedCount = Object.keys(failedRecords).length
    if (failedCount > 0) {
      console.log(`\nFailed images: ${failedCount}`)
      Object.entries(failedRecords).forEach(([id, record]) => {
        console.log(`  Image ${id}: ${record.error} (attempts: ${record.retries})`)
      })
      console.log(`\nTip: Run with --retry to retry failed images`)
    }

    generationCache = [...generatedImages]
    return generatedImages

  } finally {
    isGenerating = false
  }
}

/**
 * 读取图片元数据
 */
function getImageMetadata(dateDir, imageId) {
  try {
    const metaPath = path.join(__dirname, '..', 'metadata', dateDir, `${imageId}.json`)
    if (fs.existsSync(metaPath)) {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    }
  } catch (e) {
    console.error('Failed to read metadata:', e.message)
  }
  return null
}

/**
 * 获取指定日期的世界图片列表（从文件系统读取）
 */
function getDailyImages(dateDir, uploadDir) {
  const imagesDir = path.join(uploadDir, 'daily', dateDir)
  const images = []

  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.jpg'))
    files.forEach(file => {
      const id = parseInt(file.replace('.jpg', ''))
      if (id >= 1 && id <= 9) {
        // 验证图片有效性
        const imagePath = path.join(imagesDir, file)
        if (validateImage(imagePath)) {
          // 读取元数据获取故事
          const metadata = getImageMetadata(dateDir, id)
          images.push({
            id,
            src: `/uploads/daily/${dateDir}/${file}`,
            loaded: true,
            story: metadata?.story || null
          })
        }
      }
    })
    images.sort((a, b) => a.id - b.id)
  }

  return images
}

/**
 * 获取生成状态
 */
function getGenerationStatus() {
  return {
    isGenerating,
    cachedImages: generationCache
  }
}

/**
 * 获取失败图片列表
 */
function getFailedImages(dateDir) {
  const failedRecords = loadFailedRecords(dateDir)
  return Object.entries(failedRecords).map(([id, record]) => ({
    imageId: parseInt(id),
    ...record
  }))
}

export {
  generateDailyImages,
  getDailyImages,
  getGenerationStatus,
  getFailedImages,
  validateImage
}
