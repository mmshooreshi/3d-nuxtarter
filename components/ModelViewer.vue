<template>
    <div class="relative flex-1 bg-gray-9 flex items-center justify-center h-full">
      <!-- 3D canvas or placeholder -->
      <STLSlicer />

    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue'
  import { useModelsStore } from '~/store/useModelsStore'
  import { useSceneManager } from '~/composables/useSceneManager'
  import STLSlicer from '@/components/SlicerW.vue';

  const modelsStore = useModelsStore()
  const models = computed(() => modelsStore.models)
  
  const canvasEl = ref(null)
  const { loadModel, setCameraMode } = useSceneManager(canvasEl)
  </script>
  