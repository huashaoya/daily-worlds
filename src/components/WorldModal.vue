<script setup>
import { ref, computed, onMounted } from 'vue'
import { useExploration } from '../composables/useExploration'
import { generateDetailImage } from '../utils/imageGenerator'
import TreeGraph from './TreeGraph.vue'

const props = defineProps({
  image: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

// 探索状态 (传入 image.date 确保探索记录按正确日期存储)
const {
  explorations,
  currentView,
  currentDetailUrl,
  currentParentId,
  isLoaded,
  addExploration,
  switchToExploration,
  resetToOriginal,
  clearExplorations,
  explorationCount,
  explorationTree
} = useExploration(props.image.id, props.image.date)

// 打开弹窗时默认显示原始图片
onMounted(() => {
  resetToOriginal()
})

// 取景框状态
const loupePos = ref({ x: 0, y: 0 })
const showLoupe = ref(false)
const loupeSize = ref(200) // 取景框大小，可调节
const minLoupeSize = 80
const maxLoupeSize = 400
const containerRef = ref(null)

// 预览模式状态
const isPreviewMode = ref(false)
const previewImageUrl = ref(null)

// 生成状态
const isGenerating = ref(false)
const generationProgress = ref(0)
const generationStatus = ref('')

// 悬停预览状态
const hoveredExploration = ref(null)

// 鼠标是否在模态框内
const isMouseInside = ref(true)

const hideCursor = () => {
  isMouseInside.value = true
}

const showCursorIcon = () => {
  isMouseInside.value = false
}

// 探索记录面板展开状态（默认收起）
const isExplorationPanelOpen = ref(false)

const currentImageUrl = computed(() => {
  if (currentView.value === 'detail' && currentDetailUrl.value) {
    return currentDetailUrl.value
  }
  return props.image.src
})

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

const handleMouseMove = (e) => {
  if (!containerRef.value || isPreviewMode.value || isGenerating.value) return

  const container = containerRef.value
  const rect = container.getBoundingClientRect()

  const relX = e.clientX - rect.left
  const relY = e.clientY - rect.top

  const img = container.querySelector('img')
  if (!img) return

  const imgRect = img.getBoundingClientRect()

  // 图片在容器中的偏移
  const imgLeft = imgRect.left - rect.left
  const imgTop = imgRect.top - rect.top
  const imgRight = imgLeft + imgRect.width
  const imgBottom = imgTop + imgRect.height

  const halfSize = loupeSize.value / 2

  // 计算鼠标在图片上的相对位置
  const mouseInImgX = relX - imgLeft
  const mouseInImgY = relY - imgTop

  // 检查鼠标是否在图片范围内（考虑取景框大小）
  const inImage = relX >= imgLeft && relX <= imgRight && relY >= imgTop && relY <= imgBottom

  if (inImage) {
    // 限制取景框在图片边界内
    const clampedX = Math.max(imgLeft + halfSize, Math.min(relX, imgRight - halfSize))
    const clampedY = Math.max(imgTop + halfSize, Math.min(relY, imgBottom - halfSize))

    showLoupe.value = true
    loupePos.value = { x: clampedX, y: clampedY }
  } else {
    showLoupe.value = false
  }
}

const handleMouseEnter = () => {
  if (!isPreviewMode.value && !isGenerating.value) {
    showLoupe.value = true
  }
}

const handleWheel = (e) => {
  if (isPreviewMode.value || isGenerating.value) return
  e.preventDefault()

  // 滚轮调节取景框大小
  const delta = e.deltaY > 0 ? -20 : 20
  const newSize = Math.max(minLoupeSize, Math.min(maxLoupeSize, loupeSize.value + delta))
  loupeSize.value = newSize
}

const handleMouseLeave = () => {
  // 检查是否进入探索记录面板
  const relatedTarget = event.relatedTarget
  if (relatedTarget && relatedTarget.closest('.exploration-panel')) {
    return
  }
  showLoupe.value = false
}

const handleLoupeClick = async (e) => {
  if (isPreviewMode.value || isGenerating.value) return
  e.stopPropagation()

  // 进入预览模式
  isPreviewMode.value = true
  showLoupe.value = false

  const container = containerRef.value
  const img = container.querySelector('img')
  const imgRect = img.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  const imgLeft = imgRect.left - containerRect.left
  const imgTop = imgRect.top - containerRect.top

  const extractSize = loupeSize.value

  previewData = {
    x: (loupePos.value.x - imgLeft) / imgRect.width,
    y: (loupePos.value.y - imgTop) / imgRect.height,
    width: extractSize / imgRect.width,
    height: extractSize / imgRect.height
  }

  // 使用 Canvas 从 img 元素截取取景框区域
  try {
    const scaleX = img.naturalWidth / imgRect.width
    const scaleY = img.naturalHeight / imgRect.height

    const cssX = loupePos.value.x - imgLeft
    const cssY = loupePos.value.y - imgTop

    const srcX = cssX * scaleX
    const srcY = cssY * scaleY
    const srcSize = extractSize * scaleX

    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')

    ctx.drawImage(
      img,
      srcX - srcSize / 2,
      srcY - srcSize / 2,
      srcSize,
      srcSize,
      0,
      0,
      400,
      400
    )

    previewImageUrl.value = canvas.toDataURL('image/jpeg', 0.9)
    console.log('Preview extracted successfully, URL length:', previewImageUrl.value.length)
  } catch (error) {
    console.error('Canvas extract failed:', error)
    // 如果失败，使用 img.src
    previewImageUrl.value = img.src
  }
}

let previewData = null

const cancelPreview = () => {
  isPreviewMode.value = false
  previewImageUrl.value = null
  previewData = null
  showLoupe.value = true
}

const startGeneration = async () => {
  if (!previewData) return

  isGenerating.value = true
  generationProgress.value = 0
  generationStatus.value = '正在连接 AI...'

  try {
    // 调用 API 生成探索图，传入原图和取景框预览图
    generationStatus.value = '正在探索中...'
    generationProgress.value = 30

    // 获取当前正在查看的探索 ID 作为父级
    const currentParentId = currentView.value === 'detail' && currentDetailUrl.value
      ? explorations.value.find(e => e.detailUrl === currentDetailUrl.value)?.id || null
      : null

    const detailUrl = await generateDetailImage(
      currentView.value === 'original' ? props.image.src : currentDetailUrl.value, // 基于当前查看的图片
      previewData,            // 区域信息
      previewImageUrl.value,  // 取景框截取的预览图 (base64)
      'doubao',              // 使用 Doubao Seedream 模型
      props.image.id,         // 世界 ID，用于保存路径
      props.image.story       // 世界故事
    )

    generationProgress.value = 90
    generationStatus.value = '处理中...'

    // 直接使用 API 返回的 URL（img 标签可以直接加载）
    const finalUrl = detailUrl

    // 添加探索记录（传入父级 ID）
    addExploration(previewData, finalUrl, currentParentId)

    generationProgress.value = 100
    generationStatus.value = '完成!'

    // 退出预览模式
    setTimeout(() => {
      isPreviewMode.value = false
      previewImageUrl.value = null
      previewData = null
      isGenerating.value = false
      generationStatus.value = ''
    }, 500)

  } catch (error) {
    console.error('Failed to generate detail:', error)
    generationStatus.value = '生成失败: ' + error.message
    isGenerating.value = false
  }
}

const handleTreeSelect = (node) => {
  if (node.type === 'original') {
    handleResetOriginal()
  } else {
    handleSwitchExploration({ detailUrl: node.detailUrl, parentId: node.parentId })
  }
}

const handleSwitchExploration = (exp) => {
  switchToExploration(exp)
}

const handleResetOriginal = () => {
  resetToOriginal()
}

const handleClearExplorations = () => {
  clearExplorations()
}
</script>

<template>
  <div class="modal-backdrop" @click="handleBackdropClick">
    <div class="modal-content" :class="{ 'with-panel': explorationCount > 0, 'panel-open': isExplorationPanelOpen }">

      <!-- 展开/收起按钮 -->
      <button
        v-if="explorationCount > 0"
        class="toggle-panel-btn"
        :class="{ collapsed: !isExplorationPanelOpen }"
        @click="isExplorationPanelOpen = !isExplorationPanelOpen"
        :title="isExplorationPanelOpen ? '收起探索记录' : '展开探索记录'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <!-- 探索记录面板 -->
      <Transition name="slide">
        <div v-if="explorationCount > 0 && isExplorationPanelOpen" class="exploration-panel">
          <div class="panel-header">
            <span class="panel-title">探索记录</span>
            <span class="panel-count">{{ explorationCount }}</span>
          </div>
          <TreeGraph
            :tree="explorationTree"
            :currentDetailUrl="currentDetailUrl"
            :currentView="currentView"
            @select="handleTreeSelect"
          />
          <button class="clear-btn" @click="handleClearExplorations">
            <span>&#215;</span> 清空全部
          </button>
        </div>
      </Transition>

      <!-- 主画布区域 -->
      <div class="main-area">
        <!-- 关闭按钮 -->
        <button class="close-btn" @click="$emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <!-- 图片容器 -->
        <div
          ref="containerRef"
          class="image-container"
          @mousemove="handleMouseMove"
          @mouseenter="handleMouseEnter"
          @mouseleave="handleMouseLeave"
          @wheel="handleWheel"
        >
          <img :src="currentImageUrl" :alt="`World ${image.id}`" crossorigin="anonymous" />

          <!-- 取景框 -->
          <div
            v-if="showLoupe && !isPreviewMode && !isGenerating"
            class="loupe-wrapper"
            :style="{
              left: loupePos.x + 'px',
              top: loupePos.y + 'px',
              width: loupeSize + 'px',
              height: loupeSize + 'px'
            }"
            @click="handleLoupeClick"
          >
            <div
              class="loupe"
              :style="{
                width: loupeSize + 'px',
                height: loupeSize + 'px'
              }"
            ></div>
          </div>
        </div>

        <!-- 世界信息 -->
        <div class="world-info">
          <span class="world-label">World {{ image.id }}</span>
          <span v-if="explorationCount > 0" class="exploration-count">
            {{ explorationCount }} 个探索
          </span>
        </div>
      </div>

      <!-- 故事面板 -->
      <div v-if="image.story" class="story-panel">
        <div class="story-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="story-icon">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Story</span>
        </div>
        <div class="story-content">
          <p>{{ image.story }}</p>
        </div>
      </div>

      <!-- 悬停预览 -->
      <Transition name="fade">
        <div v-if="hoveredExploration && !isPreviewMode && !isGenerating" class="hover-preview">
          <img :src="hoveredExploration.detailUrl" alt="Preview" />
        </div>
      </Transition>

      <!-- 预览/生成模式浮层 -->
      <div v-if="isPreviewMode || isGenerating" class="preview-overlay">
        <div class="preview-content">
          <!-- 生成中的加载动画 -->
          <div v-if="isGenerating" class="generating">
            <div class="spinner"></div>
            <p class="status-text">{{ generationStatus }}</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: generationProgress + '%' }"></div>
            </div>
          </div>

          <!-- 预览模式 -->
          <template v-else>
            <img v-if="previewImageUrl" :src="previewImageUrl" alt="Preview" class="preview-img" />
            <div class="preview-actions">
              <button class="action-btn cancel" @click="cancelPreview">
                取消
              </button>
              <button class="action-btn generate" @click="startGeneration" :disabled="isGenerating">
                {{ isGenerating ? '探索中...' : '开始探索' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
  cursor: none;
}

.modal-backdrop:hover { cursor: default; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 20px;
  max-width: 95vw;
  max-height: 95vh;
}

.modal-content.with-panel {
  padding-left: 400px;
}

.modal-content.with-panel:not(.panel-open) {
  padding-left: 40px;
}

/* 展开/收起按钮 */
.toggle-panel-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) translateX(-50%);
  width: 24px;
  height: 60px;
  background: rgba(74, 144, 164, 0.2);
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
}

