import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative Pfade, damit der Build auch in Unterverzeichnissen (z. B. GitHub Pages) läuft.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
