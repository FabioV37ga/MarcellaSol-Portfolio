import { defineConfig } from 'vite';
import { resolve } from 'path';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://marcellasol.com.br https://www.marcellasol.com.br http://localhost:3000 http://127.0.0.1:3000 http://*:3000 ws://localhost:8080 ws://127.0.0.1:8080 ws://*:8080",
  "media-src 'self'",
  "worker-src 'self' blob:"
].join('; ');

const securityHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

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
        cliente: resolve(__dirname, 'src/cliente.html'),
        projects: resolve(__dirname, 'src/projects.html'),
      }
    }
  },
  server: {
    port: 8080,
    open: true,
    headers: securityHeaders,
  },
  preview: {
    // Allow Render's host so `vite preview` accepts requests to that hostname, also, localhost for local testing
    allowedHosts: ['localhost'],
    headers: securityHeaders,
  },
});
