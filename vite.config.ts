/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Percorso in cui l'app viene pubblicata. In locale è "/"; su GitHub Pages
  // (https://paolos979.github.io/gym-tracker/) lo imposta la pubblicazione automatica.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // Rende l'app installabile e utilizzabile offline.
    VitePWA({
      // Quando pubblichi una nuova versione, l'app si aggiorna da sola al riavvio.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Gym Tracker',
        short_name: 'Gym',
        description: 'Registro allenamenti con suggerimenti di progressione',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0d10',
        theme_color: '#0b0d10',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Salva nella cache del telefono tutti i file dell'app: così funziona senza rete.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  test: {
    // I test girano in Node; il database viene simulato con fake-indexeddb.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
