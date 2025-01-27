<template>
    <div class="bg-gray-8 px-4 py-4 overflow-y-auto z-10 relative">
      <h2 class="text-lg font-semibold mb-4">Slicing Settings</h2>
      <div class="mb-4">
        <label class="block text-sm mb-1">Layer Height (mm)</label>
        <input
          type="number"
          class="w-full bg-gray-7 border border-gray-6 focus:outline-none rounded px-2 py-1 text-white"
          step="0.01"
          v-model.number="sliceConfig.layerHeight"
        />
      </div>
      <div class="mb-4">
        <label class="block text-sm mb-1">Exposure Time (s)</label>
        <input
          type="number"
          class="w-full bg-gray-7 border border-gray-6 focus:outline-none rounded px-2 py-1 text-white"
          step="0.1"
          v-model.number="sliceConfig.exposureTime"
        />
      </div>
      <div class="mb-4">
        <label class="block text-sm mb-1">Bottom Layers</label>
        <input
          type="number"
          class="w-full bg-gray-7 border border-gray-6 focus:outline-none rounded px-2 py-1 text-white"
          v-model.number="sliceConfig.bottomLayers"
        />
      </div>
      <div class="mb-4">
        <label class="block text-sm mb-1">Bottom Exposure (s)</label>
        <input
          type="number"
          class="w-full bg-gray-7 border border-gray-6 focus:outline-none rounded px-2 py-1 text-white"
          step="0.1"
          v-model.number="sliceConfig.bottomExposure"
        />
      </div>
      <div class="mb-4">
        <label class="block text-sm mb-1">Resin Type</label>
        <select
          class="w-full bg-gray-7 border border-gray-6 focus:outline-none rounded px-2 py-1 text-white"
          v-model="sliceConfig.resinType"
        >
          <option>Standard</option>
          <option>ABS-like</option>
          <option>Dental</option>
        </select>
      </div>
      <button
        class="w-full bg-blue-6 hover:bg-blue-7 text-white py-2 rounded mt-4"
        @click="startSlicing"
      >
        Slice
      </button>
  
      <hr class="my-4 border-gray-6"/>
  
      <!-- more settings or advanced profiles... -->
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { useSlicingStore } from '~/store/useSlicingStore'
  const slicingStore = useSlicingStore()
  
  const sliceConfig = computed({
    get: () => slicingStore.sliceConfig,
    set: (val) => { slicingStore.sliceConfig = val }
  })
  
  function startSlicing() {
    slicingStore.startSlicing()
  }
  </script>
  