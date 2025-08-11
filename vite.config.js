// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    legacy({ targets: ['defaults', 'not IE 11'], modernPolyfills: true }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    hmr: { protocol: 'ws', host: 'localhost' },
    proxy: {
      // Allt under /api går direkt till backend på 5050
      '/api': { target: 'http://localhost:5050', changeOrigin: true, secure: false },

      // Gamla/fel vägar → mappa om till rätt /api-endpoints
      '/status':  {
        target: 'http://localhost:5050',
        changeOrigin: true, secure: false,
        rewrite: p => p.replace(/^\/status/, '/api/status'),
      },
      '/balance': {
        target: 'http://localhost:5050',
        changeOrigin: true, secure: false,
        rewrite: p => p.replace(/^\/balance/, '/api/elekto/balance'),
      },
      '/day':     {
        target: 'http://localhost:5050',
        changeOrigin: true, secure: false,
        // justera om din backend heter något annat
        rewrite: p => p.replace(/^\/day/, '/api/spotprice/day'),
      },
      // (om du har fetch('/spotprice/...') någonstans)
      '/spotprice': {
        target: 'http://localhost:5050',
        changeOrigin: true, secure: false,
      },
    },
  },
})
