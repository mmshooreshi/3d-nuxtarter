// composables/useToast.js
import { ref } from 'vue'

let counter = 0
const toasts = ref([])

export function useToast() {
  function showToast(message, type = 'info', duration = 3000) {
    const id = ++counter
    toasts.value.push({ id, message, type })
    
    // auto-remove after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    showToast,
    removeToast
  }
}
