// composables/useFileImport.js
import { ref } from 'vue'
import { useModelsStore } from '~/store/useModelsStore'

export function useFileImport() {
  const isImporting = ref(false)
  const error = ref(null)
  const modelsStore = useModelsStore()

  async function importModel(file) {
    try {
      isImporting.value = true
      error.value = null

      // Mock: Simulate parse time
      await new Promise(resolve => setTimeout(resolve, 500))

      // Create a new model entry
      const newModel = {
        id: Date.now(),
        name: file.name,
        geometryData: null, // Real code would parse the file, e.g. STL to geometry
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      }
      modelsStore.addModel(newModel)
    } catch (e) {
      error.value = e.message
    } finally {
      isImporting.value = false
    }
  }

  return {
    isImporting,
    error,
    importModel
  }
}
