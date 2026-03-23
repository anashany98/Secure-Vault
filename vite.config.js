import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

function buildManualChunks(id) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  if (id.includes('crypto-js')) {
    return 'crypto'
  }

  if (id.includes('papaparse')) {
    return 'csv'
  }

  if (id.includes('recharts')) {
    return 'charts'
  }

  if (id.includes('date-fns')) {
    return 'date-utils'
  }

  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: buildManualChunks,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
  server: {
    port: 6060,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3230',
        changeOrigin: true,
      }
    }
  },
})
