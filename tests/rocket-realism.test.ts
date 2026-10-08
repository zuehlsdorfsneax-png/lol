import { describe, expect, it } from 'vitest';
import { OrbitPilot } from '../src/rocket/autopilot';
import { Flight } from '../src/rocket/flight';
import { PARTS, PART_CATEGORIES, TEMPLATES, ispAt, part, stageStats } from '../src/rocket/parts';
import {
  GAME_EARTH,
  G0,
  GAME_MOON,
  VENUS,
  enginePressure,
  stationPort,
  stationState,
} from '../src/rocket/world';

function run(f: Flight, seconds: number, until: () => boolean = () => false): void {
  for (let i = 0; i < seconds * 60 && f.status !== 'crashed' && !until(); i++) f.update(1 / 60);
}

describe('Triebwerke und Luftdruck', () => {
  it('am Boden gleicher Verbrauch, aber weniger Schub als im Vakuum', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    run(f, 0.1);
    const ground = f.engine();
    f.placeInOrbit(GAME_EARTH, 400_000, 0);
    run(f, 0.1);
    const vacuum = f.engine();
    expect(ground.flow).toBeCloseTo(vacuum.flow, 6);
    expect(ground.thrust / vacuum.thrust).toBeCloseTo(part('falke').ispSea! / part('falke').isp, 3);
  });

  it('der Tank leert sich mit Schub / (Isp · g0)', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    f.throttle = 1;
    const before = f.active.fuel;
    run(f, 1);
    const flow = part('falke').thrust / (part('falke').isp * G0);
    expect(before - f.active.fuel).toBeCloseTo(flow, 0);
    expect(f.stats.fuelUsed).toBeCloseTo(before - f.active.fuel, 6);
  });

  it('Vakuumtriebwerke sind am Boden schwach, Bodentriebwerke kaum', () => {
    const vac = stageStats(['sonde', 'tank-l', 'nova'])[0]!;
    const sea = stageStats(['sonde', 'tank-l', 'falke'])[0]!;
    expect(vac.ispSea / vac.isp).toBeLessThan(0.5);
    expect(sea.ispSea / sea.isp).toBeGreaterThan(0.85);
  });

  it('die Werft rechnet den Start mit Bodenschub, den Mond mit Vakuumschub', () => {
    const s = stageStats(['kapsel', 'tank-m', 'falke'])[0]!;
    const gEarth = GAME_EARTH.mu / GAME_EARTH.radius ** 2;
    const gMoon = GAME_MOON.mu / GAME_MOON.radius ** 2;
    expect(s.twrEarth * s.startMass * gEarth).toBeCloseTo(s.flow * G0 * s.ispSea, 3);
    expect(s.twrMoon * s.startMass * gMoon).toBeCloseTo(s.thrust, 3);
    expect(s.flow).toBeCloseTo(part('falke').thrust / (part('falke').isp * G0), 6);
  });

  it('Nova und Herkules liefern auch am Venusboden Schub', () => {
    const ground = enginePressure(VENUS.density0);
    for (const id of ['nova', 'herkules']) {
      const p = part(id);
      expect(ispAt(p, ground)).toBeCloseTo(p.ispSea!, 6);
      const start = stageStats(['sonde', 'tank-l', id], {
        thrust: 1,
        infiniteFuel: false,
        body: VENUS,
      })[0]!;
      expect(start.twrStart).toBeGreaterThan(0);
      const f = new Flight(['sonde', 'tank-l', id]);
      f.placeLanded(VENUS, 0);
      run(f, 0.1);
      expect(f.engine().thrust).toBeGreaterThan(0);
    }
  });
});

describe('Luftwiderstand', () => {
  it('steigt an der Schallmauer und fällt danach wieder', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    expect(f.hullDrag(1.1) / f.hullDrag(0.5)).toBeCloseTo(1.7, 5);
    expect(f.hullDrag(4)).toBeLessThan(f.hullDrag(2));
    expect(f.hullDrag(2)).toBeLessThan(f.hullDrag(1.1));
  });

  it('hängt von Stirnfläche und Spitze ab', () => {
    const wide = new Flight(['kapsel', 'tank-m', 'falke']);
    const slim = new Flight(['sonde', 'tank-sonde', 'spatz']);
    expect(slim.hullDrag(0) / wide.hullDrag(0)).toBeCloseTo((1.4 / 2.4) ** 2, 5);
    const pointed = new Flight(['verkleidung', 'sonde', 'tank-m', 'falke']);
    const blunt = new Flight(['sonde', 'tank-m', 'falke']);
    expect(pointed.hullDrag(0) / blunt.hullDrag(0)).toBeCloseTo(0.5, 5);
  });

  it('der Flug misst den größten Staudruck (Max Q)', () => {
    const f = new Flight([...TEMPLATES.find((t) => t.id === 'orbiter')!.parts]);
    const pilot = new OrbitPilot(GAME_EARTH);
    for (let i = 0; i < 90 * 60; i++) {
      pilot.update(f);
      f.update(1 / 60);
    }
    expect(f.stats.maxQ).toBeGreaterThan(5_000);
    expect(f.stats.maxQ).toBeLessThan(100_000);
  });
});

