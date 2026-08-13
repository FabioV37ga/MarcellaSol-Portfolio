import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        admin: resolve(__dirname, 'src/admin.html'),
        projects: resolve(__dirname, 'src/projects.html'),
      }
    }
  },
  server: {
    port: 8080,
    open: true,
  },
  preview: {
    // Allow Render's host so `vite preview` accepts requests to that hostname, also, localhost for local testing
    allowedHosts: ['localhost'],
  },
});
