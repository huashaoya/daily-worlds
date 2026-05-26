# 平行探索模式设计方案

## 背景
当前"局部探索"是在原图中选择一个区域，AI 生成该区域的放大细节图。

用户希望新增一种探索模式：**平行探索** —— 不放大局部，而是生成一个全新的视角或故事延伸。

## 探索模式对比

| 模式 | 触发方式 | AI 输入 | 输出 |
|------|----------|---------|------|
| **局部探索** (现有) | 点击取景框 | 原图 + 取景截取图 + 故事 | 局部细节放大图 |
| **平行探索** (新) | 新增按钮/快捷键 | 原图 + 故事 + 视角指令 | 新视角图/故事续写 |

## 平行探索的两种形态

### 1. 视角变换
- **远景**：拉远镜头，宏观展示环境全貌
- **近景特写**：聚焦某个元素，深挖细节
- **侧面/背面**：同一场景的不同观察角度
- **时间维度**：展示"之后"或"之前"的场景

### 2. 故事延伸
- **续写故事**：AI 基于原故事生成新的情节
- **分支叙事**：从故事分歧点发展不同走向
- **人物视角**：切换到故事中其他角色的视角

## UI 改动

### WorldModal.vue
1. 新增"平行探索"按钮（与"局部探索"并列）
2. 探索面板中区分两种探索类型
3. 快捷键支持：`P` 键触发平行探索

### 探索面板 UI 区分
```
[局部探索] 图标 vs [平行探索] 图标
├── 局部 1 (缩放 0.3, 0.4)
├── 局部 2
└── 平行 1 (视角: 远景)
    └── 平行 2 (视角: 特写)
```

## API 改动

### 新增接口 `POST /api/parallel-exploration`

**请求体：**
```json
{
  "originalImageUrl": "...",
  "explorationType": "perspective" | "story",     // 探索类型
  "perspectiveHint": "远景" | "近景" | "侧面" | ...,
  "storyContinuation": "续写" | "分支" | "人物视角",
  "worldId": "1",
  "story": "当前世界的故事..."
}
```

**后端 doubao.js**
- 新增 `generateParallelExploration()` 方法
- 构建不同的 prompt 模板

### Prompt 模板示例

**视角变换：**
```
根据这张图片的世界观和故事，从【{perspectiveHint}】角度生成一张新的图片。
保持相同的艺术风格和氛围，但呈现完全不同的视角或时间点。
故事背景：{story}
```

**故事延伸：**
```
基于这个故事，创作一个【{storyContinuation}】的情节。
保持相同的世界观和艺术风格，生成与之连贯的新场景。
原故事：{story}
```

## 数据模型

### useExploration.js
```javascript
{
  id: "xxx",
  region: { x, y, width, height },  // 局部探索的取景数据
  explorationType: "local" | "parallel",  // 新增字段
  parallelType: "perspective" | "story",   // 平行探索类型
  hint: "远景",
  detailUrl: "...",
  parentId: null,
  timestamp: 123456
}
```

## 实现步骤

1. [ ] 后端：新增 `POST /api/parallel-exploration` 接口
2. [ ] 后端：在 doubao.js 新增 `generateParallelExploration()` 方法
3. [ ] 前端：在 imageGenerator.js 新增 `generateParallelImage()` 方法
4. [ ] 前端：WorldModal 新增"平行探索"按钮
5. [ ] 前端：useExploration.js 支持 parallel 类型
6. [ ] 前端：探索面板 UI 区分两种类型
7. [ ] 前端：TreeGraph 组件支持类型图标

## 待确认

- 平行探索是否需要保留原图作为参考叠加显示？
- 故事延伸模式：是否需要用户选择"续写"/"分支"/"人物"？
- 是否需要保留探索树状结构？（平行探索可分支）