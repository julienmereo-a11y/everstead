import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 4173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    host: true,
    port: 4173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})
