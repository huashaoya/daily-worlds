<script setup>
import { ref, computed } from 'vue'

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
  }
})

const emit = defineEmits(['select'])

// 计算树的布局位置（垂直布局，父节点在上，子节点在下）
const layoutNodes = computed(() => {
  const nodes = []
  const NODE_WIDTH = 100
  const NODE_HEIGHT = 36
  const LEVEL_GAP = 60

  // 计算每个节点的子节点数量（用于分配水平空间）
  function countDescendants(node) {
    if (!node.children || node.children.length === 0) return 1
    return node.children.reduce((sum, child) => sum + countDescendants(child), 0)
  }

  // 计算子树需要的宽度
  function getSubtreeWidth(node) {
    if (!node.children || node.children.length === 0) return NODE_WIDTH
    return node.children.reduce((sum, child) => sum + getSubtreeWidth(child), 0) + (node.children.length - 1) * 10
  }

  // 布局节点
  function layoutNode(node, x, y) {
    const isActive = node.type === 'original'
      ? props.currentView === 'original'
      : props.currentDetailUrl === node.detailUrl

    const subtreeWidth = getSubtreeWidth(node)
    const nodeX = x - subtreeWidth / 2

    nodes.push({ ...node, x: nodeX + subtreeWidth / 2 - NODE_WIDTH / 2, y, isActive })

    if (node.children && node.children.length > 0) {
      let childX = x - subtreeWidth / 2
      node.children.forEach((child) => {
        const childSubtreeWidth = getSubtreeWidth(child)
        layoutNode(child, childX + childSubtreeWidth / 2, y + LEVEL_GAP)
        childX += childSubtreeWidth + 10
      })
    }
  }

  if (props.tree && props.tree.length > 0) {
    const rootWidth = getSubtreeWidth(props.tree[0])
    layoutNode(props.tree[0], 120, 20)
  }

  // 计算 SVG 尺寸
  const maxX = nodes.reduce((max, n) => Math.max(max, n.x + NODE_WIDTH), 0)
  const maxY = nodes.reduce((max, n) => Math.max(max, n.y + NODE_HEIGHT), 0)

  return {
    nodes,
    width: Math.max(250, maxX + 120),
    height: Math.max(200, maxY + 80)
  }
})

const svgWidth = computed(() => layoutNodes.value.width)
const svgHeight = computed(() => layoutNodes.value.height)

// 拖拽状态
const isDragging = ref(false)
const viewBox = ref({ x: 0, y: 0 })
const startPos = ref({ x: 0, y: 0 })

const handleMouseDown = (e) => {
  isDragging.value = true
  startPos.value = { x: e.clientX - viewBox.value.x, y: e.clientY - viewBox.value.y }
}

const handleMouseMove = (e) => {
  if (!isDragging.value) return
  viewBox.value = {
    x: e.clientX - startPos.value.x,
    y: e.clientY - startPos.value.y
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleNodeClick = (node) => {
  if (!isDragging.value) {
    emit('select', node)
  }
}

// 重置视图
const resetView = () => {
  viewBox.value = { x: 0, y: 0 }
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

  const startX = parentLayoutNode.x + 40
  const startY = parentLayoutNode.y + 36
  const endX = node.x + 40
  const endY = node.y

  // 折线：从父节点底部到子节点顶部
  const midY = startY + 15
  return `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
}
</script>

<template>
  <div class="tree-graph">
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
          v-for="(node, index) in layoutNodes.nodes"
          :key="'line-' + index"
          :d="getLinePath(node)"
          class="tree-line"
        />
      </g>

      <!-- 节点 -->
      <g class="nodes" :transform="`translate(${viewBox.x}, ${viewBox.y})`">
        <g
          v-for="(node, index) in layoutNodes.nodes"
          :key="'node-' + index"
          :transform="`translate(${node.x}, ${node.y})`"
          class="tree-node-group"
          :class="{ active: node.isActive }"
          @click="handleNodeClick(node)"
        >
          <!-- 节点背景 -->
          <rect
            x="0"
            y="0"
            width="100"
            height="36"
            rx="6"
            class="node-bg"
          />

          <!-- 节点图标 -->
          <circle
            v-if="node.type === 'original'"
            cx="18"
            cy="18"
            r="8"
            class="node-dot"
          />
          <image
            v-else-if="node.detailUrl"
            :href="node.detailUrl"
            x="4"
            y="4"
            width="28"
            height="28"
            clip-path="circle(14px at 14px 14px)"
          />

          <!-- 节点标签 -->
          <text
            x="48"
            y="22"
            class="node-label"
          >
            {{ node.label }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.tree-graph {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}

.tree-graph svg {
  display: block;
  min-width: 120px;
  cursor: grab;
  user-select: none;
}

.tree-graph svg:active {
  cursor: grabbing;
}

.tree-line {
  fill: none;
  stroke: rgba(74, 144, 164, 0.4);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.tree-node-group {
  cursor: pointer;
}

.node-bg {
  fill: rgba(30, 40, 55, 0.8);
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1;
  transition: all 0.2s ease;
}

.tree-node-group:hover .node-bg {
  fill: rgba(50, 65, 85, 0.9);
  stroke: rgba(74, 144, 164, 0.5);
}

.tree-node-group.active .node-bg {
  fill: rgba(74, 144, 164, 0.3);
  stroke: rgba(74, 144, 164, 0.8);
}

.node-dot {
  fill: rgba(74, 144, 164, 0.6);
}

.tree-node-group.active .node-dot {
  fill: #4a90a4;
}

.node-label {
  fill: rgba(255, 255, 255, 0.8);
  font-size: 10px;
  font-family: system-ui, -apple-system, sans-serif;
}

.tree-node-group.active .node-label {
  fill: #fff;
  font-weight: 500;
}
</style>