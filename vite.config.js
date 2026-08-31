import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

const isCapacitorBuild = process.env.CAP_BUILD === '1'
// The on-screen error catcher below is a DEBUG tool. It must never ship in a build
// that reaches real users — a raw red stack trace is the last thing someone
// organising their estate should ever see, and the app's ErrorBoundary already
// shows a calm fallback. Opt in explicitly: `npm run build:cap:debug`.
const isCapacitorDebug = isCapacitorBuild && process.env.CAP_DEBUG === '1'
const port = process.env.PORT ? Number(process.env.PORT) : 4173

// In the native (Capacitor) build, strip the web-only marketing/consent/analytics
// tags from index.html. Cookiebot (auto blocking mode), Google Tag Manager and the
// Meta Pixel must never run inside the WKWebView — Cookiebot can't verify the
// capacitor://localhost origin and can defer other scripts, which blanks the app.
// SAFE error surface (native only, temporary): shows real uncaught JS exceptions /
// rejections on screen. Uses NO capture phase, so a mere resource 404 (e.g. a font)
// will NOT trigger it — only genuine app crashes.
const NATIVE_ERROR_CATCHER = `<script>(function(){function show(l,e){try{var m=((e&&e.message)?e.message+'\\n\\n':'')+((e&&e.stack)||String(e));var d=document.getElementById('__fatal__');if(!d){d=document.createElement('div');d.id='__fatal__';d.style.cssText='position:fixed;inset:0;z-index:99999;background:#0d1628;color:#fca5a5;font:12px/1.5 monospace;padding:24px;padding-top:max(env(safe-area-inset-top),70px);overflow:auto;white-space:pre-wrap;-webkit-user-select:text';(document.body||document.documentElement).appendChild(d);d.onclick=function(){d.remove()};}d.textContent='\\u26A0\\uFE0F '+l+'  (tap to dismiss)\\n\\n'+m;}catch(x){}}window.addEventListener('error',function(e){if(e.error||typeof e.message==='string')show('error',e.error||e.message);});window.addEventListener('unhandledrejection',function(e){show('unhandledrejection',e.reason);});})();</script>`

function stripWebOnlyTagsForNative() {
  return {
    name: 'strip-web-only-tags-for-native',
    transformIndexHtml(html) {
      if (!isCapacitorBuild) return html
      return html
        .replace(/<script[^>]*data-cbid[^>]*>[\s\S]*?<\/script>/g, '')          // Cookiebot CMP
        .replace(/<script[^>]*data-cookieconsent[^>]*>[\s\S]*?<\/script>/g, '')  // consent-gated scripts (GA, pixel, consent-mode defaults)
        .replace(/<script[^>]*googletagmanager[^>]*>[\s\S]*?<\/script>/g, '')    // GA loader
        .replace(/<noscript>\s*<img[^>]*facebook\.com\/tr[^>]*>\s*<\/noscript>/g, '') // Meta Pixel noscript
        // Native shell: forbid zoom. iOS auto-zooms on input focus and the zoom
        // STICKS — the whole app ends up cropped and panned under the status bar.
        // Standard for Capacitor apps; the website keeps pinch-zoom (a11y).
        .replace(/<meta name="viewport"[^>]*\/?>/,
          '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />')
        .replace('</head>', `${isCapacitorDebug ? NATIVE_ERROR_CATCHER : ''}</head>`)
    },
  }
}

// Everything in public/ is copied into the bundle, and for a Capacitor build the
// bundle IS the app download. The marketing hero video is web-only (native opens
// MobileApp, never the marketing Home), so shipping it just made every install
// tens of megabytes heavier for a file the app can never play. Drop web-only
// heavy media from native builds; the website keeps all of it.
const WEB_ONLY_MEDIA = [/\.mp4$/i]

function dropWebOnlyMediaFromNative() {
  return {
    name: 'drop-web-only-media-from-native',
    apply: 'build',
    // closeBundle, not generateBundle: public/ files are copied straight to the
    // output directory and never enter the rollup bundle graph.
    async closeBundle() {
      if (!isCapacitorBuild) return
      const outDir = path.resolve('dist')
      let entries = []
      try { entries = await fs.readdir(outDir) } catch { return }
      for (const name of entries) {
        if (!WEB_ONLY_MEDIA.some(re => re.test(name))) continue
        await fs.rm(path.join(outDir, name), { force: true })
        console.log(`[native build] dropped web-only asset: ${name}`)
      }
    },
  }
}

// On-device build marker. This used to be a string somebody had to remember to
// edit, so it sat reading "2026-08-12 · build 41" for two weeks and told you
// nothing about what was actually running. Now it is stamped at build time, so
// the number on the Settings screen is always the bundle in front of you and a
// stale Xcode build is obvious.
const gitSha = (() => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() }
  catch { return 'nogit' }
})()
const BUILD_MARKER = `${new Date().toISOString().slice(0, 10)} · ${gitSha}`

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(BUILD_MARKER),
  },
  plugins: [
    react(),
    stripWebOnlyTagsForNative(),
    dropWebOnlyMediaFromNative(),
    // Skipped for the Capacitor build: the PWA service worker's own offline
    // caching would otherwise fight with Capacitor's local-file serving of
    // the bundled app (stale-cache-after-native-update class of bug).
    !isCapacitorBuild && VitePWA({
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
  // Native build: bundle everything into a single file (no code-split chunks).
  // Dynamic-import chunks can fail to load over the capacitor://localhost scheme
  // in the iOS WKWebView, which surfaces as a blank/white screen after launch.
  // Inlining removes that whole failure class. The web build keeps code-splitting.
  build: isCapacitorBuild
    ? { rollupOptions: { output: { inlineDynamicImports: true } } }
    : {},
  server: {
    host: true,
    port,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    host: true,
    port,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})
