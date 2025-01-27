<template>
    <aside 
      :class="[
        'h-full bg-gray-8 flex flex-col items-center py-2 transition-all duration-300',
        uiStore.leftPanelCollapsed ? 'w-14' : 'w-42'
      ]"
    >
      <!-- Example tool buttons -->
      <div
        v-for="btn in toolButtons"
        :key="btn.tool"
        class="group relative w-full flex items-center justify-start my-2 group ml-4"
      >
        <button
          class="w-10 min-w-10 h-10 flex items-center justify-center rounded group-hover:bg-blue-800 transition-colors"
          :class="activeTool === btn.tool ? 'bg-blue-7' : 'bg-black'"
          @click="activateTool(btn.tool)"
          :title="btn.label"
        >
          <i :class="[btn.icon, 'text-gray-3 text-xl']"></i>
        </button>
        <div v-show="!uiStore.leftPanelCollapsed" class="cursor-pointer text-small text-nowrap mx-2 rounded group-hover:text-blue-100 transition-colors" :class="activeTool === btn.tool ? 'text-white' : 'text-gray-4'" @click="activateTool(btn.tool)">
            {{btn.label}}
        </div>
        <!-- If collapsed, show a tooltip on hover -->
        <div
          v-if="uiStore.leftPanelCollapsed"
          class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-1 py-1 bg-black text-white text-xs rounded
                 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
        >
          {{ btn.label }}
        </div>
      </div>
  
      <!-- Collapse Toggle -->
      <button
        class="mt-auto mb-2 bg-gray-7 hover:bg-gray-6 text-white px-2 py-1 text-sm rounded"
        @click="uiStore.toggleLeftCollapse"
      >
        {{ uiStore.leftPanelCollapsed ? '❯' : '❮' }}
      </button>
    </aside>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { useUIStore } from '~/store/useUIStore'
  import { useToolStore } from '~/store/useToolStore'  // NOW we import from the new file
  import { useNuxtApp } from '#app'

  const { $toast } = useNuxtApp() // get global toaster

  const uiStore = useUIStore()
  const toolStore = useToolStore()
  
  const activeTool = computed(() => toolStore.activeTool)
  
  const toolButtons = [
    { tool: 'select', label: 'Select Tool', icon: 'fas fa-mouse-pointer' },
    { tool: 'move', label: 'Move Tool', icon: 'fas fa-arrows-alt' },
    { tool: 'rotate', label: 'Rotate Tool', icon: 'fas fa-sync-alt' },
    { tool: 'scale', label: 'Scale Tool', icon: 'fas fa-expand-arrows-alt' },
    { tool: 'auto-support', label: 'Auto Support', icon: 'fas fa-cogs' },
  ]
    
  function activateTool(tool) {
  toolStore.activeTool = tool
  // no more alert!
  $toast.info(`Tool activated: ${tool}`, { type: 'success' })

}

  </script>
  