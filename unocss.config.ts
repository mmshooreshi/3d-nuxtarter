// uno.config.ts
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  presetTypography,
  transformerDirectives,
  transformerVariantGroup,
  presetWind,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    // Custom reusable class shortcuts
    {
      'flex-center': 'flex justify-center items-center',
      'btn-primary': 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition',
      'app-bg': 'bg-gray-900 text-gray-200 dark:bg-white dark:text-gray-200',    
    },
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a', // Example: a custom primary color
        secondary: '#9333ea', // Example: a custom secondary color
        accent: '#f59e0b',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        xl: '1rem',
      },
    },
    colors: {
      brandDark: '#1e1e1e',
      brandAccent: '#00b4ff',
    },  
  },
  presets: [
    presetUno(),
    presetAttributify({
      // Allow only specific attributes if needed
      strict: true,
    }),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetTypography(),
    presetWind(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})