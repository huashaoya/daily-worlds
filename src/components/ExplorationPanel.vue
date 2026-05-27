<script setup>
import TreeGraph from './TreeGraph.vue'

defineProps({
  explorationCount: {
    type: Number,
    required: true
  },
  explorationTree: {
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

const emit = defineEmits(['select', 'clear'])
</script>

<template>
  <div class="exploration-panel">
    <div class="panel-header">
      <div class="panel-title-wrap">
        <span class="panel-title">探索记录</span>
        <span class="panel-subtitle">点击节点回看，拖拽树图查看分支</span>
      </div>
      <span class="panel-count">{{ explorationCount }} 个</span>
    </div>

    <TreeGraph
      :tree="explorationTree"
      :currentDetailUrl="currentDetailUrl"
      :currentView="currentView"
      :originalImageUrl="originalImageUrl"
      @select="emit('select', $event)"
    />

    <button class="clear-btn" @click="emit('clear')">
      <span>&#215;</span> 清空全部
    </button>
  </div>
</template>

<style scoped>
.exploration-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  background:
    radial-gradient(circle at 20% 0%, rgba(74, 144, 164, 0.18), transparent 34%),
    rgba(15, 20, 30, 0.96);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.42);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title-wrap {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.panel-subtitle {
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.72rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-count {
  flex-shrink: 0;
  background: rgba(74, 144, 164, 0.18);
  border: 1px solid rgba(74, 144, 164, 0.32);
  color: rgba(166, 229, 244, 0.95);
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.clear-btn {
  margin: 12px 14px 14px;
  padding: 11px;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 12px;
  color: rgba(255, 150, 150, 0.8);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.clear-btn:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.5);
  color: rgba(255, 150, 150, 1);
}
</style>
