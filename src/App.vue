<script setup>
import WindowGrid from './components/WindowGrid.vue'
import DateSelector from './components/DateSelector.vue'
import { ref, provide } from 'vue'

const selectedDate = ref(null)

// 提供给子组件使用
provide('selectedDate', selectedDate)
</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="title">Daily Worlds</h1>
      <p class="subtitle">Nine windows into random worlds, every day</p>
      <DateSelector
        :model-value="selectedDate"
        @update:model-value="selectedDate = $event"
        class="date-selector"
      />
    </header>

    <main class="main">
      <WindowGrid />
    </main>

    <footer class="footer">
      <p>New worlds await tomorrow</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
  overflow: hidden;
}

.header {
  position: relative;
  text-align: center;
  padding: 0.8rem 1rem 0.5rem;
  flex-shrink: 0;
}

.title {
  font-size: 1.4rem;
  font-weight: 300;
  color: #fff;
  margin: 0;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(74, 144, 164, 0.5);
}

.subtitle {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0.2rem 0 0;
  letter-spacing: 0.1em;
}

.date-selector {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
}

.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 0.4rem 1rem;
}

.footer {
  text-align: center;
  padding: 0.3rem 0.5rem 0.5rem;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.65rem;
  flex-shrink: 0;
}
</style>
