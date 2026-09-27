import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' → all asset URLs are RELATIVE. Portals (CrazyGames/Poki) host the
// bundle on their own CDN and reject absolute '/assets/...' paths.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Portals want few files; keep chunks simple. Inline small assets, keep the
    // gzipped dictionary as its own relative file (fetched same-origin at runtime).
    assetsInlineLimit: 4096,
    target: 'es2020',
  },
  test: {
    environment: 'node',
  },
});
