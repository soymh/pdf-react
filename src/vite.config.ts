import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "~/": path.resolve(__dirname, "./"),
    },
  },
  worker: {
    format: 'es',
    plugins: () => [react()]
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-backend-webgpu',
      'pdf-lib'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          tensorflow: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgpu'],
          pdflib: ['pdf-lib'],
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'sonner']
        }
      }
    },
    target: 'esnext'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    fs: {
      allow: ['..']
    }
  }
})