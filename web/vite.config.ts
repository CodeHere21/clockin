import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from 'vite'

/**
 * An installed PWA caches its own code, so "which build am I looking at?" is a real
 * question you otherwise cannot answer without uninstalling. The footer shows this.
 *
 * In CI the workflow writes VITE_BUILD_SHA before the build, because the Static Web
 * Apps action builds inside its own container where git may not be available.
 * Locally we just ask git. Neither working is survivable — it falls back to "dev".
 */
function buildSha(fromEnv: string | undefined): string {
  if (fromEnv) return fromEnv.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __BUILD_SHA__: JSON.stringify(buildSha(env.VITE_BUILD_SHA)),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
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
  }
})
