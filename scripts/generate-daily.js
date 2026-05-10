/**
 * Daily Worlds Image Generator CLI
 * 每日生成 9 张随机世界图片
 *
 * Usage:
 *   node scripts/generate-daily.js              # 生成今日图片
 *   node scripts/generate-daily.js 2024-01-15   # 生成指定日期
 *   node scripts/generate-daily.js --retry      # 重试失败的图片
 *   node scripts/generate-daily.js --retry 2024-01-15  # 重试指定日期失败的
 */

import { generateRandomPrompt, getTodayDir } from '../server/config/prompts.js'
import { generateDailyImages, getFailedImages } from '../server/services/minimax.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 解析命令行参数
const args = process.argv.slice(2)
const options = {
  date: null,
  retry: false
}

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--retry' || args[i] === '-r') {
    options.retry = true
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(args[i])) {
    options.date = args[i]
  }
}

// 上传目录（统一使用 server/uploads/）
const UPLOAD_DIR = path.join(__dirname, '..', 'server', 'uploads')
const dateDir = options.date || getTodayDir()

async function main() {
  console.log('='.repeat(50))
  console.log('Daily Worlds Image Generator')
  console.log('='.repeat(50))
  console.log(`Date: ${dateDir}`)
  console.log(`Output: ${path.join(UPLOAD_DIR, 'daily', dateDir)}`)
  console.log(`Mode: ${options.retry ? 'Retry failed' : 'Generate new'}`)
  console.log()

  // 检查失败的图片
  if (options.retry) {
    const failed = getFailedImages(dateDir)
    if (failed.length === 0) {
      console.log('No failed images to retry')
      return
    }
    console.log(`Found ${failed.length} failed images to retry:`)
    failed.forEach(img => {
      console.log(`  - Image ${img.imageId}: ${img.error} (attempts: ${img.retries})`)
    })
    console.log()
  }

  // 生成/重试图片
  const images = await generateDailyImages(dateDir, UPLOAD_DIR, null, {
    retryFailed: options.retry,
    maxRetries: 3
  })

  console.log()
  console.log('='.repeat(50))
  console.log(`Result: ${images.length}/9 images ready`)
  console.log('='.repeat(50))

  // 列出当前状态
  console.log('\nCurrent images:')
  for (let i = 1; i <= 9; i++) {
    const img = images.find(img => img.id === i)
    if (img) {
      console.log(`  [${i}] OK`)
    } else {
      console.log(`  [${i}] MISSING`)
    }
  }
}

main().catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
})
