import { ref } from 'vue'

export function useLoupePreview({ isBlocked } = {}) {
  const containerRef = ref(null)
  const loupePos = ref({ x: 0, y: 0 })
  const showLoupe = ref(false)
  const loupeSize = ref(200)
  const previewImageUrl = ref(null)
  const previewRegion = ref(null)
  const isPreviewMode = ref(false)

  const minLoupeSize = 80
  const maxLoupeSize = 400

  const isInteractionBlocked = () => Boolean(isBlocked?.())

  const hideLoupe = () => {
    showLoupe.value = false
  }

  const handleMouseMove = (event) => {
    if (!containerRef.value || isPreviewMode.value || isInteractionBlocked()) return

    const container = containerRef.value
    const rect = container.getBoundingClientRect()
    const relX = event.clientX - rect.left
    const relY = event.clientY - rect.top
    const img = container.querySelector('img')
    if (!img) return

    const imgRect = img.getBoundingClientRect()
    const imgLeft = imgRect.left - rect.left
    const imgTop = imgRect.top - rect.top
    const imgRight = imgLeft + imgRect.width
    const imgBottom = imgTop + imgRect.height
    const halfSize = loupeSize.value / 2
    const inImage = relX >= imgLeft && relX <= imgRight && relY >= imgTop && relY <= imgBottom

    if (!inImage) {
      hideLoupe()
      return
    }

    loupePos.value = {
      x: Math.max(imgLeft + halfSize, Math.min(relX, imgRight - halfSize)),
      y: Math.max(imgTop + halfSize, Math.min(relY, imgBottom - halfSize))
    }
    showLoupe.value = true
  }

  const handleMouseEnter = () => {
    if (!isPreviewMode.value && !isInteractionBlocked()) {
      showLoupe.value = true
    }
  }

  const handleMouseLeave = (event) => {
    const relatedTarget = event?.relatedTarget
    if (relatedTarget instanceof Element && relatedTarget.closest('.exploration-panel')) {
      return
    }
    hideLoupe()
  }

  const handleWheel = (event) => {
    if (isPreviewMode.value || isInteractionBlocked()) return
    event.preventDefault()

    const delta = event.deltaY > 0 ? -20 : 20
    loupeSize.value = Math.max(minLoupeSize, Math.min(maxLoupeSize, loupeSize.value + delta))
  }

  const enterPreviewMode = (event) => {
    if (isPreviewMode.value || isInteractionBlocked()) return
    event?.stopPropagation()

    const container = containerRef.value
    const img = container?.querySelector('img')
    if (!container || !img) return

    isPreviewMode.value = true
    hideLoupe()

    const imgRect = img.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const imgLeft = imgRect.left - containerRect.left
    const imgTop = imgRect.top - containerRect.top
    const extractSize = loupeSize.value

    previewRegion.value = {
      x: (loupePos.value.x - imgLeft) / imgRect.width,
      y: (loupePos.value.y - imgTop) / imgRect.height,
      width: extractSize / imgRect.width,
      height: extractSize / imgRect.height
    }

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
    } catch (error) {
      console.error('Canvas extract failed:', error)
      previewImageUrl.value = img.src
    }
  }

  const cancelPreview = () => {
    isPreviewMode.value = false
    previewImageUrl.value = null
    previewRegion.value = null
    showLoupe.value = !isInteractionBlocked()
  }

  const finishPreview = () => {
    isPreviewMode.value = false
    previewImageUrl.value = null
    previewRegion.value = null
    hideLoupe()
  }

  return {
    containerRef,
    loupePos,
    loupeSize,
    showLoupe,
    previewImageUrl,
    previewRegion,
    isPreviewMode,
    hideLoupe,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
    handleWheel,
    enterPreviewMode,
    cancelPreview,
    finishPreview
  }
}
