import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DOUBAN_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const STORY_MODEL = 'doubao-seed-2-0-pro-260215'

/**
 * 生成故事
 * @param {string} imagePath - 图片路径
 * @param {string} apiKey - ARK API Key
 * @returns {Promise<string>} 故事内容
 */
export async function generateStory(imagePath, apiKey) {
  console.log('Generating story for:', imagePath)

  try {
    const imageBuffer = fs.readFileSync(imagePath)
    const base64 = imageBuffer.toString('base64')
    const imageData = 'data:image/jpeg;base64,' + base64

    console.log('Image base64 length:', base64.length)

    const response = await axios.post(
      DOUBAN_API_URL,
      {
        model: STORY_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '请根据这张图片写一个故事，200字左右，中文' },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    )

    const story = response.data.choices[0].message.content
    console.log('Story generated, length:', story.length)

    return story

  } catch (error) {
    console.error('Story generation error:', error.message)
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data))
    }
    return null
  }
}