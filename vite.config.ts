import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  plugins: [
    babel()
  ]
});
