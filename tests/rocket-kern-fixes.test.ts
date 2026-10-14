import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import { withUnits } from '../src/rocket/format';
import { forTouch } from '../src/rocket/touch';
import { missionSteps } from '../src/rocket/mission';
import { EUROPA, GAME_EARTH, MARS } from '../src/rocket/world';

const kinds = (f: Flight, target: string, land: boolean): string[] =>
  missionSteps({ target: target as never, land, home: false }, f).map((s) =>
    s.kind === 'transfer' || s.kind === 'capture' || s.kind === 'return'
      ? `${s.kind}:${'to' in s ? s.to.id : s.at.id}`
      : s.kind,
  );

describe('Raketenkern: Befunde', () => {
  it('ein seitliches Satellitenpaar wird als zwei Satelliten ausgesetzt', () => {
    const f = new Flight(['kapsel', 'tank-s', 'falke', 'satellit@1.6']);
    f.placeInOrbit(GAME_EARTH, 600_000, 0);
    expect(f.satellitesOnBoard).toBe(2);
    const mass = f.mass;
    expect(f.deploySatellite()).toBe(true);
    expect(f.satellitesOnBoard).toBe(1);
    expect(f.deploySatellite()).toBe(true);
    expect(f.satellitesOnBoard).toBe(0);
    expect(f.satellites).toHaveLength(2);
    expect(mass - f.mass).toBeCloseTo(1000, -1);
  });

  it('die Absturzmeldung des Teleskops sagt „Es“', () => {
    const f = new Flight(['teleskop', 'sonde-xl', 'tank-m', 'falke']);
    f.placeInOrbit(GAME_EARTH, 600_000, 0);
    f.vx *= 0.5;
    f.vy *= 0.5;
    f.deploySatellite();
    const text = f.events.map((e) => e.text).join(' ');
    expect(text).toContain('Es stürzt ab');
  });

  it('Aufprallmeldung empfiehlt Landebeine nur, wenn sie mehr aushalten', () => {
    const f = new Flight(['kapsel', 'airbags', 'tank-s', 'falke']);
    expect(f.safeLandingSpeed).toBe(20);
    f.placeInOrbit(GAME_EARTH, 100_000, 0);
    f.vx *= 0.1;
    f.vy *= 0.1;
    for (let i = 0; i < 60 * 3000 && f.status === 'flying'; i++) f.update(1 / 20);
    expect(f.status).toBe('crashed');
    expect(f.crashReason).not.toContain('Landebeinen');
  });

  it('Mission Erde von einer Marsbahn: kein Einschwenken in die Luft', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    f.placeInOrbit(MARS, 200_000, 0);
    const k = kinds(f, 'earth', true);
    expect(k).toContain('transfer:earth');
    expect(k).not.toContain('capture:earth');
    expect(k.at(-1)).toBe('reentry');
  });

  it('Mission von einer Mondbahn zu einem anderen Mond fährt erst zum Planeten', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    f.placeInOrbit(EUROPA, 50_000, 0);
    expect(kinds(f, 'ganymede', true)).toEqual([
      'ascent',
      'circularize',
      'return:jupiter',
      'cruise',
      'capture:jupiter',
      'transfer:ganymede',
      'cruise',
      'capture:ganymede',
      'land',
    ]);
  });

  it('die Lageregelung schwingt nicht: Die Drehrate beruhigt sich', () => {
    for (const parts of [
      ['kapsel', 'tank-s', 'falke'],
      ['kapsel', 'rad', 'rad', 'tank-s', 'falke'],
    ]) {
      const f = new Flight(parts);
      f.placeInOrbit(GAME_EARTH, 300_000, 0);
      f.sas = 'prograde';
      for (let i = 0; i < 60 * 30; i++) f.update(1 / 60);
      let peak = 0;
      for (let i = 0; i < 60 * 5; i++) {
        f.update(1 / 60);
        peak = Math.max(peak, Math.abs(f.angVel));
      }
      expect(peak, parts.join()).toBeLessThan(0.005);
    }
  });

  it('Touch-Meldungen nennen keine Tasten, auch nicht die Leertaste', () => {
    expect(forTouch('Tank leer! Nächste Stufe zünden (Leertaste).')).toBe(
      'Tank leer! Nächste Stufe zünden.',
    );
    expect(forTouch('Den Rest mit RCS (R) heranfahren.')).toBe('Den Rest mit RCS heranfahren.');
  });

  it('Zahl und Einheit bleiben in Meldungen zusammen', () => {
    expect(withUnits('Aufprall mit 39 m/s auf 73 km Höhe, 2 kg, 25 °C, Pe 5 m.')).toBe(
      'Aufprall mit 39\u00a0m/s auf 73\u00a0km Höhe, 2\u00a0kg, 25\u00a0°C, Pe 5\u00a0m.',
    );
    expect(withUnits('12 Minuten, 3 mal, 4 Tage')).toBe('12 Minuten, 3 mal, 4 Tage');
  });
});
