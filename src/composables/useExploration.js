import { ref, computed, onMounted } from 'vue'

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useExploration(imageId, date) {
  // date 来自 image.date，确保探索记录按正确的日期存储
  const explorationDate = date || getTodayDate()
  const STORAGE_KEY = `exploration_${explorationDate}_${imageId}`

  const explorations = ref([])
  const currentView = ref('original')
  const currentDetailUrl = ref(null)
  const currentParentId = ref(null)
  const imageDate = ref(explorationDate)
  const isLoaded = ref(false)

  // 从 localStorage 加载缓存
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      console.log('Loading cache for:', STORAGE_KEY)
      console.log('Cached data:', cached ? cached.substring(0, 100) + '...' : null)

      if (cached) {
        const data = JSON.parse(cached)
        console.log('Parsed data:', data)

        if (data.explorations && Array.isArray(data.explorations)) {
          explorations.value = data.explorations.map(exp => {
            let url = exp.detailUrl
            if (url && url.startsWith('blob:')) {
              console.log('Blob URL detected (will be invalid after refresh):', url)
            }
            return {
              ...exp,
              valid: url && !url.startsWith('blob:')
            }
          })
          console.log('Loaded explorations:', explorations.value.length)
        }

        if (data.currentView) {
          currentView.value = data.currentView
          console.log('Restored currentView:', currentView.value)
        }

        if (data.currentDetailUrl) {
          if (data.currentDetailUrl.startsWith('blob:')) {
            console.log('Current detail URL is blob (invalid after refresh), resetting to original')
            currentView.value = 'original'
            currentDetailUrl.value = null
            currentParentId.value = null
          } else {
            currentDetailUrl.value = data.currentDetailUrl
            currentParentId.value = data.currentParentId || null
            console.log('Restored currentDetailUrl:', currentDetailUrl.value.substring(0, 50) + '...')
          }
        }

        if (data.date) {
          imageDate.value = data.date
        }
      }

      isLoaded.value = true
    } catch (e) {
      console.error('Failed to load exploration cache:', e)
      isLoaded.value = true
    }
  }

  // 保存到 localStorage
  const saveToCache = () => {
    try {
      const data = {
        date: imageDate.value,
        explorations: explorations.value.map(exp => ({
          id: exp.id,
          region: exp.region,
          detailUrl: exp.detailUrl,
          timestamp: exp.timestamp,
          parentId: exp.parentId || null
        })),
        currentView: currentView.value,
        currentDetailUrl: currentDetailUrl.value,
        currentParentId: currentParentId.value
      }

      console.log('Saving cache:', data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      console.log('Cache saved successfully')
    } catch (e) {
      console.error('Failed to save exploration cache:', e)
    }
  }

  loadFromCache()

  // 添加探索记录
  const addExploration = (region, detailUrl, parentId = null) => {
    const exploration = {
      id: Date.now().toString(),
      region,
      detailUrl,
      timestamp: Date.now(),
      parentId: parentId
    }
    console.log('Adding exploration:', exploration)
    explorations.value.push(exploration)

    currentDetailUrl.value = detailUrl
    currentView.value = 'detail'
    currentParentId.value = parentId

    saveToCache()
  }

  // 切换视图
  const switchToExploration = (exploration) => {
    console.log('Switching to exploration:', exploration)
    currentDetailUrl.value = exploration.detailUrl
    currentView.value = 'detail'
    currentParentId.value = exploration.parentId || null
    saveToCache()
  }

  // 返回原始图片
  const resetToOriginal = () => {
    console.log('Resetting to original')
    currentView.value = 'original'
    currentDetailUrl.value = null
    currentParentId.value = null
    saveToCache()
  }

  // 清空所有探索记录
  const clearExplorations = () => {
    console.log('Clearing all explorations')
    explorations.value = []
    currentView.value = 'original'
    currentDetailUrl.value = null
    currentParentId.value = null
    saveToCache()
  }

  // 检查区域是否已探索
  const isRegionExplored = (region) => {
    return explorations.value.some(exp => {
      const r = exp.region
      return Math.abs(r.x - region.x) < 0.1 &&
             Math.abs(r.y - region.y) < 0.1
    })
  }

  const explorationCount = computed(() => explorations.value.length)

  // 构建树状结构
  const explorationTree = computed(() => {
    const tree = []
    const nodeMap = new Map()

    const root = {
      id: 'root',
      label: '原始图片',
      type: 'original',
      children: []
    }
    nodeMap.set('root', root)
    tree.push(root)

    const sortedExplorations = [...explorations.value].sort((a, b) => {
      const depthA = getDepth(a)
      const depthB = getDepth(b)
      return depthA - depthB
    })

    sortedExplorations.forEach((exp, index) => {
      const parentId = exp.parentId || 'root'
      const parentNode = nodeMap.get(parentId)

      const node = {
        id: exp.id,
        label: `探索 ${index + 1}`,
        type: 'detail',
        detailUrl: exp.detailUrl,
        timestamp: exp.timestamp,
        children: [],
        depth: getDepth(exp)
      }

      if (parentNode) {
        parentNode.children.push(node)
      } else {
        root.children.push(node)
      }
      nodeMap.set(exp.id, node)
    })

    return tree
  })

  function getDepth(exploration, visited = new Set()) {
    if (visited.has(exploration.id)) return 0
    visited.add(exploration.id)

    if (!exploration.parentId) return 0
    const parent = explorations.value.find(e => e.id === exploration.parentId)
    if (!parent) return 0
    return 1 + getDepth(parent, visited)
  }

  return {
    explorations,
    currentView,
    currentDetailUrl,
    currentParentId,
    imageDate,
    isLoaded,
    addExploration,
    switchToExploration,
    resetToOriginal,
    clearExplorations,
    isRegionExplored,
    explorationCount,
    explorationTree
  }
}
