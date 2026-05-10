<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  node: {
    type: Object,
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
  depth: {
    type: Number,
    default: 0
  },
  isLast: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const isExpanded = ref(true)

const isActive = computed(() => {
  if (props.node.type === 'original') {
    return props.currentView === 'original'
  }
  return props.currentDetailUrl === props.node.detailUrl
})

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const indentPadding = computed(() => {
  return props.depth * 16 + 8
})

const handleClick = () => {
  emit('select', props.node)
}

const toggleExpand = (e) => {
  e.stopPropagation()
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="tree-node" :class="{ 'is-active': isActive }">
    <div
      class="node-content"
      :style="{ paddingLeft: indentPadding + 'px' }"
      @click="handleClick"
    >
      <!-- 展开/收起按钮 -->
      <button
        v-if="hasChildren"
        class="expand-btn"
        :class="{ expanded: isExpanded }"
        @click="toggleExpand"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      <span v-else class="expand-placeholder"></span>

      <!-- 节点图标 -->
      <div class="node-icon">
        <span v-if="node.type === 'original'">&#9679;</span>
        <img v-else-if="node.detailUrl" :src="node.detailUrl" alt="" />
        <span v-else>&#9728;</span>
      </div>

      <!-- 节点标签 -->
      <span class="node-label">{{ node.label }}</span>
    </div>

    <!-- 子节点 -->
    <div v-if="hasChildren && isExpanded" class="node-children">
      <TreeNode
        v-for="(child, index) in node.children"
        :key="child.id"
        :node="child"
        :currentDetailUrl="currentDetailUrl"
        :currentView="currentView"
        :depth="depth + 1"
        :isLast="index === node.children.length - 1"
        @select="(n) => emit('select', n)"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  width: 100%;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.node-content:hover {
  background: rgba(255, 255, 255, 0.05);
}

.tree-node.is-active .node-content {
  background: rgba(74, 144, 164, 0.2);
}

.expand-btn {
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.expand-btn svg {
  width: 12px;
  height: 12px;
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease;
}

.expand-btn.expanded svg {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 20px;
  flex-shrink: 0;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.node-icon span {
  font-size: 10px;
  color: rgba(74, 144, 164, 0.8);
}

.tree-node.is-active .node-icon span {
  color: #4a90a4;
}

.node-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-node.is-active .node-label {
  color: #fff;
  font-weight: 500;
}

.node-children {
  position: relative;
}

.node-children::before {
  content: '';
  position: absolute;
  left: 28px;
  top: 0;
  bottom: 8px;
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
}
</style>