import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
        target: 'http://localhost:3230',
        changeOrigin: true,
      }
    }
  },
})
