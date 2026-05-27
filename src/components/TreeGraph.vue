<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  tree: {
    type: Array,
    required: true
  },
  currentDetailUrl: {
    type: String,
    default: null
  },
  currentView: {
    type: String,
    default: 'original'
  },
  originalImageUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const NODE_WIDTH = 148
const NODE_HEIGHT = 54
const LEVEL_GAP = 76
const SIBLING_GAP = 18
const SIDE_GAP = 46
const ROW_NODE_GAP = 32
const CANVAS_PADDING_X = 36
const CANVAS_PADDING_Y = 28

const nodeMetaMap = {
  original: { label: '起点', icon: '原' },
  local: { label: '局部探索', icon: '探' },
  perspective: { label: '视角变换', icon: '视' },
  story: { label: '故事延伸', icon: '故' }
}

const getNodeKind = (node) => {
  if (node.type === 'original') return 'original'
  if (node.type === 'parallel') return node.parallelType === 'story' ? 'story' : 'perspective'
  return 'local'
}

const getNodeMeta = (node) => nodeMetaMap[getNodeKind(node)] || nodeMetaMap.local

const isSideNode = (node) => getNodeKind(node) === 'perspective'

const getVerticalChildren = (node) => {
  return (node.children || []).filter(child => !isSideNode(child))
}

const getSideChildren = (node) => {
  return (node.children || []).filter(child => isSideNode(child))
}

const getNodePreviewUrl = (node) => {
  if (node.type === 'original') return props.originalImageUrl
  return node.detailUrl || ''
}

