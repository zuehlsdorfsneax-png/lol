import { describe, expect, it } from 'vitest';
import { LandingPilot, NodeExecutor, OrbitPilot } from '../src/rocket/autopilot';
import { CHALLENGES, challengeById, type Memo } from '../src/rocket/challenges';
import { Flight } from '../src/rocket/flight';
import { checkDesign } from '../src/rocket/parts';
import { makePlan, planCircularize } from '../src/rocket/planner';
import { CERES, EARTH, JUPITER, MARS, MOON, PHOBOS } from '../src/rocket/world';

function start(id: string): { f: Flight; memo: Memo } {
  const c = challengeById(id)!;
  const f = new Flight(c.design);
  c.setup(f);
  return { f, memo: {} };
}

/** Bilder zu 1/60 s, bis die Herausforderung entschieden ist oder `each` true liefert. */
function play(id: string, f: Flight, memo: Memo, each: () => boolean | void, maxFrames = 400_000) {
  const c = challengeById(id)!;
  for (let i = 0; i < maxFrames; i++) {
    const r = c.judge(f, memo);
    if (r) return r;
    if (each() === true) return null;
    f.update(1 / 60);
  }
  return c.judge(f, memo);
}

function execute(f: Flight): void {
  const x = new NodeExecutor();
  for (let i = 0; i < 300_000; i++) {
    const p = x.update(f);
    if (p === 'done' || p === 'failed') break;
    f.update(1 / 60);
  }
  f.throttle = 0;
}

describe('Herausforderungen', () => {
  it('alle Raketen sind gültig und alle Startsituationen stabil', () => {
    for (const c of CHALLENGES) {
      expect(
        checkDesign(c.design).filter((p) => p.level === 'error'),
        c.id,
      ).toEqual([]);
      const f = new Flight(c.design);
      c.setup(f);
      for (let i = 0; i < 120; i++) f.update(1 / 60);
      expect(f.status, c.id).not.toBe('crashed');
      expect(c.judge(f, {}), c.id).toBeNull();
      expect(c.progress(f).length, c.id).toBeGreaterThan(0);
    }
  });

  it('Erster Hüpfer: hoch, Fallschirm, gelandet', () => {
    const { f, memo } = start('hop');
    f.throttle = 1;
    const r = play('hop', f, memo, () => {
      if (f.active.fuel === 0 && f.chute === 'stowed') f.deployChute();
      if (f.warpIndex < 3 && f.active.fuel === 0 && f.altitudeEarth > 5_000) f.setWarp(3);
    })!;
    expect(r.success).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });

  it('Ab in die Umlaufbahn: der Hilfe-Pilot schafft mindestens einen Stern', () => {
    const { f, memo } = start('orbit');
    const pilot = new OrbitPilot();
    const r = play('orbit', f, memo, () => {
      pilot.update(f);
      if (f.warpIndex < 2) f.setWarp(2);
    })!;
    expect(r.success, r.text).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(1);
  });

  it('Der Bordcomputer: Bahn auf 500 km anheben und rund machen', () => {
    const { f, memo } = start('plan');
    f.setNode(f.t + 120, 254, 0);
    execute(f);
    expect(planCircularize(f, 'ap').ok).toBe(true);
    execute(f);
    const r = play('plan', f, memo, () => undefined, 60 * 30)!;
    expect(r.success, r?.text).toBe(true);
    expect(r.stars).toBe(3);
  });

  it('Satellitennetz: drei Satelliten aussetzen', () => {
    const { f, memo } = start('satnet');
    f.deploySatellite();
    f.deploySatellite();
    f.deploySatellite();
    const r = challengeById('satnet')!.judge(f, memo)!;
    expect(r.success).toBe(true);
    expect(r.stars).toBe(1);
  });

  it('Mondbasis: der Lande-Autopilot landet sicher', () => {
    const { f, memo } = start('moonbase');
    expect(f.refBody()).toBe(MOON);
    const lander = new LandingPilot();
    const r = play('moonbase', f, memo, () => {
      lander.update(f);
    })!;
    expect(r.success, r.text).toBe(true);
    expect(f.landedOn).toBe(MOON);
    expect(r.stars).toBeGreaterThanOrEqual(1);
  });

  it('Selbstmordbremsung: gelandet mit Treibstoffrest', () => {
    const { f, memo } = start('suicide');
    expect(f.refBody()).toBe(MARS);
    const lander = new LandingPilot();
    const r = play('suicide', f, memo, () => {
      lander.update(f);
    })!;
    expect(r.success, r.text).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });

  it('Heimkehr durchs Feuer: ohne Korrektur verglüht die Kapsel, mit Schild voran nicht', () => {
    const doomed = start('reentry');
    const bad = play('reentry', doomed.f, doomed.memo, () => {
      if (doomed.f.warpIndex < 8 && doomed.f.altitudeEarth > 200_000)
        doomed.f.setWarp(doomed.f.maxWarpIndex());
    })!;
    expect(bad.success).toBe(false);

    const { f, memo } = start('reentry');
    expect(makePlan(f, 'deorbit').ok).toBe(true);
    execute(f);
    expect(f.stage()).toBe(true);
    expect(f.shieldAtBottom).toBe(true);
    f.deployChute();
    f.sas = 'retrograde';
    const r = play('reentry', f, memo, () => {
      if (f.altitudeEarth > 200_000 && f.warpIndex < f.maxWarpIndex()) f.setWarp(f.maxWarpIndex());
    })!;
    expect(r.success, r.text).toBe(true);
    expect(r.stars).toBe(3);
    expect(f.landedOn).toBe(EARTH);
  }, 60_000);

  it('Phobos: Start auf der Oberfläche, 2 km von der Station', () => {
    const { f } = start('phobos');
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(PHOBOS);
    expect(f.siteInfo()!.distance).toBeCloseTo(2_000, 0);
    // Ganz wenig Schub genügt zum Abheben.
    f.throttle = 0.05;
    for (let i = 0; i < 60; i++) f.update(1 / 60);
    expect(f.status).toBe('flying');
  });
  it('Ceres: der Lande-Autopilot setzt auf dem Zwergplaneten auf', () => {
    const { f, memo } = start('ceres');
    expect(f.refBody()).toBe(CERES);
    const lander = new LandingPilot();
    const r = play('ceres', f, memo, () => {
      lander.update(f);
    })!;
    expect(r.success, r.text).toBe(true);
    expect(f.landedOn).toBe(CERES);
  });

  it('Jupiter einfangen: „Einfangen (sparsam)“ schafft zwei Sterne, eine runde Bahn wäre teurer', () => {
    const { f, memo } = start('capture');
    // Bis in den Einflussbereich vorspulen, dann den sparsamen Plan des Bordcomputers ausführen.
    const r0 = play('capture', f, memo, () => {
      if (f.refBody() === JUPITER) return true;
      if (f.warpIndex < f.maxWarpIndex()) f.setWarp(f.maxWarpIndex());
    });
    expect(r0).toBeNull();
    const p = makePlan(f, 'capture');
    expect(p.ok, p.text).toBe(true);
    execute(f);
    const r = play('capture', f, memo, () => {
      if (f.warpIndex < 3) f.setWarp(3);
    })!;
    expect(r.success, r.text).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });
});
