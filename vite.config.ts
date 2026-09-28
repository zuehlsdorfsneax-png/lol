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

/**
 * Veröffentlichte Seite (Modus "artifact"): Die Plattform legt selbst ein HTML-Gerüst mit
 * Zeichensatz und Viewport um die Seite. Deshalb nur Titel, Skripte, Stylesheets und den Inhalt
 * ausgeben – kein zweites <html>/<head>/<body>, keine Links auf Symbol und Manifest (die dort
 * nicht mitveröffentlicht werden).
 */
function artifactPage(): Plugin {
  return {
    name: 'artifact-page',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const title = /<title>[\s\S]*?<\/title>/.exec(html)?.[0] ?? '';
        const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
        const body = /<body>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? '';
        const assets = [
          ...(head.match(/<script\b[^>]*><\/script>/g) ?? []),
          ...(head.match(/<link\b[^>]*rel="(?:stylesheet|modulepreload)"[^>]*>/g) ?? []),
        ];
        return [title, ...assets, body.trim()].join('\n') + '\n';
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  // Modus "artifact": eine einzelne Seite mit eingebetteten Schriften, z. B. zum Teilen als Link.
  const artifact = mode === 'artifact';
  return {
    // Relative Pfade, damit der Build auch in Unterverzeichnissen (z. B. GitHub Pages) läuft.
    base: './',
    plugins: artifact ? [woff2Only(), artifactPage()] : [woff2Only()],
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
