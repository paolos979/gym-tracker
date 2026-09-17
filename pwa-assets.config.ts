import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Genera le icone PNG (iPhone, Android, favicon) a partire da public/icon.svg.
// Comando: npm run icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Sfondo scuro al posto del bianco predefinito per l'icona di iPhone.
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0b0d10', fit: 'contain' } },
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0b0d10', fit: 'contain' } },
  },
  images: ['public/icon.svg'],
})
