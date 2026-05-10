import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载 .env 文件
try {
  const envPath = path.join(__dirname, '..', '.env')
  const envContent = readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  })
} catch (e) {
  // .env 文件不存在，跳过
}

// 验证必需的环境变量
const requiredEnvVars = ['MINIMAX_API_KEY', 'ARK_API_KEY']
const missingVars = requiredEnvVars.filter(key => !process.env[key])

if (missingVars.length > 0) {
  console.error('==================================================')
  console.error('Missing required environment variables:')
  missingVars.forEach(key => {
    console.error('  - ' + key)
  })
  console.error('==================================================')
  console.error('\nPlease set these variables in .env file or environment.')
  console.error('See .env.example for reference.\n')
  process.exit(1)
}

async function startServer() {
  const apiRouter = await import('./routes/api.js')

  const app = express()
  const PORT = process.env.PORT || 3000

  // CORS 配置
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179'],
    credentials: true
  }))

  // 解析 JSON 和 base64 图片
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  // 静态文件服务
  const uploadsDir = path.join(__dirname, 'uploads')
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
    res.header('Cross-Origin-Resource-Policy', 'cross-origin')
    express.static(uploadsDir)(req, res, next)
  })

  // API 路由
  app.use('/api', apiRouter.default)

  // 健康检查
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Daily Worlds API Server',
      endpoints: {
        health: '/api/health',
        dailyImages: '/api/daily-images',
        generateExploration: 'POST /api/generate-exploration',
        generateDaily: 'POST /api/generate-daily'
      }
    })
  })

  app.listen(PORT, () => {
    console.log(`\n🚀 Daily Worlds API Server running on http://localhost:${PORT}\n`)
  })
}

startServer().catch(error => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
