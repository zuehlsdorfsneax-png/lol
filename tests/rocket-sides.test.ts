import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import {
  checkDesign,
  copies,
  designHeight,
  isPart,
  part,
  sideEntry,
  sideOf,
  stageStats,
  totalMass,
} from '../src/rocket/parts';
import { EARTH } from '../src/rocket/world';

function run(f: Flight, seconds: number): void {
  for (let i = 0; i < seconds * 60 && f.status !== 'crashed'; i++) f.update(1 / 60);
}

describe('Seitlich angebaute Teile (Paare)', () => {
  it('Einträge „id@x“ sind gültige Teile mit Abstand, ungültige nicht', () => {
    expect(isPart('tank-m@1.7')).toBe(true);
    expect(sideOf('tank-m@1.7')).toBe(1.7);
    expect(copies('tank-m@1.7')).toBe(2);
    expect(part('tank-m@1.7').id).toBe('tank-m');
    expect(sideOf('tank-m')).toBe(0);
    for (const bad of ['tank-m@', 'tank-m@x', 'tank-m@-2', 'quatsch@2'])
      expect(isPart(bad)).toBe(false);
    expect(sideEntry('tank-s', 2.437)).toBe('tank-s@2.4');
    expect(sideEntry('tank-s', 0)).toBe('tank-s');
  });

  it('zählen doppelt bei Masse, Treibstoff und Schub, aber nicht bei der Höhe', () => {
    const core = ['kapsel', 'tank-l', 'falke'];
    const wide = ['kapsel', 'tank-l', 'tank-s@2.4', 'falke', 'falke@2.4'];
    const a = stageStats(core)[0]!;
    const b = stageStats(wide)[0]!;
    expect(b.fuel - a.fuel).toBe(2 * part('tank-s').fuel);
    expect(b.dry - a.dry).toBe(2 * (part('tank-s').dry + part('falke').dry));
    expect(b.thrust).toBeCloseTo(3 * part('falke').thrust, 6);
    expect(designHeight(wide)).toBe(designHeight(core));
    expect(totalMass(wide) - totalMass(core)).toBe(
      2 * (part('tank-s').dry + part('tank-s').fuel + part('falke').dry),
    );
  });

  it('der Flug rechnet genauso wie die Werft und wird breiter', () => {
    const wide = ['kapsel', 'tank-l', 'tank-s@2.4', 'falke', 'falke@2.4'];
    const f = new Flight(wide);
    expect(f.mass).toBeCloseTo(totalMass(wide), 6);
    expect(f.length).toBeCloseTo(designHeight(wide), 6);
    f.placeInOrbit(EARTH, 400_000, 0);
    expect(f.engine().thrust).toBeCloseTo(3 * part('falke').thrust, 3);
    expect(f.hullDrag(0)).toBeGreaterThan(
      new Flight(['kapsel', 'tank-l', 'falke']).hullDrag(0) * 2,
    );
  });

  it('eine Rakete mit Seitentriebwerken hebt ab und steigt', () => {
    const f = new Flight(['kapsel', 'tank-l', 'tank-s@2.4', 'falke', 'kolibri@2.4']);
    f.throttle = 1;
    run(f, 30);
    expect(f.status).toBe('flying');
    expect(f.air().altitude).toBeGreaterThan(1_000);
  });

  it('der Hitzeschild unten zählt auch, wenn danach ein Seitenteil steht', () => {
    expect(new Flight(['kapsel', 'hitzeschild', 'solar@2']).shieldAtBottom).toBe(true);
  });

  it('es gibt keine Obergrenze für die Zahl der Teile', () => {
    const big = ['kapsel', ...Array<string>(60).fill('tank-s'), 'mammut'];
    expect(checkDesign(big).filter((p) => p.level === 'error')).toEqual([]);
  });
});
