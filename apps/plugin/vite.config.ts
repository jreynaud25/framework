import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'

/**
 * Figma plugins ship two artifacts:
 *   - dist/code.js   — sandbox code (no DOM access, CommonJS for Figma)
 *   - dist/ui.html   — single-file UI loaded into Figma's iframe
 *
 * Selected via the FW_BUILD_TARGET env var:
 *   FW_BUILD_TARGET=code → bundles src/code.ts → dist/code.js
 *   FW_BUILD_TARGET=ui   → bundles src/ui/index.html → dist/ui.html
 *
 * The package.json `build` script runs both passes.
 */
const target = process.env.FW_BUILD_TARGET ?? 'code'

export default target === 'ui'
  ? defineConfig({
      plugins: [viteSingleFile()],
      root: resolve(__dirname, 'src/ui'),
      build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: false,
        rollupOptions: { input: resolve(__dirname, 'src/ui/index.html') },
        assetsInlineLimit: 100_000_000,
      },
    })
  : defineConfig({
      build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/code.ts'),
          formats: ['cjs'],
          fileName: () => 'code.js',
        },
        rollupOptions: { output: { exports: 'none' } },
        target: 'es2017',
        minify: false,
      },
    })
