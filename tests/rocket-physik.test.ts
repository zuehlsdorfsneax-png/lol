import { describe, expect, it } from 'vitest';
import { LandingPilot, NodeExecutor } from '../src/rocket/autopilot';
import { Flight, bodySpin, surfaceVelocity } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { EUROPA, GAME_EARTH, bodyState } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];
const DT = 1 / 60;

describe('Ionentriebwerke: Brenndauer und Zündzeit', () => {
  it('die geschätzte Brenndauer entspricht dem echten Brennen, auch mit Solarflügeln in Erdnähe', () => {
    for (const parts of [
      ['sonde', 'solar', 'tank-sonde', 'ionen'],
      ['sonde', 'solar', 'solar', 'tank-sonde', 'ionen'],
    ]) {
      const f = new Flight(parts);
      f.placeInOrbit(GAME_EARTH, 400_000, 0);
      const estimate = f.burnTime(100);
      const t0 = f.t;
      f.throttle = 1;
      while (f.stats.dvUsed < 100 && f.t - t0 < 600) f.update(DT);
      expect(Math.abs(f.t - t0 - estimate) / estimate, parts.join('+')).toBeLessThan(0.02);
    }
  });

  it('die Brennmitte liegt beim Manöverpunkt, auch bei einer Ionenstufe mit Solarflügel', () => {
    const f = new Flight(['sonde', 'solar', 'tank-sonde', 'ionen']);
    f.placeInOrbit(GAME_EARTH, 400_000, 0);
    f.setNode(f.t + 300, 100, 0);
    const nodeT = f.node!.t;
    const x = new NodeExecutor();
    let middle = NaN;
    for (let i = 0; i < 60 * 3000 && f.status === 'flying'; i++) {
      const phase = x.update(f);
      if (phase === 'done' || phase === 'failed') break;
      f.update(DT);
      if (Number.isNaN(middle) && f.stats.dvUsed >= 50) middle = f.t;
    }
    expect(x.phase, x.message).toBe('done');
    expect(Math.abs(middle - nodeT)).toBeLessThan(3);
  });
});

describe('Gebundene Monde: der Boden dreht sich mit der Bahn', () => {
  it('gelandet steht die Rakete gegenüber dem Boden still, nicht gegenüber dem Mittelpunkt', () => {
    const f = new Flight(template('faehre'));
    f.placeLanded(EUROPA, 0.4);
    const rel = f.relative(EUROPA);
    const [sx, sy] = surfaceVelocity(EUROPA, rel.rx, rel.ry);
    expect(Math.hypot(rel.vx - sx, rel.vy - sy)).toBeLessThan(1e-9);
    // Europa dreht sich mit ω·R ≈ 9,6 m/s, gegenüber dem Mittelpunkt steht die Rakete also nicht.
    expect(Math.hypot(rel.vx, rel.vy)).toBeGreaterThan(9);
  });

  it('die gespeicherte Geschwindigkeit ist die Bewegung der gelandeten Rakete', () => {
    const f = new Flight(template('faehre'));
    f.placeLanded(EUROPA, 0.4);
    const x0 = f.x;
    const y0 = f.y;
    const { vx, vy } = f;
    f.update(DT);
    expect(Math.abs((f.x - x0) / DT - vx)).toBeLessThan(0.05);
    expect(Math.abs((f.y - y0) / DT - vy)).toBeLessThan(0.05);
  });

  it('wer am Boden steht, setzt mit dem Tempo des Bodens auf', () => {
    const f = new Flight(template('faehre'));
    f.placeInOrbit(EUROPA, 2, 0);
    const angle = 0.7;
    const [bx, by, bvx, bvy] = bodyState(EUROPA, f.t);
    const local = bodySpin(EUROPA, f.t) + angle;
    const rx = (EUROPA.radius + 2) * Math.cos(local);
    const ry = (EUROPA.radius + 2) * Math.sin(local);
    const [sx, sy] = surfaceVelocity(EUROPA, rx, ry);
    f.x = bx + rx;
    f.y = by + ry;
    f.vx = bvx + sx;
    f.vy = bvy + sy;
    f.angle = local;
    for (let i = 0; i < 60 * 60 && f.status === 'flying'; i++) f.update(DT);
    expect(f.status).toBe('landed');
    // Gezählt wird nur der Fall aus 2 m (etwa 2,3 m/s). Bliebe die Rakete gegenüber dem
    // Mittelpunkt stehen, käme die Drehung des Bodens mit 9,6 m/s dazu.
    expect(f.stats.lastLanding!.speed).toBeLessThan(4);
  });

  it('der Lande-Autopilot setzt auf Europa sanft auf', () => {
    const f = new Flight(template('faehre'));
    f.placeInOrbit(EUROPA, 30_000, 1);
    const pilot = new LandingPilot();
    for (let i = 0; i < 60 * 4000 && f.status === 'flying'; i++) {
      if (pilot.update(f) === 'failed') break;
      f.update(DT);
    }
    expect(f.status, pilot.message).toBe('landed');
    expect(f.landedOn).toBe(EUROPA);
    expect(f.stats.lastLanding!.speed).toBeLessThan(8);
  });
});
