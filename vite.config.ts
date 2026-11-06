import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { mockApi } from './mockApi'

// Without API_URL, the dev server answers /api itself with mock data.
export default defineConfig(({ mode }) => {
  const { API_URL } = loadEnv(mode, '.', '')
  return {
    plugins: [react(), ...(API_URL ? [] : [mockApi()])],
    server: {
      proxy: API_URL
        ? { '/api': { target: API_URL, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') } }
        : undefined,
    },
  }
})