const displayLabel = (label) => {
  if (!label) return '未命名探索'
  return label.length > 9 ? `${label.slice(0, 9)}...` : label
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const findActiveNodeId = computed(() => {
  if (props.currentView === 'original') return 'root'

  function search(nodes) {
    for (const node of nodes || []) {
      if (node.detailUrl && node.detailUrl === props.currentDetailUrl) return node.id
      const found = search(node.children)
      if (found) return found
    }
    return null
  }

  return search(props.tree)
})

const activePathIds = computed(() => {
  const targetId = findActiveNodeId.value
  if (!targetId) return new Set()
  const path = []

  function walk(nodes, parents = []) {
    for (const node of nodes || []) {
      const nextPath = [...parents, node.id]
      if (node.id === targetId) {
        path.push(...nextPath)
        return true
      }
      if (walk(node.children, nextPath)) return true
    }
    return false
  }

  walk(props.tree)
  return new Set(path)
})

const stats = computed(() => {
  const result = {
    total: 0,
    local: 0,
    perspective: 0,
    story: 0
  }

  function visit(nodes) {
    for (const node of nodes || []) {
      if (node.type !== 'original') {
        result.total += 1
        result[getNodeKind(node)] += 1
      }
      visit(node.children)
    }
  }

  visit(props.tree)
  return result
})

// 计算树的布局位置（垂直布局，父节点在上，子节点在下）
const layoutNodes = computed(() => {
  const nodes = []

  function splitSideChildren(node) {
    return getSideChildren(node).reduce((groups, child, index) => {
      if (index % 2 === 0) {
        groups.right.push(child)
      } else {
        groups.left.push(child)
      }
      return groups
    }, { left: [], right: [] })
  }

  function getChildrenWidth(children) {
    if (children.length === 0) return 0
    return children.reduce((sum, child) => sum + getSubtreeWidth(child), 0) + (children.length - 1) * SIBLING_GAP
  }

  function getVerticalWidth(node) {
    const verticalChildren = getVerticalChildren(node)
    return verticalChildren.length > 0 ? getChildrenWidth(verticalChildren) : NODE_WIDTH
  }

  function getSideWidth(node) {
    const { left, right } = splitSideChildren(node)
    const leftWidth = getChildrenWidth(left)
    const rightWidth = getChildrenWidth(right)
    const centerWidth = getVerticalWidth(node)
    return leftWidth + centerWidth + rightWidth +
      (leftWidth > 0 ? SIDE_GAP : 0) +
      (rightWidth > 0 ? SIDE_GAP : 0)
  }

  // 计算子树需要的宽度
  function getSubtreeWidth(node) {
    return Math.max(getVerticalWidth(node), getSideWidth(node))
  }

  // 布局节点
  function layoutNode(node, x, y) {
    nodes.push({
      ...node,
      x: x - NODE_WIDTH / 2,
      y,
      kind: getNodeKind(node),
      meta: getNodeMeta(node),
      isActive: node.id === findActiveNodeId.value,
      isInActivePath: activePathIds.value.has(node.id)
    })

    const verticalWidth = getVerticalWidth(node)
    const { left, right } = splitSideChildren(node)
    let rightCursor = x + verticalWidth / 2 + SIDE_GAP
    right.forEach((child) => {
      const childWidth = getSubtreeWidth(child)
      layoutNode(child, rightCursor + childWidth / 2, y)
      rightCursor += childWidth + SIBLING_GAP
    })

    let leftCursor = x - verticalWidth / 2 - SIDE_GAP
    left.forEach((child) => {
      const childWidth = getSubtreeWidth(child)
      layoutNode(child, leftCursor - childWidth / 2, y)
      leftCursor -= childWidth + SIBLING_GAP
    })

    const verticalChildren = getVerticalChildren(node)
    if (verticalChildren.length > 0) {
      let childX = x - verticalWidth / 2
      verticalChildren.forEach((child) => {
        const childSubtreeWidth = getSubtreeWidth(child)
        layoutNode(child, childX + childSubtreeWidth / 2, y + LEVEL_GAP)
        childX += childSubtreeWidth + SIBLING_GAP
      })
    }
  }

  function resolveRowCollisions() {
    const rows = new Map()

    nodes.forEach((node) => {
      const rowKey = node.y
      if (!rows.has(rowKey)) rows.set(rowKey, [])
      rows.get(rowKey).push(node)
    })

    rows.forEach((rowNodes) => {
      rowNodes.sort((a, b) => a.x - b.x)

      let cursor = -Infinity
      rowNodes.forEach((node) => {
        const minX = Number.isFinite(cursor) ? cursor + ROW_NODE_GAP : node.x
        if (node.x < minX) {
          node.x = minX
        }
        cursor = node.x + NODE_WIDTH
      })
    })
  }

  if (props.tree && props.tree.length > 0) {
    const rootWidth = getSubtreeWidth(props.tree[0])
    layoutNode(props.tree[0], rootWidth / 2 + CANVAS_PADDING_X, CANVAS_PADDING_Y)
  }

  resolveRowCollisions()

  const minX = nodes.reduce((min, n) => Math.min(min, n.x), Infinity)
  const minY = nodes.reduce((min, n) => Math.min(min, n.y), Infinity)
  const shiftX = Number.isFinite(minX) && minX < CANVAS_PADDING_X ? CANVAS_PADDING_X - minX : 0
  const shiftY = Number.isFinite(minY) && minY < CANVAS_PADDING_Y ? CANVAS_PADDING_Y - minY : 0

  if (shiftX || shiftY) {
    nodes.forEach((node) => {
      node.x += shiftX
      node.y += shiftY
    })
  }

  // 计算 SVG 尺寸
  const maxX = nodes.reduce((max, n) => Math.max(max, n.x + NODE_WIDTH), 0)
  const maxY = nodes.reduce((max, n) => Math.max(max, n.y + NODE_HEIGHT), 0)

  return {
    nodes,
    width: Math.max(320, maxX + CANVAS_PADDING_X),
    height: Math.max(240, maxY + CANVAS_PADDING_Y)
  }
})

const treeCanvas = ref(null)
const canvasSize = ref({ width: 0, height: 0 })
let resizeObserver = null
let scrollAnimationFrame = null

const updateCanvasSize = () => {
  if (!treeCanvas.value) return
  canvasSize.value = {
    width: treeCanvas.value.clientWidth,
    height: treeCanvas.value.clientHeight
  }
}

onMounted(() => {
  nextTick(() => {
    updateCanvasSize()
    requestAnimationFrame(() => {
      const targetNode = layoutNodes.value.nodes.find(node => node.id === findActiveNodeId.value) || layoutNodes.value.nodes[0]
      centerNode(targetNode, 'auto')
    })
  })
  if (typeof ResizeObserver !== 'undefined' && treeCanvas.value) {
    resizeObserver = new ResizeObserver(updateCanvasSize)
    resizeObserver.observe(treeCanvas.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame)
  }
})

const svgWidth = computed(() => Math.max(layoutNodes.value.width, canvasSize.value.width))
const svgHeight = computed(() => Math.max(layoutNodes.value.height, canvasSize.value.height))

// 拖拽状态
const isDragging = ref(false)
const hasMoved = ref(false)
const viewBox = ref({ x: 0, y: 0 })
const startPos = ref({ x: 0, y: 0 })

const handleMouseDown = (e) => {
  isDragging.value = true
  hasMoved.value = false
  startPos.value = { x: e.clientX - viewBox.value.x, y: e.clientY - viewBox.value.y }
}

const handleMouseMove = (e) => {
  if (!isDragging.value) return
  hasMoved.value = true
  viewBox.value = {
    x: e.clientX - startPos.value.x,
    y: e.clientY - startPos.value.y
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3)

const animateScrollTo = (canvas, targetLeft, targetTop, duration = 420) => {
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame)
  }

  const startLeft = canvas.scrollLeft
  const startTop = canvas.scrollTop
  const deltaLeft = targetLeft - startLeft
  const deltaTop = targetTop - startTop
  const startTime = performance.now()

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1)
    const eased = easeOutCubic(progress)

    canvas.scrollLeft = startLeft + deltaLeft * eased
    canvas.scrollTop = startTop + deltaTop * eased

    if (progress < 1) {
      scrollAnimationFrame = requestAnimationFrame(step)
    } else {
      scrollAnimationFrame = null
    }
  }

  scrollAnimationFrame = requestAnimationFrame(step)
}

