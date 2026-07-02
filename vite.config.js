import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',     // new versions install + activate without manual cache clearing
      injectRegister: 'auto',          // plugin injects the SW registration script
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Everstead',
        short_name: 'Everstead',
        description: 'Your accounts, documents, and wishes — organised for life, ready for your family.',
        theme_color: '#0d1628',
        background_color: '#0d1628',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        categories: ['lifestyle', 'productivity', 'finance'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell so the SPA loads instantly and offline.
        // Large marketing images are EXCLUDED — they'd silently download megabytes
        // to every visitor's service worker; the browser cache handles them fine.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        globIgnores: ['**/hero-*', '**/og-image*', '**/founder*', '**/*banner*'],
        additionalManifestEntries: [
          { url: '/logo-v2-dark.png', revision: null },
          { url: '/logo-v2-white.png', revision: null },
          { url: '/pwa-192x192.png', revision: null },
          { url: '/pwa-512x512.png', revision: null },
          { url: '/pwa-maskable-512x512.png', revision: null },
          { url: '/apple-touch-icon.png', revision: null },
          { url: '/favicon.png', revision: null },
        ],
        // SPA fallback: any uncached navigation serves index.html so client-side
        // routing keeps working offline (the in-app OfflineBanner shows the state).
        navigateFallback: '/index.html',
        // Don't let the SW intercept API routes — always hit the network.
        navigateFallbackDenylist: [/^\/api\//],
        // Pull in the push-notification scaffold (listeners only — see public/sw-push.js).
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Lets us verify the SW + manifest register while running `vite dev`.
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    host: true,
    port: 4173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    host: true,
    port: 4173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})
