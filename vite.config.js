import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, strictPort: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Mantém caminhos previsíveis para o Service Worker em ambiente estático.
    assetsDir: 'assets',
  },
});

