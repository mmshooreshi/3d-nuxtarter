<template>
    <!-- .dark can be toggled by userPrefs.darkMode, or you can do <html class="dark"> in SSR -->
    <div :class="[
      'min-h-screen flex flex-col transition-colors duration-300',
      $colorMode.preference === 'dark' ? 'dark bg-gray-9 text-gray-2' : 'bg-gray-1 text-gray-8'
    ]">

    <!-- <ColorSchemeWrapper>
    <h1 class="text-gray-1 dark:text-gray-9">Welcome to the Dashboard</h1>
  </ColorSchemeWrapper> -->


      <HeaderBar />
  
      <div class="flex flex-1 overflow-hidden relative">
        <!-- Left Toolbar Panel -->
        <div
          class="h-auto bg-gray-8 flex-shrink-0"
        >
          <LeftToolbar />
        </div>
        <!-- Draggable handle -->
        <div
          class="w-1 bg-gray-7 cursor-col-resize"
          @mousedown.prevent="startDrag('left')"
        ></div>
  
        <div class="relative w-min flex-1 overflow-hidden">
        <!-- Main 3D View -->
        <ModelViewer />
        </div>
  
        <!-- Draggable handle for right panel -->
        <div
          class="w-1 bg-gray-7 cursor-col-resize"
          @mousedown.prevent="startDrag('right')"
        ></div>
        <!-- Right Sidebar -->
        <div
          class=" bg-gray-8 flex-shrink-0"
          :style="{ width: uiStore.rightPanelWidth + 'px' }"
          v-show="uiStore.rightPanelWidth > 0"
        >
          <RightSidebar />
        </div>
      </div>
  
      <BottomBar />
    </div>
  </template>
  
  <script setup>
  import { ref, onBeforeUnmount } from 'vue'
  import { useUIStore } from '~/store/useUIStore'
  import { useUserPrefs } from '~/composables/useUserPrefs'
  
  import HeaderBar from '~/components/HeaderBar.vue'
  import LeftToolbar from '~/components/LeftToolbar.vue'
  import ModelViewer from '~/components/ModelViewer.vue'
  import RightSidebar from '~/components/RightSidebar.vue'
  import BottomBar from '~/components/BottomBar.vue'
  import ColorSchemeWrapper from '~/components/ColorSchemeWrapper.vue'
  import { useColorMode } from '#imports'
  const $colorMode = useColorMode()

  const uiStore = useUIStore()
  const userPrefs = useUserPrefs()
  
  let dragSide = null
  
  function startDrag(side) {
    dragSide = side
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopDrag)
  }
  
  function onMouseMove(e) {
    if (dragSide === 'left') {
      let newWidth = e.clientX
      if (newWidth < 48) newWidth = 48
      if (newWidth > 300) newWidth = 300
      uiStore.leftPanelWidth = newWidth
    } else if (dragSide === 'right') {
      let newWidth = window.innerWidth - e.clientX
      if (newWidth < 0) newWidth = 0
      if (newWidth > 400) newWidth = 400
      uiStore.rightPanelWidth = newWidth
    }
  }
  
  function stopDrag() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopDrag)
    dragSide = null
  }
  
  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopDrag)
  })
  </script>
  
  <style scoped>
  .width-enter-active, .width-leave-active {
    transition: width 0.3s ease;
  }
  .width-enter-from, .width-leave-to {
    width: 0;
  }
  </style>
  