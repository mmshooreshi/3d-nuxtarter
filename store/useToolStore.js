// store/useToolStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToolStore = defineStore('tool', () => {
  const activeTool = ref('select')
  return { activeTool }
})
