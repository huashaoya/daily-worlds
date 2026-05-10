import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/minimax': {
        target: 'https://api.minimaxi.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/minimax/, ''),
      },
      '/api/proxy-image': {
        target: 'https://hailuo-image-algeng-data.oss-cn-wulanchabu.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy-image/, ''),
        secure: false
      },
      '/api/proxy-ark': {
        target: 'https://ark-acg-cn-beijing.tos-cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/proxy-ark/, ''),
        secure: false
      }
    }
  }
})