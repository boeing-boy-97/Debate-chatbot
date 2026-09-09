import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Emit at the repo root so Vercel (Output Directory = "dist") finds the build
  // whether the command is run from the workspace root or from frontend/.
  build: {
    outDir: path.resolve(__dirname, '../dist'),
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
