import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    // Copy Cloudflare Pages routing files into dist on build.
    {
      name: 'cf-pages-files',
      closeBundle() {
        for (const file of ['_headers', '_redirects']) {
          const src = resolve(__dirname, file)
          if (existsSync(src)) copyFileSync(src, resolve(__dirname, 'dist', file))
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@framework/renderer': resolve(__dirname, '../../packages/renderer/src'),
      '@framework/types': resolve(__dirname, '../../packages/types/src'),
    },
  },
  server: { port: 3001 },
})
