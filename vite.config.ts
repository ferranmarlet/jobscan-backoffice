import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api to the JobScan API, so the API needs no CORS configuration.
export default defineConfig(({ mode }) => {
  const { API_URL = 'http://localhost:8080' } = loadEnv(mode, '.', '')
  return {
    plugins: [react()],
    server: {
      proxy: { '/api': { target: API_URL, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') } },
    },
  }
})