describe('Neue Teile ohne Triebwerk', () => {
  it('jedes Teil steht in genau einer Gruppe der Werft, keine Gruppe ist leer', () => {
    const ids = PART_CATEGORIES.flatMap((c) => c.groups.flatMap((g) => g.parts.map((p) => p.id)));
    expect(ids.slice().sort()).toEqual(PARTS.map((p) => p.id).sort());
    for (const c of PART_CATEGORIES)
      for (const g of c.groups) expect(g.parts.length).toBeGreaterThan(0);
  });

  it('die Verkleidung sprengt sich über 30 km ab und die Rakete wird leichter', () => {
    const f = new Flight(['verkleidung', 'satellit', 'sonde', 'tank-m', 'falke']);
    expect(f.streamlined).toBe(true);
    const pilot = new OrbitPilot(GAME_EARTH);
    const dry = (): number => f.segs.flatMap((s) => s.parts).reduce((m, id) => m + part(id).dry, 0);
    const before = dry();
    let below = 0;
    for (let i = 0; i < 200 * 60 && f.segs[0]!.parts[0] === 'verkleidung'; i++) {
      pilot.update(f);
      f.update(1 / 60);
      below = f.air().altitude;
    }
    expect(f.segs[0]!.parts[0]).toBe('satellit');
    expect(below).toBeGreaterThan(29_000);
    expect(before - dry()).toBe(part('verkleidung').dry);
    expect(f.debris.filter((d) => d.half).length).toBe(2);
    expect(f.streamlined).toBe(false);
  });

  it('Gitterflossen drehen die Rakete in dichter Luft schneller, im All nicht', () => {
    const turn = (design: string[], altitude: number): number => {
      const f = new Flight(design);
      f.placeInOrbit(GAME_EARTH, altitude, 0);
      const a0 = f.angle;
      f.turn = 1;
      run(f, 0.5);
      return Math.abs(f.angle - a0);
    };
    const fins = ['kapsel', 'tank-m', 'gitterflossen', 'falke'];
    const plain = ['kapsel', 'tank-m', 'falke'];
    expect(turn(fins, 3_000)).toBeGreaterThan(turn(plain, 3_000) * 1.4);
    expect(turn(fins, 400_000)).toBeCloseTo(turn(plain, 400_000), 6);
  });

  it('Airbags fangen fast 19 m/s und Schräglage ab – aber nur einmal', () => {
    const drop = (design: string[], tilt: number): Flight => {
      const f = new Flight(design);
      f.status = 'flying';
      f.landedOn = null;
      f.angle += tilt;
      f.y += 5;
      f.vy -= 16;
      run(f, 3, () => f.status === 'landed');
      return f;
    };
    const bags = drop(['sonde', 'tank-sonde', 'airbags'], 0.9);
    expect(bags.status).toBe('landed');
    expect(bags.stats.lastLanding!.speed).toBeGreaterThan(16);
    expect(bags.segs[0]!.parts).not.toContain('airbags');
    expect(drop(['sonde', 'tank-sonde', 'beine-s'], 0).status).toBe('crashed');
  });

  it('mit Andockstutzen greift die Station auch bei 3 m/s Annäherung', () => {
    const approach = (design: string[]): Flight => {
      const f = new Flight(design);
      f.status = 'flying';
      f.landedOn = null;
      const [px, py] = stationPort(f.t);
      const [sx, sy, vx, vy] = stationState(f.t);
      const ux = (px - sx) / Math.hypot(px - sx, py - sy);
      const uy = (py - sy) / Math.hypot(px - sx, py - sy);
      f.angle = Math.atan2(-uy, -ux);
      f.x = px + ux * (12 + f.length);
      f.y = py + uy * (12 + f.length);
      f.vx = vx - ux * 3;
      f.vy = vy - uy * 3;
      run(f, 3, () => f.status === 'docked');
      return f;
    };
    expect(approach(['andockstutzen', 'sonde', 'tank-sonde', 'spatz']).status).toBe('docked');
    expect(approach(['sonde', 'tank-sonde', 'spatz']).status).not.toBe('docked');
  });
});

describe('Aufstiegspilot', () => {
  it('bringt auch eine schwache Oberstufe in die Bahn (Nachtfalke)', () => {
    const f = new Flight([...TEMPLATES.find((t) => t.id === 'nachtfalke')!.parts]);
    const pilot = new OrbitPilot(GAME_EARTH);
    for (let i = 0; i < 900 * 60; i++) {
      const p = pilot.update(f);
      if (p === 'done' || p === 'failed') break;
      f.update(1 / 60);
    }
    expect(f.status).toBe('flying');
    expect(pilot.phase).toBe('done');
    expect(f.orbit(GAME_EARTH).periapsis).toBeGreaterThan(GAME_EARTH.atmosphere);
  });
});
