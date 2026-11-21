import { spawnSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A rebuild of the same revision should keep the same public update date.
const revisionDate = spawnSync('git', ['log', '-1', '--format=%cs'], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
}).stdout?.trim() || ''

export default defineConfig({
  plugins: [react()],
  base: '/indoor-thermal-physiology-metadata-atlas/',
  define: { 'import.meta.env.VITE_ATLAS_UPDATED_ON': JSON.stringify(revisionDate) },
})
