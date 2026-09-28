import { describe, expect, it } from 'vitest';

// Windows unterscheidet Groß- und Kleinschreibung in Dateinamen nicht. Zwei Module wie
// `Navball.tsx` und `navball.ts` gehen unter Linux durch, brechen aber den Bau der EXE.
const files = Object.keys(import.meta.glob(['/src/**/*.{ts,tsx}', '/tests/**/*.ts']));

describe('Dateinamen', () => {
  it('unterscheiden sich nicht nur in der Groß- und Kleinschreibung', () => {
    expect(files.length).toBeGreaterThan(50);
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const file of files) {
      const key = file.replace(/\.tsx?$/, '').toLowerCase();
      const other = seen.get(key);
      if (other) clashes.push(`${other} ↔ ${file}`);
      else seen.set(key, file);
    }
    expect(clashes).toEqual([]);
  });
});