const centerNode = async (node, behavior = 'smooth') => {
  viewBox.value = { x: 0, y: 0 }
  await nextTick()

  const canvas = treeCanvas.value
  const targetNode = node
  if (!canvas || !targetNode) return

  const targetLeft = targetNode.x + NODE_WIDTH / 2 - canvas.clientWidth / 2
  const targetTop = targetNode.y + NODE_HEIGHT / 2 - canvas.clientHeight / 2

  const maxLeft = Math.max(0, canvas.scrollWidth - canvas.clientWidth)
  const maxTop = Math.max(0, canvas.scrollHeight - canvas.clientHeight)
  const nextLeft = Math.min(Math.max(0, targetLeft), maxLeft)
  const nextTop = Math.min(Math.max(0, targetTop), maxTop)

  if (behavior === 'smooth') {
    animateScrollTo(canvas, nextLeft, nextTop)
    return
  }

  canvas.scrollLeft = nextLeft
  canvas.scrollTop = nextTop
}

const handleNodeClick = async (node) => {
  if (hasMoved.value) return
  emit('select', node)
  await centerNode(node)
}

// 重置视图
const resetView = async () => {
  const targetNode = layoutNodes.value.nodes.find(node => node.id === findActiveNodeId.value) || layoutNodes.value.nodes[0]
  await centerNode(targetNode)
}

// 找到父节点
function findParentNode(node) {
  function search(nodeList, parent = null) {
    for (const n of nodeList) {
      if (n.id === node.id) return parent
      if (n.children && n.children.length > 0) {
        const found = search(n.children, n)
        if (found !== undefined) return found
      }
    }
    return undefined
  }
  return search(props.tree)
}

// 计算连接线路径（从上到下的垂直树）
const getLinePath = (node) => {
  const parentNode = findParentNode(node)
  if (!parentNode) return ''

  const parentLayoutNode = layoutNodes.value.nodes.find(n => n.id === parentNode.id)
  if (!parentLayoutNode) return ''

  if (node.kind === 'perspective') {
    const childOnRight = node.x > parentLayoutNode.x
    const startX = childOnRight ? parentLayoutNode.x + NODE_WIDTH : parentLayoutNode.x
    const endX = childOnRight ? node.x : node.x + NODE_WIDTH
    const startY = parentLayoutNode.y + NODE_HEIGHT / 2
    const endY = node.y + NODE_HEIGHT / 2
    const midX = startX + (endX - startX) / 2
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
  }

  const startX = parentLayoutNode.x + NODE_WIDTH / 2
  const startY = parentLayoutNode.y + NODE_HEIGHT
  const endX = node.x + NODE_WIDTH / 2
  const endY = node.y

  const midY = startY + (endY - startY) / 2
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
}

