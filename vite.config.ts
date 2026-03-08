import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/mattis-abenteuer/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3001,
    open: true,
    host: '0.0.0.0', // Allow LAN access for multiplayer
  },
});
