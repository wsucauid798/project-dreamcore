import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      // Allow serving large .splat files from public/
      strict: false,
    },
  },
  // Splats can be many MB; warn at 4MB chunks instead of erroring
  build: {
    chunkSizeWarningLimit: 4096,
    assetsInlineLimit: 0,
  },
  // Pre-bundle three.js + r3f for faster cold starts
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@mkkellogg/gaussian-splats-3d',
      'zustand',
    ],
    exclude: [],
  },
})
