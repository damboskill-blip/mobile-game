import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/mobile-game/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'manifest.webmanifest'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,glb,webmanifest}'],
        runtimeCaching: [{
          urlPattern: /\.(?:glb)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'models', expiration: { maxEntries: 50 } }
        }]
      }
    })
  ],
  server: { host: true }
});
