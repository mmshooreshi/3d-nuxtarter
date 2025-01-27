// store/useSlicingStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useModelsStore } from '~/store/useModelsStore'
import { useNuxtApp } from '#app'


export const useSlicingStore = defineStore('slicing', () => {
  const slicingInProgress = ref(false)
  const slicingProgress = ref(0)
  const maxLayer = ref(100)
  const estimatedPrintTime = ref('0h 0m')
  const resinUsage = ref(0)

  const sliceConfig = ref({
    layerHeight: 0.05,
    exposureTime: 2.0,
    bottomLayers: 5,
    bottomExposure: 20,
    resinType: 'Standard'
  })

  let slicerWorker = null

//   function initWorker() {
//     if (!slicerWorker) {
//       slicerWorker = new Worker(
//         new URL('workers/slicerWorker.js', import.meta.url),
//         { type: 'module' }
//       )
//       slicerWorker.onmessage = (e) => {
//         const { type, data } = e.data
//         if (type === 'progress') {
//           slicingProgress.value = data.progress
//         } else if (type === 'done') {
//           slicingInProgress.value = false
//           maxLayer.value = data.totalLayers
//           estimatedPrintTime.value = data.printTime
//           resinUsage.value = data.resinUsage
//         }
//       }
//     }
//   }

  function startSlicing() {
    const { $toast } = useNuxtApp() 

    const modelsStore = useModelsStore()
    if (modelsStore.models.length === 0) {
      $toast.error('No models loaded to slice!')
      return
    }
    // initWorker()

    slicingInProgress.value = true
    slicingProgress.value = 0

    slicerWorker.postMessage({
      type: 'start',
      config: sliceConfig.value,
      models: modelsStore.models
    })
  }

  return {
    slicingInProgress,
    slicingProgress,
    maxLayer,
    estimatedPrintTime,
    resinUsage,
    sliceConfig,
    startSlicing
  }
})
