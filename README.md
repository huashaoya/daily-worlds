# Daily Worlds - 每日随机世界窗户

一个展示 3x3 网格的网站，每个窗户每天随机显示一张 AI 生成的图片，代表不同的世界、故事和风格。支持点击图片探索细节，并自动生成故事描述。

## 功能特性

- **每日图片**：每天自动生成 9 张独特的 AI 世界图片
- **故事生成**：每张图片配套自动生成的故事描述
- **细节探索**：点击取景框，深入探索图片的任意细节
- **历史回顾**：可切换查看不同日期的世界图片
- **探索记录**：保存探索路径，形成树状结构

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（从 `.env.example` 复制）：
```bash
cp .env.example .env
```

编辑 `.env`，填入 API Key：
```
MINIMAX_API_KEY=your_api_key_here
ARK_API_KEY=your_ark_api_key_here
VITE_API_BASE_URL=http://localhost:3000
```

`VITE_API_BASE_URL` 用于配置前端连接的后端地址，本地开发默认是 `http://localhost:3000`。

### 3. 启动项目

启动前端和后端：
```bash
# 启动前端
npm run dev

# 启动后端（另一个终端）
cd server && node index.js
```

访问 http://localhost:5173

### 4. 生成图片

```bash
# 生成今日图片
npm run generate

# 生成指定日期图片
npm run generate 2024-01-15

# 重试失败的图片
npm run generate --retry
```

## 项目结构

```
daily-worlds/
├── server/                     # 后端服务
│   ├── config/
│   │   └── prompts.js         # 图片生成提示词配置
│   ├── routes/
│   │   └── api.js             # API 路由
│   ├── services/
│   │   ├── minimax.js         # MiniMax 图片生成
│   │   ├── doubao.js          # Doubao 探索图片生成
│   │   └── storyGenerator.js  # 故事生成
│   ├── uploads/               # 上传文件
│   │   ├── daily/            # 每日图片
│   │   └── exploration/       # 探索图片
│   ├── metadata/              # 图片元数据（含故事）
│   └── logs/                  # 失败记录
├── scripts/
│   └── generate-daily.js      # CLI 图片生成脚本
└── src/                       # 前端
    ├── components/
    │   ├── WindowGrid.vue     # 3x3 网格
    │   ├── WindowCard.vue     # 单个窗户
    │   ├── WorldModal.vue       # 世界详情弹窗
    │   ├── ExplorationPanel.vue # 探索记录面板
    │   ├── TreeGraph.vue        # 探索树状图
    │   └── DateSelector.vue     # 日期选择器
    └── composables/
        ├── useDailyImages.js     # 图片加载逻辑
        ├── useExploration.js     # 探索状态管理
        ├── useLoupePreview.js    # 取景框预览逻辑
        └── useWorldGeneration.js # 探索生成状态
```

## 技术栈

- **前端**：Vue 3 + Vite
- **后端**：Express.js
- **图片生成**：MiniMax Image API (image-01)
- **探索生成**：Doubao Seedream
- **故事生成**：Doubao Vision
- **样式**：纯 CSS

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/daily-images` | GET | 获取指定日期的世界图片 |
| `/api/dates` | GET | 获取有图片的日期列表 |
| `/api/generate-exploration` | POST | 生成探索细节图 |
| `/api/generate-daily` | POST | 手动触发图片生成 |
| `/api/health` | GET | 健康检查 |

## 图片说明

生成的 prompt 模板：
```
A {mood} {style} of {scene}, featuring {element}, with cinematic lighting and detailed textures, 4K, masterpiece
```

配置包含 100+ 种风格、场景、元素和氛围组合，可生成上亿种不同的世界。

## 配置说明

### 模型配置

- **每日图片**：MiniMax `image-01`
- **探索图片**：Doubao `doubao-seedream-4-5-251128`（可在 `server/services/doubao.js` 修改）
- **故事生成**：Doubao `doubao-seed-2-0-pro-260215`

### 提示词配置

编辑 `server/config/prompts.js` 可自定义：
- `STYLES` - 图片风格
- `SCENES` - 场景
- `ELEMENTS` - 元素
- `MOODS` - 氛围
