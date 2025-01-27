<!-- app.vue -->
<template>
  <NuxtPage />
  <!-- Toast container in the top-right corner -->
  <div class="fixed top-0 right-0 p-4 space-y-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="bg-gray-7 text-white px-3 py-2 rounded shadow-md"
    >
      {{ toast.message }}
    </div>
  </div>
</template>


<script setup lang="ts">
import '@unocss/reset/tailwind-compat.css'
import { useToast } from '~/composables/useToast'
const { toasts } = useToast()
</script>


<style>

/* global.css */
.c-toast {
  padding: 5px !important;
  min-height: 1em !important;
}
</style>