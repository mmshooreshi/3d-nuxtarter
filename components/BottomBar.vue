<template>
    <footer class="h-14 bg-gray-100 dark:bg-gray-900 flex items-center px-4">
      <!-- Layer Preview Slider -->
      <div class="flex items-center mr-8 text-nowrap">
        <label for="layerSlider" class="mr-2 text-sm text-gray-700 dark:text-gray-200">Layer</label>
        <input
          id="layerSlider"
          type="range"
          min="0"
          :max="maxLayer"
          v-model="currentLayerLocal"
          class="range-input"
        />
        <span class="ml-2 text-sm text-gray-600 dark:text-gray-300">
          {{ currentLayerLocal }} / {{ maxLayer }}
        </span>
      </div>
  
      <!-- If slicing in progress, show progress bar; else show stats -->
      <div v-if="slicingInProgress" class="flex items-center space-x-2">
        <progress
          :value="slicingProgress"
          max="100"
          class="w-32 h-2 bg-gray-300 dark:bg-gray-700"
        ></progress>
        <span class="text-sm text-gray-700 dark:text-gray-200">
          {{ slicingProgress }}%
        </span>
      </div>
      <div v-else class="flex items-center space-x-4">
        <div class="text-sm text-gray-700 dark:text-gray-200">
          Time: {{ estimatedPrintTime }}
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-200">
          Resin: {{ resinUsage }} ml
        </div>
      </div>
    </footer>
  </template>
  
  
  <script setup>
  import { ref, computed, watch } from 'vue'
  import { useSlicingStore } from '~/store/useSlicingStore'
  
  const slicingStore = useSlicingStore()
  
  const slicingInProgress = computed(() => slicingStore.slicingInProgress)
  const slicingProgress = computed(() => slicingStore.slicingProgress)
  const maxLayer = computed(() => slicingStore.maxLayer)
  const estimatedPrintTime = computed(() => slicingStore.estimatedPrintTime)
  const resinUsage = computed(() => slicingStore.resinUsage)
  
  // For layer preview (mock)
  const currentLayerLocal = ref(0)
  watch(currentLayerLocal, val => {
    // In real code, you'd tell your 3D viewer to show that slice
    console.log(`Previewing layer: ${val}`)
  })
  </script>
  
  <style scoped>
  /* Range Input Styles */
  .range-input {
    @apply w-full h-2 bg-gray-4 dark:bg-gray-6 rounded-lg appearance-none cursor-pointer;
  }
  
  .range-input::-webkit-slider-thumb {
    @apply appearance-none;
    background-color: #3b82f6; /* Default light mode blue */
    width: 12px;
    height: 12px;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .dark .range-input::-webkit-slider-thumb {
    background-color: #60a5fa; /* Dark mode blue */
  }
  
  .range-input::-moz-range-thumb {
    background-color: #3b82f6; /* Default light mode blue */
    width: 12px;
    height: 12px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .dark .range-input::-moz-range-thumb {
    background-color: #60a5fa; /* Dark mode blue */
  }
  
  /* Progress Bar Styles */
  progress::-webkit-progress-bar {
    @apply bg-gray-4 dark:bg-gray-6 rounded;
  }
  
  progress::-webkit-progress-value {
    @apply bg-blue-500 dark:bg-blue-400 rounded;
  }
  
  progress::-moz-progress-bar {
    @apply bg-blue-500 dark:bg-blue-400 rounded;
  }
  </style>
  