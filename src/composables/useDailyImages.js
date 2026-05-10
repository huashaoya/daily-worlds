import { ref, onMounted } from 'vue'

const API_SERVER = 'http://localhost:3000'

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
      console.log('Fetching daily images from backend (with SSE)...')

      const eventSource = new EventSource(`${API_SERVER}/api/daily-images?date=${currentDate.value}&sse=true`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('SSE message:', data)

          switch (data.type) {
            case 'existing':
              images.value.push({
                id: data.image.id,
                src: `${API_SERVER}/uploads${data.image.src}`,
                loaded: data.image.loaded,
                date: currentDate.value,
                story: data.image.story || null
              })
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

              images.value = data.images.map(img => ({
                id: img.id,
                src: `${API_SERVER}/uploads${img.src}`,
                loaded: img.loaded,
                date: currentDate.value,
                story: img.story || null
              }))

              eventSource.close()
              break

            case 'error':
              error.value = data.error
              loading.value = false
              generating.value = false
              eventSource.close()
              break
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e)
        }
      }

      eventSource.onerror = () => {
        console.log('SSE connection error, falling back to fetch')
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
      const response = await fetch(`${API_SERVER}/api/daily-images?date=${currentDate.value}`)
      const data = await response.json()

      console.log('Backend response:', data)

      if (data.success && data.images) {
        images.value = data.images.map(img => ({
          id: img.id,
          src: `${API_SERVER}${img.src}`,
          loaded: img.loaded,
          date: currentDate.value,
          story: img.story || null
        }))

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
