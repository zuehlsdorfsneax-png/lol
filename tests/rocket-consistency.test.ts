import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import { G0 } from '../src/rocket/world';
import { PARTS, TEMPLATES } from '../src/rocket/parts';

// Zwei getrennte Rechnungen müssen zusammenpassen: Die Δv-Summe über alle Stufen (Werft, Anzeige)
// und die Brenndauer für ein gegebenes Δv (Bordcomputer, Autopilot). Weicht eine ab, plant der
// Computer an der Wirklichkeit vorbei.
describe('Δv und Brenndauer stimmen überein', () => {
  for (const template of TEMPLATES) {
    it(`Vorlage „${template.name}“`, () => {
      const f = new Flight([...template.parts]);
      const dv = f.deltaV();
      expect(dv).toBeGreaterThan(0);
      expect(Number.isFinite(f.burnTime(dv * 0.98))).toBe(true);
      expect(f.burnTime(dv * 1.02)).toBe(Infinity);
    });
  }
});

// Gegen Eingabefehler in den Teile-Daten: Verhältnisse, die für ein Spielteil unmöglich sind.
describe('Teile-Daten sind plausibel', () => {
  const defs = Object.values(PARTS);

  it('jeder Tank hat zwischen 80 und 97 % Treibstoff am Gesamtgewicht', () => {
    for (const d of defs.filter((p) => p.kind === 'tank' || p.kind === 'booster')) {
      const share = (d.fuel ?? 0) / ((d.fuel ?? 0) + d.dry);
      expect(share, d.id).toBeGreaterThanOrEqual(0.8);
      expect(share, d.id).toBeLessThanOrEqual(0.97);
    }
  });

  it('jedes Triebwerk hat Schub und Isp, Schub-Gewicht-Verhältnis zwischen 1 und 60', () => {
    for (const d of defs.filter((p) => p.kind === 'engine')) {
      expect(d.thrust, d.id).toBeGreaterThan(0);
      expect(d.isp, d.id).toBeGreaterThan(0);
      const twr = d.thrust / (d.dry * G0);
      expect(twr, d.id).toBeGreaterThanOrEqual(1);
      expect(twr, d.id).toBeLessThanOrEqual(60);
    }
  });

  it('jedes Teil hat eine Beschreibung', () => {
    for (const d of defs) expect(d.info?.length ?? 0, d.id).toBeGreaterThan(10);
  });
});
