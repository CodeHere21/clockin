import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app is fully usable offline: all state is local, nothing is fetched.
      // autoUpdate is safe here because a reload loses nothing — every change is
      // written to localStorage as it happens.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Clockin — work hours tracker',
        short_name: 'Clockin',
        description:
          'Clock in and out, track breaks, and see today and this week against your targets.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#047857',
        background_color: '#fafaf9',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
