import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Alle aktuellen Browser können WOFF2. Die älteren Formate (WOFF, TTF) in den Schrift-CSS-Dateien
 * von KaTeX und Fontsource werden entfernt – das halbiert die Schriftdaten.
 */
function woff2Only(): Plugin {
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css') || !id.includes('node_modules')) return null;
      return code.replace(
        /,\s*url\([^)]+\.(?:woff|ttf)\)\s*format\((?:"|')(?:woff|truetype)(?:"|')\)/g,
        '',
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // Modus "artifact": eine einzelne Seite mit eingebetteten Schriften, z. B. zum Teilen als Link.
  const artifact = mode === 'artifact';
  return {
    // Relative Pfade, damit der Build auch in Unterverzeichnissen (z. B. GitHub Pages) läuft.
    base: './',
    plugins: [woff2Only()],
    build: {
      target: 'es2022',
      sourcemap: !artifact,
      outDir: artifact ? 'dist-artifact' : 'dist',
      assetsInlineLimit: artifact ? 100_000_000 : 4096,
      // KaTeX (Formelsatz) macht gut die Hälfte des Bundles aus; gzip-komprimiert sind es ~170 kB.
      chunkSizeWarningLimit: 700,
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
    },
  };
});
