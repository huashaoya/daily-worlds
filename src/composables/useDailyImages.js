import { ref, onMounted } from 'vue'
import { toApiUrl } from '../utils/apiConfig'

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useDailyImages(date) {
  const images = ref([])
  const loading = ref(true)
  const error = ref(null)
  const generating = ref(false)
  const progress = ref(0)
  const progressMessage = ref('')
  const currentDate = ref(date || getTodayDate())

  function mapDailyImage(img, imageDate = currentDate.value) {
    const src = /^https?:\/\//.test(img.src || '')
      ? img.src
      : (img.src?.startsWith('/uploads') ? img.src : `/uploads${img.src || ''}`)
    return {
      id: img.id,
      src: toApiUrl(src),
      loaded: img.loaded,
      date: imageDate,
      story: img.story || null
    }
  }

  async function loadImages(selectedDate) {
    if (selectedDate) {
      currentDate.value = selectedDate
    }

    loading.value = true
    error.value = null
    generating.value = false
    progress.value = 0
    progressMessage.value = ''
    images.value = []

    try {
      let isClosedIntentionally = false
      const eventSource = new EventSource(toApiUrl(`/api/daily-images?date=${currentDate.value}&sse=true`))

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'existing':
              images.value.push(mapDailyImage(data.image))
              break

            case 'progress':
              generating.value = true
              const total = data.total || 9
              const current = data.current || 0
              progress.value = Math.round((current / total) * 100)
              progressMessage.value = data.message || `正在生成第 ${data.imageId} 张图片...`
              break

            case 'complete':
              generating.value = false
              loading.value = false
              progress.value = 100
              progressMessage.value = '完成!'

              images.value = data.images.map(img => mapDailyImage(img))

              isClosedIntentionally = true
              eventSource.close()
              break

            case 'error':
              error.value = data.error
              loading.value = false
              generating.value = false
              isClosedIntentionally = true
              eventSource.close()
              break
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e)
        }
      }

      eventSource.onerror = () => {
        if (isClosedIntentionally) return
        eventSource.close()
        fetchDailyImages()
      }

    } catch (e) {
      error.value = 'Failed to load images: ' + e.message
      loading.value = false
    }
  }

  async function fetchDailyImages() {
    try {
      const response = await fetch(toApiUrl(`/api/daily-images?date=${currentDate.value}`))
      const data = await response.json()

      if (data.success && data.images) {
        images.value = data.images.map(img => mapDailyImage(img))

        generating.value = data.generated || false
      } else {
        throw new Error(data.error || 'Failed to load images')
      }
    } catch (e) {
      error.value = 'Failed to load images: ' + e.message
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => loadImages(date))

  return {
    images,
    loading,
    error,
    generating,
    progress,
    progressMessage,
    currentDate,
    reload: (selectedDate) => loadImages(selectedDate)
  }
}
