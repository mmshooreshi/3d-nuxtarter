// composables/useSceneManager.js
import { onMounted, onBeforeUnmount } from 'vue'

export function useSceneManager(canvasRef) {
  let engine = null
  let scene = null
  let camera = null

  onMounted(() => {
    if (!canvasRef.value) return
    // Initialize your 3D engine here (Three.js or Babylon.js)
    // For now, it’s a mock
    console.log('Scene Manager mounted -> init 3D engine (mock)')
  })

  onBeforeUnmount(() => {
    if (engine) {
      // engine.dispose() or equivalent
      engine = null
    }
  })

  // Example methods
  function loadModel(geometry) {
    // Convert geometry to a 3D mesh and add to scene
  }

  function setCameraMode(mode) {
    // Switch between orthographic / perspective
  }

  return {
    loadModel,
    setCameraMode
  }
}