// 获取箭头位置
const getArrowPosition = (node) => {
  if (!node) return '0,0'
  const parentNode = findParentNode(node)
  if (!parentNode) return '0,0'

  const parentLayoutNode = layoutNodes.value.nodes.find(n => n.id === parentNode.id)
  if (!parentLayoutNode) return '0,0'

  const endX = node.x + NODE_WIDTH / 2
  const endY = node.y

  return `${endX},${endY - 8}`
}

const storyLineNodes = computed(() => {
  return layoutNodes.value.nodes.filter(node => node.kind === 'story')
})
</script>

<template>
  <div class="tree-graph">
    <div class="tree-toolbar">
      <div class="tree-summary">
        <span class="summary-main">{{ stats.total }} 个节点</span>
        <span class="summary-sub">拖拽画布查看分支，点击节点回看</span>
      </div>
      <button class="reset-btn" @click="resetView">居中</button>
    </div>

    <div class="tree-legend">
      <span class="legend-item local">局部</span>
      <span class="legend-item perspective">视角</span>
      <span class="legend-item story">故事</span>
    </div>

    <div ref="treeCanvas" class="tree-canvas">
      <svg
        :width="svgWidth"
        :height="svgHeight"
        class="tree-svg"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <!-- 连接线 -->
        <g class="lines" :transform="`translate(${viewBox.x}, ${viewBox.y})`">
          <path
            v-for="node in layoutNodes.nodes"
            :key="'line-' + node.id"
            :d="getLinePath(node)"
            class="tree-line"
            :class="[
              node.kind,
              { 'active-path': node.isInActivePath }
            ]"
          />
          <polygon
            v-for="node in storyLineNodes"
            :key="'arrow-' + node.id"
            :transform="`translate(${getArrowPosition(node)}) rotate(90)`"
            class="story-arrow"
            points="0,-5 10,0 0,5"
          />
        </g>

        <!-- 节点 -->
        <g class="nodes" :transform="`translate(${viewBox.x}, ${viewBox.y})`">
          <g
            v-for="node in layoutNodes.nodes"
            :key="'node-' + node.id"
            :transform="`translate(${node.x}, ${node.y})`"
            class="tree-node-group"
            :class="[node.kind, { active: node.isActive, 'in-path': node.isInActivePath }]"
            @click="handleNodeClick(node)"
          >
            <title>{{ node.label }}</title>
            <rect
              x="0"
              y="0"
              :width="NODE_WIDTH"
              :height="NODE_HEIGHT"
              rx="14"
              class="node-bg"
            />
            <rect
              x="8"
              y="8"
              width="38"
              height="38"
              rx="10"
              class="node-thumb-bg"
            />
            <image
              v-if="getNodePreviewUrl(node)"
              :href="getNodePreviewUrl(node)"
              x="8"
              y="8"
              width="38"
              height="38"
              preserveAspectRatio="xMidYMid slice"
              clip-path="inset(0 round 10px)"
            />
            <text
              v-else
              x="27"
              y="32"
              text-anchor="middle"
              class="node-icon-text"
            >
              {{ node.meta.icon }}
            </text>
            <text x="56" y="22" class="node-label">
              {{ displayLabel(node.label) }}
            </text>
            <text x="56" y="40" class="node-meta">
              {{ node.meta.label }}{{ formatTime(node.timestamp) ? ` · ${formatTime(node.timestamp)}` : '' }}
            </text>
            <circle cx="132" cy="16" r="4" class="node-status" />
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.tree-graph {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.tree-summary {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summary-main {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.82rem;
  font-weight: 700;
}

.summary-sub {
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reset-btn {
  flex-shrink: 0;
  border: 1px solid rgba(74, 144, 164, 0.35);
  background: rgba(74, 144, 164, 0.12);
  color: rgba(190, 235, 245, 0.92);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: rgba(74, 144, 164, 0.22);
  border-color: rgba(74, 144, 164, 0.6);
}

.tree-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.7rem;
}

.legend-item::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--legend-color);
  box-shadow: 0 0 12px var(--legend-glow);
}

