import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as monacoEditorPluginModule from 'vite-plugin-monaco-editor'
const monacoEditorPlugin = (monacoEditorPluginModule as any).default ?? monacoEditorPluginModule
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    // Bundles Monaco workers locally so it works in Electron without CDN
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json'],
    }),
  ],
  // Critical: Electron loads the built HTML via file:// so paths must be relative
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true, // fail immediately instead of silently switching ports
  },
})
