import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import { VitePWA } from 'vite-plugin-pwa';

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
    babel(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,hbs}']
      },
      manifest: {
        name: 'NeXus SPA',
        short_name: 'NeXus',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          { src: '/public/favicon.ico', sizes: '192x192', type: 'image/x-icon' }
        ]
      }
    })
  ]
});
