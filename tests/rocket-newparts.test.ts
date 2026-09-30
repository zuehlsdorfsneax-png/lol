import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import { PARTS, TEMPLATES, checkDesign, part, stageStats } from '../src/rocket/parts';
import { EARTH, JUPITER, bodyState } from '../src/rocket/world';

const NEW = [
  'sonde-xl',
  'teleskop',
  'fallschirm-s',
  'hitzeschild-xl',
  'tank-sonde-l',
  'adapter',
  'moewe',
  'adler',
  'hermes',
  'herkules',
  'trenner-s',
  'booster-s',
  'booster-fl',
  'beine-s',
  'solar',
  'scheinwerfer',
];

function run(f: Flight, seconds: number): void {
  for (let i = 0; i < seconds * 60 && f.status !== 'crashed'; i++) f.update(1 / 60);
}

describe('Neue Bauteile', () => {
  it('gibt es alle – mit Name, Beschreibung und sinnvollen Maßen', () => {
    for (const id of NEW) {
      const p = part(id);
      expect(p.name.length, id).toBeGreaterThan(3);
      expect(p.info.length, id).toBeGreaterThan(30);
      expect(p.width, id).toBeGreaterThan(0);
      expect(p.height, id).toBeGreaterThan(0);
    }
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
  });

  it('Solarflügel verstärken Ionentriebwerke – nahe der Erde stark, bei Jupiter kaum', () => {
    const plain = new Flight(['sonde', 'tank-sonde', 'ionen']);
    const solar = new Flight(['sonde', 'solar', 'tank-sonde', 'ionen']);
    for (const f of [plain, solar]) f.placeInOrbit(EARTH, 400_000, 0);
    expect(solar.engine().thrust / plain.engine().thrust).toBeCloseTo(2.5, 1);
    solar.placeInOrbit(JUPITER, 5_000_000, 0);
    expect(solar.engine().thrust / plain.engine().thrust).toBeLessThan(1.1);
    // In der Werft zählt der Flügel für die Erdbahn.
    const a = stageStats(['sonde', 'tank-sonde', 'ionen'])[0]!;
    const b = stageStats(['sonde', 'solar', 'tank-sonde', 'ionen'])[0]!;
    expect(b.thrust / a.thrust).toBeCloseTo(2.5, 5);
    // Chemische Triebwerke bleiben unberührt.
    const chem = new Flight(['sonde', 'solar', 'tank-sonde', 'spatz']);
    chem.placeInOrbit(EARTH, 400_000, 0);
    expect(chem.engine().thrust).toBeCloseTo(part('spatz').thrust, 0);
  });

  it('Solarflügel klappen nur außerhalb der Luft aus', () => {
    const f = new Flight(['sonde', 'solar', 'tank-sonde', 'spatz']);
    f.placeLanded(EARTH, Math.PI / 2);
    expect(f.solarOpen).toBe(false);
    f.placeInOrbit(EARTH, 400_000, 0);
    run(f, 0.5);
    expect(f.solarOpen).toBe(true);
  });

  it('der große Hitzeschild hält mehr aus als der normale', () => {
    const heatOf = (shield: string): number => {
      const f = new Flight(['kapsel', shield]);
      f.status = 'flying';
      // Steiler, schneller Eintritt, Schild voran (relativ zur Erde)
      const [bx, by, bvx, bvy] = bodyState(EARTH, f.t);
      f.x = bx;
      f.y = by + EARTH.radius + 60_000;
      f.vx = bvx;
      f.vy = bvy - 3_500;
      f.angle = Math.PI / 2;
      f.sas = 'retrograde';
      for (let i = 0; i < 60 * 12 && f.status === 'flying'; i++) f.update(1 / 60);
      return f.maxHeat;
    };
    const small = heatOf('hitzeschild');
    const big = heatOf('hitzeschild-xl');
    expect(small).toBeGreaterThan(0);
    expect(big).toBeLessThan(small * 0.7);
  });

  it('Sondenbeine federn bis 11 m/s, Landebeine bis 14, Stoßdämpfer bis 20', () => {
    expect(new Flight(['sonde', 'tank-sonde', 'beine-s', 'spatz']).safeLandingSpeed).toBe(11);
    expect(new Flight(['kapsel', 'tank-m', 'beine', 'falke']).safeLandingSpeed).toBe(14);
    expect(new Flight(['kapsel', 'tank-m', 'beine-xl', 'falke']).safeLandingSpeed).toBe(20);
    expect(new Flight(['kapsel', 'tank-m', 'falke']).safeLandingSpeed).toBe(8);
  });

  it('der Sondenkern Kepler dreht so flink wie mit einem Reaktionsrad', () => {
    const spin = (design: string[]): number => {
      const f = new Flight(design);
      f.placeInOrbit(EARTH, 400_000, 0);
      f.sas = 'off';
      f.turn = 1;
      run(f, 1);
      return Math.abs(f.angVel);
    };
    const plain = spin(['sonde', 'tank-m', 'falke']);
    const kepler = spin(['sonde-xl', 'tank-m', 'falke']);
    const wheel = spin(['sonde', 'rad', 'tank-m', 'falke']);
    expect(kepler).toBeGreaterThan(plain * 1.3);
    expect(kepler).toBeCloseTo(wheel, 3);
  });

  it('ein Weltraumteleskop lässt sich wie ein Satellit aussetzen', () => {
    const f = new Flight(['teleskop', 'sonde-xl', 'tank-m', 'falke']);
    f.placeInOrbit(EARTH, 600_000, 0);
    expect(f.satellitesOnBoard).toBe(1);
    expect(f.deploySatellite()).toBe(true);
    expect(f.satellitesOnBoard).toBe(0);
    expect(f.satellites.at(-1)?.name).toMatch(/^Teleskop \d+$/);
    expect(f.satellites.at(-1)?.part).toBe('teleskop');
  });

  it('Scheinwerfer zählen als Licht an Bord', () => {
    expect(new Flight(['kapsel', 'scheinwerfer', 'tank-m', 'falke']).hasLights).toBe(true);
    expect(new Flight(['kapsel', 'tank-m', 'falke']).hasLights).toBe(false);
  });

  it('Vakuumtriebwerke Hermes und Herkules verlieren Schub in dichter Luft', () => {
    for (const id of ['hermes', 'herkules']) {
      const f = new Flight(['sonde', 'tank-l', id]);
      f.placeInOrbit(EARTH, 300, 0);
      run(f, 0.1);
      const ground = f.engine().thrust;
      f.placeInOrbit(EARTH, 400_000, 0);
      run(f, 0.1);
      expect(ground, id).toBeLessThan(f.engine().thrust * 0.6);
    }
  });

  it('alle neuen Vorlagen sind gültig und heben ab', () => {
    for (const id of ['zwerg', 'sternwarte', 'phoenix', 'daemmerung', 'nachtfalke', 'koloss']) {
      const t = TEMPLATES.find((q) => q.id === id)!;
      expect(t, id).toBeDefined();
      expect(
        checkDesign(t.parts).filter((p) => p.level === 'error'),
        id,
      ).toEqual([]);
      expect(stageStats(t.parts)[0]!.twrEarth, id).toBeGreaterThan(1.2);
    }
  });
});
