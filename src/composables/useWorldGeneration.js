import { ref } from 'vue'
import { generateDetailImage, generateParallelImage } from '../utils/imageGenerator'

async function imageUrlToBase64(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`图片读取失败 (${response.status})`)
  }

  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useWorldGeneration({
  image,
  currentView,
  currentDetailUrl,
  currentImageUrl,
  explorations,
  previewRegion,
  previewImageUrl,
  addExploration,
  finishPreview
}) {
  const isGenerating = ref(false)
  const generationProgress = ref(0)
  const generationStatus = ref('')
  const isParallelGenerating = ref(false)
  const selectedParallelType = ref(null)

  const getCurrentParentId = () => {
    if (currentView.value !== 'detail' || !currentDetailUrl.value) return null
    return explorations.value.find(exp => exp.detailUrl === currentDetailUrl.value)?.id || null
  }

  const resetGenerationState = () => {
    generationProgress.value = 0
    generationStatus.value = ''
  }

  const startGeneration = async () => {
    if (!previewRegion.value || isGenerating.value) return

    isGenerating.value = true
    generationProgress.value = 0
    generationStatus.value = '正在连接 AI...'

    try {
      generationStatus.value = '正在探索中...'
      generationProgress.value = 30

      const detailUrl = await generateDetailImage(
        currentView.value === 'original' ? image.src : currentDetailUrl.value,
        previewRegion.value,
        previewImageUrl.value,
        'doubao',
        image.id,
        image.story
      )

      generationProgress.value = 90
      generationStatus.value = '处理中...'

      addExploration({
        region: previewRegion.value,
        detailUrl,
        parentId: getCurrentParentId(),
        explorationType: 'local'
      })

      generationProgress.value = 100
      generationStatus.value = '完成!'

      window.setTimeout(() => {
        finishPreview()
        isGenerating.value = false
        resetGenerationState()
      }, 500)
    } catch (error) {
      console.error('Failed to generate detail:', error)
      generationStatus.value = `生成失败: ${error.message}`
      isGenerating.value = false
    }
  }

  const startParallelExploration = async (type) => {
    if (isGenerating.value || isParallelGenerating.value) return

    isParallelGenerating.value = true
    selectedParallelType.value = type
    generationProgress.value = 0
    generationStatus.value = '正在连接 AI...'

    try {
      const currentUrl = currentImageUrl.value
      const originalUrl = image.src
      if (!currentUrl) throw new Error('Image not found')

      generationStatus.value = type === 'story' ? '正在延伸故事...' : '正在变换视角...'
      generationProgress.value = 20

      const currentImageBase64 = await imageUrlToBase64(currentUrl)
      generationProgress.value = 40

      let originalImageBase64 = null
      if (originalUrl && originalUrl !== currentUrl) {
        try {
          originalImageBase64 = await imageUrlToBase64(originalUrl)
        } catch (error) {
          console.warn('Failed to fetch original image:', error)
        }
      }

      generationProgress.value = 60

      const detailUrl = await generateParallelImage(
        currentUrl,
        currentImageBase64,
        originalImageBase64,
        type,
        image.id,
        image.story
      )

      generationProgress.value = 90
      generationStatus.value = '处理中...'

      addExploration({
        region: null,
        detailUrl,
        parentId: getCurrentParentId(),
        explorationType: 'parallel',
        parallelType: type
      })

      generationProgress.value = 100
      generationStatus.value = '完成!'

      window.setTimeout(() => {
        isParallelGenerating.value = false
        selectedParallelType.value = null
        resetGenerationState()
      }, 500)
    } catch (error) {
      console.error('Failed to generate parallel exploration:', error)
      generationStatus.value = `生成失败: ${error.message}`
      isParallelGenerating.value = false
      selectedParallelType.value = null
    }
  }

  const cancelParallelExploration = () => {
    isParallelGenerating.value = false
    selectedParallelType.value = null
    resetGenerationState()
  }

  return {
    isGenerating,
    generationProgress,
    generationStatus,
    isParallelGenerating,
    selectedParallelType,
    startGeneration,
    startParallelExploration,
    cancelParallelExploration
  }
}