.legend-item.local {
  --legend-color: #4a90a4;
  --legend-glow: rgba(74, 144, 164, 0.55);
}

.legend-item.perspective {
  --legend-color: #f5a623;
  --legend-glow: rgba(245, 166, 35, 0.55);
}

.legend-item.story {
  --legend-color: #bb6bd9;
  --legend-glow: rgba(187, 107, 217, 0.55);
}

.tree-canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-radius: 14px;
  background:
    radial-gradient(circle at 20% 0%, rgba(74, 144, 164, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.tree-canvas::-webkit-scrollbar {
  display: none;
}

.tree-graph svg {
  display: block;
  min-width: 100%;
  min-height: 100%;
  cursor: grab;
  user-select: none;
}

.tree-graph svg:active {
  cursor: grabbing;
}

.tree-line {
  fill: none;
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke 0.2s ease, stroke-width 0.2s ease;
}

.tree-line.local {
  stroke: rgba(74, 144, 164, 0.36);
}

.tree-line.perspective {
  stroke: rgba(245, 166, 35, 0.45);
  stroke-dasharray: 6 5;
}

.tree-line.story {
  stroke: rgba(187, 107, 217, 0.52);
}

.tree-line.active-path {
  stroke-width: 3;
  stroke-opacity: 1;
  filter: drop-shadow(0 0 5px rgba(74, 144, 164, 0.45));
}

.story-arrow {
  fill: rgba(187, 107, 217, 0.9);
  filter: drop-shadow(0 0 5px rgba(187, 107, 217, 0.42));
}

.node-bg {
  fill: rgba(24, 32, 45, 0.92);
  stroke: rgba(255, 255, 255, 0.12);
  stroke-width: 1;
  transition: all 0.2s ease;
}

.node-thumb-bg {
  fill: rgba(255, 255, 255, 0.06);
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 1;
}

.tree-node-group {
  cursor: pointer;
}

.tree-node-group:hover .node-bg {
  fill: rgba(34, 46, 64, 0.96);
  stroke: rgba(255, 255, 255, 0.28);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.22));
}

.tree-node-group.active .node-bg {
  fill: rgba(74, 144, 164, 0.24);
  stroke: rgba(118, 214, 236, 0.92);
  stroke-width: 2;
  filter: drop-shadow(0 0 14px rgba(74, 144, 164, 0.42));
}

.tree-node-group.in-path:not(.active) .node-bg {
  stroke: rgba(74, 144, 164, 0.42);
}

.tree-node-group.perspective.active .node-bg {
  fill: rgba(245, 166, 35, 0.2);
  stroke: rgba(245, 166, 35, 0.9);
}

.tree-node-group.story.active .node-bg {
  fill: rgba(187, 107, 217, 0.2);
  stroke: rgba(187, 107, 217, 0.9);
}

.node-icon-text {
  fill: rgba(255, 255, 255, 0.86);
  font-size: 13px;
  font-weight: 700;
  font-family: system-ui, -apple-system, sans-serif;
}

.tree-node-group.original .node-thumb-bg {
  fill: rgba(74, 144, 164, 0.18);
}

.tree-node-group.local .node-thumb-bg {
  fill: rgba(74, 144, 164, 0.16);
}

.tree-node-group.perspective .node-thumb-bg {
  fill: rgba(245, 166, 35, 0.18);
}

.tree-node-group.story .node-thumb-bg {
  fill: rgba(187, 107, 217, 0.18);
}

.node-label {
  fill: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 650;
  font-family: system-ui, -apple-system, sans-serif;
}

.node-meta {
  fill: rgba(255, 255, 255, 0.48);
  font-size: 10px;
  font-family: system-ui, -apple-system, sans-serif;
}

.node-status {
  fill: rgba(255, 255, 255, 0.22);
}

.tree-node-group.local .node-status {
  fill: #4a90a4;
}

.tree-node-group.perspective .node-status {
  fill: #f5a623;
}

.tree-node-group.story .node-status {
  fill: #bb6bd9;
}

.tree-node-group.active .node-label,
.tree-node-group.active .node-meta {
  fill: #fff;
}

@media (max-width: 720px) {
  .tree-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .reset-btn {
    align-self: flex-start;
  }
}
</style>
