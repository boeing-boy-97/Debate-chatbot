import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Emit to frontend/dist so Vercel's "Root Directory: frontend" +
  // "Output Directory: dist" settings resolve to this folder.
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Accept the sandbox preview host (dev only).
    allowedHosts: true,
    // Forward API calls to the Express backend during development.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
