import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Vite configuration options
  root: '.', // index.html is in the root
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
