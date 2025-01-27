<!-- components/ColorModeToggle.vue -->
<template>
    <button
      @click="toggleColorMode"
      class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2 rounded transition-colors duration-200"
    >
      {{ colorMode.preference === 'dark' ? 'Light Mode' : 'Dark Mode' }}
    </button>
  </template>
  
  <script setup>
  const colorMode = useColorMode()
  
  const toggleColorMode = () => {
    console.log(colorMode.preference)
    if (colorMode.preference === 'dark') {
      colorMode.preference = 'light'
    } else {
      colorMode.preference = 'dark'
    }
  }
  </script>
  
  <style scoped>
  /* Optional: Add component-specific styles */
  </style>
  