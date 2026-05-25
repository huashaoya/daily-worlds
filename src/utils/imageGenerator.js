// 后端 API 地址
const API_SERVER = 'http://localhost:3000'

/**
 * 生成探索细节图
 * 通过后端 API 调用 Doubao ARK，绕过 CORS 限制
 */
export async function generateDetailImage(originalImageUrl, region, loupeImageBase64, model = 'doubao', worldId = '1', story = null) {
  console.log('generateDetailImage called')
  console.log('World ID:', worldId)
  console.log('Loupe image base64 length:', loupeImageBase64?.length || 0)
  console.log('Story present:', !!story)

  try {
    // 调用后端 API
    console.log('Calling backend API...')

    const response = await fetch(`${API_SERVER}/api/generate-exploration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalImageUrl,
        loupeImageBase64,
        worldId,
        story
      })
    })

    console.log('Backend response status:', response.status)

    const data = await response.json()
    console.log('Backend response:', JSON.stringify(data, null, 2))

    if (data.success && data.imageUrl) {
      // 返回后端保存的图片 URL（需要拼接完整地址）
      const imageUrl = `${API_SERVER}${data.imageUrl}`
      console.log('Generated image URL:', imageUrl)
      return imageUrl
    }

    throw new Error(data.error || 'Failed to generate image')

  } catch (error) {
    console.error('generateDetailImage failed:', error)
    throw error
  }
}

/**
 * 生成平行探索图
 * @param {string} originalImageUrl - 原始图片 URL
 * @param {string} originalImageBase64 - 原始图片 base64
 * @param {string} parallelType - 探索类型：'perspective' 或 'story'
 * @param {string} worldId - 世界 ID
 * @param {string} story - 世界故事
 * @returns {Promise<string>} 生成的图片 URL
 */
export async function generateParallelImage(originalImageUrl, originalImageBase64, parallelType, worldId = '1', story = null) {
  console.log('generateParallelImage called')
  console.log('World ID:', worldId)
  console.log('Parallel type:', parallelType)
  console.log('Original image base64 length:', originalImageBase64?.length || 0)
  console.log('Story present:', !!story)

  try {
    console.log('Calling backend parallel API...')

    const response = await fetch(`${API_SERVER}/api/generate-parallel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        originalImageUrl,
        originalImageBase64,
        parallelType,
        worldId,
        story
      })
    })

    console.log('Backend response status:', response.status)

    const data = await response.json()

    if (data.success && data.imageUrl) {
      const imageUrl = `${API_SERVER}${data.imageUrl}`
      console.log('Generated parallel image URL:', imageUrl)
      return imageUrl
    }

    throw new Error(data.error || 'Failed to generate parallel image')

  } catch (error) {
    console.error('generateParallelImage failed:', error)
    throw error
  }
}

// 保留这些函数以备后用，但主要功能通过后端处理
export async function downloadImage(url) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Download error:', error)
    return url
  }
}

export function extractRegion(canvas, imageUrl, region) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const ctx = canvas.getContext('2d')
      const scaleX = img.width
      const scaleY = img.height

      canvas.width = region.width * 2
      canvas.height = region.height * 2

      ctx.drawImage(
        img,
        region.x * scaleX,
        region.y * scaleY,
        region.width * scaleX,
        region.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      )

      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

export function extractLoupeRegion(imageElement, loupeX, loupeY, imgRect) {
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  const ctx = canvas.getContext('2d')

  const regionX = loupeX - 100
  const regionY = loupeY - 100
  const regionSize = 200

  const scaleX = imageElement.naturalWidth / imgRect.width
  const scaleY = imageElement.naturalHeight / imgRect.height

  ctx.drawImage(
    imageElement,
    regionX * scaleX,
    regionY * scaleY,
    regionSize * scaleX,
    regionSize * scaleY,
    0,
    0,
    400,
    400
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}