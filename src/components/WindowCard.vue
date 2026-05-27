<script setup>
const props = defineProps({
  image: {
    type: Object,
    required: true
  }
})

const isInteractive = () => props.image.loaded && props.image.src
</script>

<template>
  <div
    class="window-card"
    :class="{ 'not-loaded': !props.image.loaded }"
    :tabindex="isInteractive() ? 0 : -1"
    :role="isInteractive() ? 'button' : undefined"
    :style="{ cursor: isInteractive() ? 'pointer' : 'default' }"
  >
    <div class="window-frame">
      <div class="window-glass">
        <img
          v-if="props.image.src && props.image.loaded"
          :src="props.image.src"
          :alt="`World ${image.id}`"
        />
        <div v-else class="placeholder">
          <span class="window-number">{{ image.id }}</span>
        </div>
      </div>
      <div class="window-sill"></div>
    </div>
  </div>
</template>

<style scoped>
.window-card {
  position: relative;
  aspect-ratio: 1;
  transition: transform 0.2s ease;
}

.window-card:hover {
  transform: scale(1.02);
}

.window-frame {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 5px;
  background: linear-gradient(145deg, #3a3a3a, #2a2a2a);
  border-radius: 6px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

.window-glass {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    inset 0 2px 10px rgba(0, 0, 0, 0.5),
    inset 0 0 30px rgba(74, 144, 164, 0.1);
}

.window-glass img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.window-sill {
  position: absolute;
  bottom: -3px;
  left: 10%;
  right: 10%;
  height: 6px;
  background: linear-gradient(180deg, #4a4a4a, #2a2a2a);
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
}

.window-number {
  font-size: 2rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.15);
  font-family: 'Times New Roman', serif;
}

.not-loaded .window-glass {
  background: linear-gradient(135deg, #2a2a3e 0%, #1a1a2e 100%);
}
</style>
