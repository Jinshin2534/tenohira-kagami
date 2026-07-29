import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5360, host: true },
  preview: { port: 5360 },
  // WebLLM / MediaPipe は wasm を使うので最適化対象から外す
  optimizeDeps: { exclude: ['@mlc-ai/web-llm'] },
  worker: { format: 'es' },
})
