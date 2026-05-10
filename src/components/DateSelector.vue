<script setup>
import { ref, onMounted, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const dates = ref([])
const loading = ref(true)

const API_SERVER = 'http://localhost:3000'

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 当前选中的日期，默认今天
const selectedDate = computed(() => props.modelValue || getTodayDate())

onMounted(async () => {
  await fetchDates()
})

async function fetchDates() {
  try {
    const response = await fetch(`${API_SERVER}/api/dates`)
    const data = await response.json()
    dates.value = data.dates || []
  } catch (e) {
    console.error('Failed to fetch dates:', e)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-')
  if (dateStr === getTodayDate()) {
    return 'Today'
  }
  return `${month}/${day}`
}

function handleChange(event) {
  emit('update:modelValue', event.target.value || getTodayDate())
}
</script>

<template>
  <div class="date-selector">
    <select
      :value="selectedDate"
      @change="handleChange"
      :disabled="loading"
    >
      <option v-if="loading" value="">加载中...</option>
      <option v-else-if="!dates.length" :value="getTodayDate()">{{ formatDate(getTodayDate()) }}</option>
      <option
        v-for="date in dates"
        :key="date"
        :value="date"
      >
        {{ formatDate(date) }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.date-selector {
  z-index: 100;
}

.date-selector select {
  background: rgba(74, 144, 164, 0.2);
  border: 1px solid rgba(74, 144, 164, 0.4);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}

.date-selector select:hover {
  background: rgba(74, 144, 164, 0.3);
  border-color: rgba(74, 144, 164, 0.6);
}

.date-selector select:focus {
  border-color: rgba(74, 144, 164, 0.8);
  box-shadow: 0 0 0 2px rgba(74, 144, 164, 0.2);
}

.date-selector select option {
  background: #1a1a2e;
  color: #fff;
}
</style>
