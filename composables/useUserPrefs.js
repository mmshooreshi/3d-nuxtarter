// src/composables/useUserPrefs.js

import { ref, watch, onMounted } from 'vue'

export function useUserPrefs() {
  const darkMode = ref(false)

  // Initialize dark mode based on localStorage or system preference
  onMounted(() => {
    const storedPreference = localStorage.getItem('darkMode')
    if (storedPreference !== null) {
      darkMode.value = JSON.parse(storedPreference)
    } else {
      // Fallback to system preference
      darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    // Apply the initial dark mode class
    updateDarkClass(darkMode.value)
  })

  // Watch for changes in darkMode and update the class and localStorage
  watch(darkMode, (newVal) => {
    updateDarkClass(newVal)
    localStorage.setItem('darkMode', JSON.stringify(newVal))
  })

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
  }

  function updateDarkClass(isDark) {
    const htmlElement = document.documentElement
    if (isDark) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  }

  return {
    darkMode,
    toggleDarkMode
  }
}
