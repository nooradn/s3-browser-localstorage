import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import preact from '@astrojs/preact'

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [preact()],
  vite: {
    optimizeDeps: {
      include: ['@astrojs/preact/server.js', 'preact', 'preact/hooks'],
    },
    ssr: {
      optimizeDeps: {
        include: ['@astrojs/preact/server.js', 'preact', 'preact/hooks'],
      },
    },
  },
})
