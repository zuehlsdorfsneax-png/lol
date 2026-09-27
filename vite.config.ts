import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative Pfade, damit der Build auch in Unterverzeichnissen (z. B. GitHub Pages) läuft.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    // KaTeX (Formelsatz) macht gut die Hälfte des Bundles aus; gzip-komprimiert sind es ~170 kB.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
