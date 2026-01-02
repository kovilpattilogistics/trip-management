import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path to ensure assets load correctly on GitHub Pages
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    // Correctly define the API key from the environment variables
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});