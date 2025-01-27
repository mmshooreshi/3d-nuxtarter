// plugins/toaster.client.js
import { defineNuxtPlugin } from '#app'
import { createToaster } from '@meforma/vue-toaster' // or any toaster library

export default defineNuxtPlugin((nuxtApp) => {
  const toaster = createToaster({
    position: 'bottom-right',
    duration: 1000
  })
  return {
    provide: {
      toast: toaster
    }
  }
})
