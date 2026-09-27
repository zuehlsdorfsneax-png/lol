import { describe, expect, it } from 'vitest';
import { OrbitPilot, steerTo } from '../src/rocket/autopilot';
import { Flight, WARPS } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { EARTH, MOON, MOON_DISTANCE, MOON_HILL, MOON_RATE, moonAngle } from '../src/rocket/world';

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Spielt Bilder zu 1/60 s, bis `until` gilt (oder die Rakete zerschellt). */
function run(
  f: Flight,
  warp: number | (() => number),
  until: () => boolean,
  maxFrames = 200_000,
): boolean {
  for (let i = 0; i < maxFrames; i++) {
    if (until()) return true;
    if (f.status === 'crashed') return false;
    const w = typeof warp === 'number' ? warp : warp();
    f.setWarp(WARPS.indexOf(w as (typeof WARPS)[number]));
    f.update(1 / 60);
  }
  return until();
}

function template(id: string): string[] {
  return [...TEMPLATES.find((t) => t.id === id)!.parts];
}

describe('Raketenwerft – vollständige Mondmission', () => {
  it('Luna 1 fliegt zum Mond, landet und kehrt zur Erde zurück', () => {
    const f = new Flight(template('luna'));

    // 1. Mit dem Hilfe-Piloten in die Umlaufbahn
    const pilot = new OrbitPilot();
    run(f, 4, () => {
      pilot.update(f);
      return pilot.phase === 'done';
    });
    expect(f.goals.has('orbit')).toBe(true);

    // 2. Auf das Startfenster warten (Hohmann-Transfer) und in Flugrichtung beschleunigen
    const r1 = Math.hypot(f.x, f.y);
    const tt = Math.PI * Math.sqrt(((r1 + MOON_DISTANCE) / 2) ** 3 / EARTH.mu);
    const lead = Math.PI - MOON_RATE * tt;
    run(f, 100, () => Math.abs(wrap(Math.atan2(f.y, f.x) - moonAngle(f.t) - lead)) < 0.02);
    run(f, 1, () => {
      if (f.active.fuel <= 0 && f.segs.length > 1) f.stage();
      steerTo(f, Math.atan2(f.vy, f.vx));
      f.throttle = 1;
      return f.orbit(EARTH).apoapsis + EARTH.radius > MOON_DISTANCE - 2 * MOON.radius;
    });
    f.throttle = 0;
    const prediction = f.predict();
    expect(prediction.encounter).not.toBeNull();
    expect(prediction.encounter!.distance).toBeLessThan(MOON_HILL);

    // 3. Ankunft in der Hill-Sphäre des Mondes, Einfang in eine Mondumlaufbahn
    expect(run(f, 50_000, () => f.refBody() === MOON)).toBe(true);
    run(f, 1000, () => {
      const r = f.relative(MOON);
      return r.rx * r.vx + r.ry * r.vy > 0 || r.altitude < 60_000;
    });
    run(f, 1, () => {
      if (f.active.fuel <= 0 && f.segs.length > 1) f.stage();
      const r = f.relative(MOON);
      steerTo(f, Math.atan2(-r.vy, -r.vx));
      f.throttle = 1;
      const o = f.orbit(MOON);
      return o.bound && o.apoapsis < 1_500_000;
    });
    f.throttle = 0;
    expect(f.goals.has('moonorbit')).toBe(true);

    // 4. Landung: erst Bahngeschwindigkeit abbauen, dann senkrecht abbremsen
    run(
      f,
      () => (f.throttle === 0 && f.relative(MOON).altitude > 40_000 ? 100 : 1),
      () => {
        if (f.active.fuel <= 0 && f.segs.length > 1) f.stage();
        const r = f.relative(MOON);
        const ux = r.rx / r.r;
        const uy = r.ry / r.r;
        const radial = r.vx * ux + r.vy * uy;
        const hx = r.vx - radial * ux;
        const hy = r.vy - radial * uy;
        if (Math.hypot(hx, hy) > 3) {
          steerTo(f, Math.atan2(-hy, -hx));
          f.throttle = 1;
        } else {
          steerTo(f, Math.atan2(uy, ux));
          const g = MOON.mu / r.r ** 2;
          const amax = f.engine().thrust / f.mass;
          const need = (radial * radial - 4) / (2 * Math.max(r.altitude, 1)) + g;
          f.throttle =
            need > 0.7 * amax || r.altitude < 50 ? Math.min(1, Math.max(0, need / amax)) : 0;
        }
        return f.status !== 'flying';
      },
    );
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(MOON);
    expect(f.goals.has('moonland')).toBe(true);

    // Gelandet dreht sich die Rakete mit dem Mond (gebundene Rotation).
    const before = f.relative(MOON);
    run(f, 1000, () => false, 300);
    const after = f.relative(MOON);
    expect(Math.abs(after.altitude)).toBeLessThan(1);
    expect(Math.abs(Math.hypot(after.vx, after.vy))).toBeLessThan(1e-6);
    expect(Math.atan2(after.ry, after.rx)).not.toBeCloseTo(Math.atan2(before.ry, before.rx), 3);

    // 5. Rückflug: aus dem Mondsystem heraus, Erdnähe in die Atmosphäre legen
    run(f, 1, () => {
      const r = f.relative(MOON);
      const up = Math.atan2(r.ry, r.rx);
      const m = f.moon();
      const back = Math.atan2(-m.vy, -m.vx);
      const side = wrap(back - up) > 0 ? up + Math.PI / 2 : up - Math.PI / 2;
      steerTo(f, r.altitude < 3_000 ? up : side);
      f.throttle = 1;
      return !f.orbit(MOON).bound;
    });
    f.throttle = 0;
    run(f, 5000, () => f.refBody() === EARTH && f.relative(MOON).r > MOON_HILL * 1.05);
    run(f, 1, () => {
      steerTo(f, Math.atan2(-f.vy, -f.vx));
      f.throttle = 1;
      return f.orbit(EARTH).periapsis < 25_000 || f.active.fuel <= 0;
    });
    f.throttle = 0;
    expect(f.orbit(EARTH).periapsis).toBeLessThan(EARTH.atmosphere);

    // 6. Wiedereintritt: Die Luft bremst, der Fallschirm öffnet sich
    f.deployChute();
    run(f, 50_000, () => f.altitudeEarth < 60_000);
    run(
      f,
      1,
      () => {
        steerTo(f, Math.atan2(-f.vy, -f.vx));
        return f.status !== 'flying';
      },
      60 * 3000,
    );
    expect(f.crashReason).toBe('');
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(EARTH);
    expect(f.goals.has('return')).toBe(true);
  }, 60_000);
});
