<!-- components/Header.vue -->
<template>
  <header class="h-12 bg-gray-8 dark:bg-gray-2 flex items-center px-4">
    <!-- Logo / App Name -->
    <div class="text-xl font-semibold text-gray-1 dark:text-gray-9 mr-8">
      Dashboard
    </div>

    <!-- Example Menus -->
    <nav class="flex space-x-4 relative" @click.outside="closeAllMenus()">
      <div 
        v-for="item in menus" 
        :key="item.label" 
        class="relative"
      >
        <!-- Hover or click to open menu -->
        <button
          class="bg-gray-9 dark:bg-gray-4 rounded-lg hover:text-white dark:hover:text-gray-1 text-gray-3 dark:text-gray-7 px-2 py-1 transition-colors duration-200"
          @click="toggleMenu(item.label)"
        >
          {{ item.label }}
        </button>
        <transition name="fade">
          <ul
            v-if="openMenu === item.label"
            class="absolute top-full left-0 w-32 bg-gray-7 dark:bg-gray-3 rounded shadow-lg py-1 z-50"
          >
            <li
              v-for="sub in item.subItems"
              :key="sub.label"
              class="px-2 py-1 text-sm text-gray-2 dark:text-gray-8 hover:bg-gray-6 dark:hover:bg-gray-4 cursor-pointer transition-colors duration-200"
              @click="handleMenuAction(sub.action)"
            >
              {{ sub.label }}
            </li>
          </ul>
        </transition>
      </div>
    </nav>

    <!-- Right side quick actions -->
    <div class="ml-auto flex space-x-2">
      <button
        class="bg-blue-6 dark:bg-blue-5 hover:bg-blue-7 dark:hover:bg-blue-6 text-white px-3 py-1 rounded transition-colors duration-200"
        @click="onSliceClick"
      >
        Slice
      </button>
      <button
        class="bg-gray-7 dark:bg-gray-5 hover:bg-gray-6 dark:hover:bg-gray-4 text-white px-3 py-1 rounded transition-colors duration-200"
        @click="toggleColorMode"
      >
        <!-- {{ colorMode.preference }} -->
        {{ colorMode.preference === 'dark' ? 'Light Mode' : 'Dark Mode' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useSlicingStore } from '~/store/useSlicingStore'
import { useFileImport } from '~/composables/useFileImport'
import { useColorMode } from '#imports' // or '#color-mode' in older docs


const slicingStore = useSlicingStore()
const { importModel } = useFileImport()

const openMenu = ref(null)
const colorMode = useColorMode()

const menus = [
  {
    label: 'File',
    subItems: [
      { label: 'Import Model', action: 'import' },
      { label: 'Save Project', action: 'save' },
      { label: 'Export...', action: 'export' }
    ]
  },
  {
    label: 'Edit',
    subItems: [
      { label: 'Undo', action: 'undo' },
      { label: 'Redo', action: 'redo' }
    ]
  },
  {
    label: 'Help',
    subItems: [
      { label: 'Documentation', action: 'help-docs' },
      { label: 'About', action: 'help-about' }
    ]
  }
]

function toggleMenu(label) {
  openMenu.value = (openMenu.value === label) ? null : label
}

function closeAllMenus() {
  openMenu.value = null
}

function handleMenuAction(action) {
  closeAllMenus()
  switch (action) {
    case 'import': onImportModel(); break
    case 'save': alert('Project saved (mock).'); break
    case 'export': alert('Export file (mock).'); break
    case 'undo': alert('Undo (mock).'); break
    case 'redo': alert('Redo (mock).'); break
    case 'help-docs': alert('Show help docs (mock).'); break
    case 'help-about': alert('Show about info (mock).'); break
  }
}

function onImportModel() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.stl,.obj'
  input.onchange = e => {
    const file = e.target.files[0]
    if (file) importModel(file)
  }
  input.click()
}

function onSliceClick() {
  slicingStore.startSlicing()
}


function toggleColorMode() {
  colorMode.preference = (colorMode.preference === 'dark') ? 'light' : 'dark'
}
</script>

<style scoped>
/* Fade Transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Dropdown Menu Scrollbar (Optional Enhancement) */
ul {
  scrollbar-width: thin;
  scrollbar-color: #a1a1aa transparent; /* Light mode scrollbar */
}
.dark-mode ul {
  scrollbar-color: #4b5563 transparent; /* Dark mode scrollbar */
}

ul::-webkit-scrollbar {
  width: 6px;
}
ul::-webkit-scrollbar-track {
  background: transparent;
}
ul::-webkit-scrollbar-thumb {
  background-color: #a1a1aa; /* Light mode scrollbar thumb */
  border-radius: 3px;
}
.dark-mode ul::-webkit-scrollbar-thumb {
  background-color: #4b5563; /* Dark mode scrollbar thumb */
}

/* Optional: Smooth background transitions */
header, button, ul li {
  transition: background-color 0.3s, color 0.3s;
}
</style>
