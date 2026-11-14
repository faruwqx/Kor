import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './': derlenen klasör herhangi bir adreste veya alt klasörde çalışır.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
