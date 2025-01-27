// store/useModelsStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModelsStore = defineStore('models', () => {
  const models = ref([])

  function addModel(model) {
    models.value.push(model)
  }

  function removeModel(id) {
    models.value = models.value.filter(m => m.id !== id)
  }

  function updateTransform(id, transformData) {
    const model = models.value.find(m => m.id === id)
    if (model) {
      Object.assign(model, transformData)
    }
  }

  return {
    models,
    addModel,
    removeModel,
    updateTransform
  }
})
