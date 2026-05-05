import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@framework/renderer': resolve(__dirname, '../../packages/renderer/src'),
      '@framework/types': resolve(__dirname, '../../packages/types/src'),
    },
  },
  server: { port: 3001 },
})
