/** Bedienung mit dem Finger: Erkennung und passende Texte. */

/** Gerät mit Finger statt Maus? Dann nennen Tipps keine Tasten. */
export function isTouch(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Tipps für den Touchscreen: Tasten in Klammern („(P)“, „(W / ↑, Z = Vollgas)“, „Taste 3“) fallen
 * weg, einige Sätze bekommen die Knöpfe statt der Tasten.
 */
export function forTouch(text: string): string {
  return text
    .replace(
      'RCS einschalten (R): W/S schieben vor und zurück, Q/E zur Seite.',
      'RCS einschalten: Die Pfeile unten links schieben die Rakete.',
    )
    .replace('Mit N setzt du', 'Mit „Satellit“ setzt du')
    .replace('Zeitraffer hoch (.)', 'Zeitraffer hoch (oben)')
    .replace(/,?\s*Taste \d/g, '')
    .replace(/\s*\(([^()]*)\)/g, (m, inner: string) =>
      inner.replace(/Taste|oder|Vollgas|Umschalt|[A-Z0-9↑↓←→.,/=+<>–-]|\s/g, '') === '' ? '' : m,
    );
}
