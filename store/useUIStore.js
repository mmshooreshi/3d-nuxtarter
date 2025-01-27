// store/useUIStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const leftPanelWidth = ref(64)
  const rightPanelWidth = ref(256)
  
  const leftPanelCollapsed = ref(false)
  const rightPanelCollapsed = ref(false)

  function toggleLeftCollapse() {
    leftPanelCollapsed.value = !leftPanelCollapsed.value
    leftPanelWidth.value = leftPanelCollapsed.value ? 48 : 64
  }

  function toggleRightCollapse() {
    rightPanelCollapsed.value = !rightPanelCollapsed.value
    rightPanelWidth.value = rightPanelCollapsed.value ? 0 : 256
  }

  return {
    leftPanelWidth,
    rightPanelWidth,
    leftPanelCollapsed,
    rightPanelCollapsed,
    toggleLeftCollapse,
    toggleRightCollapse
  }
})