.toggle-panel-btn:hover {
  background: rgba(74, 144, 164, 0.4);
}

.toggle-panel-btn svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.8);
  transition: transform 0.3s ease;
}

.toggle-panel-btn.collapsed svg {
  transform: rotate(180deg);
}

/* 探索记录面板 */
.exploration-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  background: rgba(20, 25, 35, 0.95);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.panel-count {
  background: rgba(74, 144, 164, 0.3);
  color: #4a90a4;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.exploration-panel .clear-btn {
  margin: 12px;
  padding: 10px;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 8px;
  color: rgba(255, 150, 150, 0.8);
  font-size: 0.8rem;
  cursor: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.exploration-panel .clear-btn:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.5);
  color: rgba(255, 150, 150, 1);
}

/* 主画布区域 */
.main-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.close-btn {
  position: absolute;
  top: -50px;
  right: 0;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  cursor: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 5;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

/* 悬停预览 */
.hover-preview {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
}

.hover-preview img {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(74, 144, 164, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.image-container {
  max-width: 90vw;
  max-height: calc(90vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: none;
  overflow: hidden;
}

.image-container img {
  max-width: 90vw;
  max-height: calc(90vh - 120px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 0 60px rgba(74, 144, 164, 0.3);
  user-select: none;
  -webkit-user-drag: none;
  display: block;
}

.loupe-wrapper {
  position: absolute;
  pointer-events: auto;
  z-index: 5;
  cursor: none;
}

.loupe-wrapper:hover .loupe {
  border-color: rgba(74, 144, 164, 1);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(74, 144, 164, 0.5);
}

.loupe {
  position: relative;
  width: 200px;
  height: 200px;
  border: 2px solid rgba(74, 144, 164, 0.8);
  border-radius: 4px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(74, 144, 164, 0.3);
  background: transparent;
  transform: translate(-50%, -50%);
  transition: all 0.2s;
}

.loupe::before,
.loupe::after {
  content: '';
  position: absolute;
  background: rgba(74, 144, 164, 0.5);
}

.loupe::before {
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  transform: translateY(-50%);
}

.loupe::after {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-50%);
}

.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  animation: fadeIn 0.2s ease;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.preview-img {
  width: 400px;
  height: 400px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 0 40px rgba(74, 144, 164, 0.4);
}

.preview-actions {
  display: flex;
  gap: 16px;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 24px;
  font-size: 1rem;
  cursor: none;
  transition: all 0.2s;
}

.action-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.action-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.action-btn.generate {
  background: rgba(74, 144, 164, 0.8);
  color: #fff;
}

.action-btn.generate:hover {
  background: rgba(74, 144, 164, 1);
}

/* 探索中的样式 */
.generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(74, 144, 164, 0.2);
  border-top-color: rgba(74, 144, 164, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgba(74, 144, 164, 0.8);
  transition: width 0.3s ease;
}

.world-info {
  margin-top: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
}

.world-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.exploration-count {
  font-size: 0.75rem;
  color: rgba(74, 144, 164, 0.8);
  padding: 4px 12px;
  background: rgba(74, 144, 164, 0.1);
  border-radius: 12px;
}

/* 面板滑动动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

/* 故事面板 */
.story-panel {
  width: 280px;
  flex-shrink: 0;
  background: rgba(20, 25, 35, 0.95);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-left: 20px;
}

.story-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 600;
}

.story-icon {
  width: 18px;
  height: 18px;
  color: #4a90a4;
}

.story-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.story-content p {
  font-size: 0.85rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  text-align: justify;
  white-space: pre-wrap;
}
</style>