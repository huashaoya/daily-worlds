<script setup>
import { ref, watch, inject } from 'vue'
import { useDailyImages } from '../composables/useDailyImages'
import WindowCard from './WindowCard.vue'
import WorldModal from './WorldModal.vue'

const selectedDate = inject('selectedDate', ref(null))

const { images, loading, error, generating, progress, progressMessage, reload } = useDailyImages(selectedDate.value)
const selectedImage = ref(null)

// 监听 selectedDate 变化，重新加载图片
watch(selectedDate, (newDate) => {
  if (newDate) {
    reload(newDate)
  }
})

const handleWindowClick = (image) => {
  selectedImage.value = image
}

const closeModal = () => {
  selectedImage.value = null
}

</script>

<template>
  <div class="window-grid">
    <!-- 加载中 -->
    <div v-if="loading && !generating" class="loading">
      <span class="loading-text">Loading worlds...</span>
      <div class="loading-spinner"></div>
    </div>

    <!-- 生成中 -->
    <div v-else-if="generating" class="generating">
      <div class="generating-content">
        <div class="generating-icon">🎨</div>
        <div class="generating-text">{{ progressMessage || '正在生成世界图片...' }}</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span>{{ images.length }}/9 张图片已就绪</span>
          <span v-if="progress > 0">{{ progress }}%</span>
        </div>
      </div>

      <!-- 已生成的图片继续显示 -->
      <div class="partial-grid" v-if="images.length > 0">
        <WindowCard
          v-for="image in images"
          :key="image.id"
          :image="image"
          @click="handleWindowClick(image)"
          @keyup.enter="handleWindowClick(image)"
          @keyup.space.prevent="handleWindowClick(image)"
        />
      </div>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <p class="hint">请联系管理员检查服务状态</p>
    </div>

    <!-- 正常显示 -->
    <template v-else>
      <WindowCard
        v-for="image in images"
        :key="image.id"
        :image="image"
        @click="handleWindowClick(image)"
        @keyup.enter="handleWindowClick(image)"
        @keyup.space.prevent="handleWindowClick(image)"
      />
    </template>

    <WorldModal
      v-if="selectedImage"
      :image="selectedImage"
      @close="closeModal"
    />
  </div>
</template>

<style scoped>
.window-grid {
  --grid-size: min(calc(100vw - 2rem), calc(100vh - 132px), 800px);

  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 10px;
  width: var(--grid-size);
  height: var(--grid-size);
  margin: auto;
  box-sizing: border-box;
}

.loading,
.error {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #666;
}

.loading-text {
  font-size: 1rem;
  margin-bottom: 0.8rem;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #e0e0e0;
  border-top-color: #4a90a4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
  color: #999;
}

/* 生成中状态 */
.generating {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.generating-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  background: rgba(74, 144, 164, 0.1);
  border-radius: 16px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 400px;
}

.generating-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.generating-text {
  font-size: 1.1rem;
  color: #4a90a4;
  margin-bottom: 16px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(74, 144, 164, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a90a4, #6bb5c9);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 0.85rem;
  color: #888;
}

.partial-grid {
  display: contents;
}

@media (max-width: 768px) {
  .window-grid {
    --grid-size: min(calc(100vw - 1rem), calc(100vh - 120px));

    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 8px;
  }
}

@media (max-width: 480px) {
  .window-grid {
    --grid-size: min(calc(100vw - 0.75rem), calc(100vh - 112px));

    gap: 6px;
    padding: 6px;
  }
}
</style>
