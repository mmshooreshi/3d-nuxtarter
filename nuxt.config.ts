// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'
import ViteComponents from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr:true,
  app: {
    head: {
      title: 'A Better Nuxt 3 Starter',
      link: [{ rel: 'icon', type: 'image/*', href: '/favicon.svg' },
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
        }
      ]

      
    }
  },
  
  colorMode: {
    preference: 'system', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '-mode',
    storage: 'localStorage', // or 'sessionStorage' or 'cookie'
    storageKey: 'nuxt-color-mode'
  },


  modules: [
    '@nuxtjs/color-mode',
    '@unocss/nuxt',
    '@pinia/nuxt',
    'unplugin-icons/nuxt',
    '@vueuse/nuxt',
    '@vesp/nuxt-fontawesome',
    
  ],
  vite: {
    plugins: [
      ViteComponents({
        resolvers: [
          IconsResolver({
            componentPrefix: ''
          })
        ],
        dts: true
      })
    ]
  },

  compatibilityDate: '2025-01-25'
})