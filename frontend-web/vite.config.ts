import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

function resolveElementPlusChunk(id: string) {
  const componentMatch = id.match(/element-plus\/(?:es|lib)\/components\/([^/]+)\//)
  const componentName = componentMatch?.[1]

  if (componentName) {
    if (['button', 'checkbox', 'form', 'input', 'input-number', 'option', 'radio', 'select', 'slider'].includes(componentName)) {
      return 'vendor-ep-form'
    }

    if (['empty', 'pagination', 'progress', 'table', 'tag', 'timeline'].includes(componentName)) {
      return 'vendor-ep-data'
    }

    if (['dialog', 'dropdown', 'loading', 'message', 'message-box', 'overlay', 'popper', 'tooltip'].includes(componentName)) {
      return 'vendor-ep-overlay'
    }

    if (['col', 'collapse', 'icon', 'menu', 'row', 'scrollbar', 'tab-pane', 'tabs'].includes(componentName)) {
      return 'vendor-ep-nav'
    }

    return 'vendor-ep-misc'
  }

  if (id.includes('/icons-vue/')) return 'vendor-ep-icons'
  if (id.includes('/locale/')) return 'vendor-ep-locale'

  return 'vendor-ep-core'
}

function resolveEchartsChunk(id: string) {
  if (id.includes('/zrender/')) return 'vendor-echarts-zrender'
  if (id.includes('/echarts/lib/chart/')) return 'vendor-echarts-charts'
  if (id.includes('/echarts/lib/component/')) return 'vendor-echarts-components'
  if (id.includes('/echarts/lib/renderer/') || id.includes('/echarts/renderers.js')) return 'vendor-echarts-renderers'
  if (id.includes('/echarts/lib/core/') || id.includes('/echarts/lib/export/core.js') || id.includes('/echarts/core.js')) {
    return 'vendor-echarts-core'
  }
  if (
    id.includes('/echarts/lib/animation/')
    || id.includes('/echarts/lib/coord/')
    || id.includes('/echarts/lib/data/')
    || id.includes('/echarts/lib/label/')
    || id.includes('/echarts/lib/layout/')
    || id.includes('/echarts/lib/model/')
    || id.includes('/echarts/lib/preprocessor/')
    || id.includes('/echarts/lib/processor/')
    || id.includes('/echarts/lib/scale/')
    || id.includes('/echarts/lib/util/')
    || id.includes('/echarts/lib/view/')
    || id.includes('/echarts/lib/visual/')
  ) {
    return 'vendor-echarts-engine'
  }

  return 'vendor-echarts-misc'
}

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')
          if (!normalizedId.includes('node_modules')) return

          if (normalizedId.includes('/echarts/') || normalizedId.includes('/zrender/')) {
            return resolveEchartsChunk(normalizedId)
          }

          if (normalizedId.includes('/markdown-it/')) return 'vendor-markdown'
          if (normalizedId.includes('/element-plus/') || normalizedId.includes('/@element-plus/')) {
            return resolveElementPlusChunk(normalizedId)
          }

          if (normalizedId.includes('/vue/') || normalizedId.includes('/pinia/') || normalizedId.includes('/vue-router/')) {
            return 'vendor-vue'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
