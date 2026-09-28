import { describe, expect, it } from 'vitest';
import { LandingPilot } from '../src/rocket/autopilot';
import { challengeById } from '../src/rocket/challenges';
import { Flight } from '../src/rocket/flight';
import { PARTS, TEMPLATES, checkDesign, unlocked } from '../src/rocket/parts';
import { DEFAULT_SANDBOX, START_OPTIONS, applySandbox, readSandbox } from '../src/rocket/sandbox';
import { EARTH, MARS } from '../src/rocket/world';

function run(f: Flight, seconds: number, each?: () => void): void {
  for (let i = 0; i < seconds * 60 && f.status !== 'crashed'; i++) {
    each?.();
    f.update(1 / 60);
  }
}

describe('Sandkasten', () => {
  it('schaltet alle Teile frei', () => {
    for (const p of PARTS) expect(unlocked(p.id, 0, true), p.id).toBe(true);
  });

  it('liest kaputte Einstellungen als Voreinstellung', () => {
    expect(readSandbox(null)).toEqual(DEFAULT_SANDBOX);
    expect(readSandbox({ thrust: 7, start: 'nirgends', fuel: 'ja' })).toEqual(DEFAULT_SANDBOX);
    expect(readSandbox({ thrust: 5, start: 'mars' }).thrust).toBe(5);
  });

  it('jeder Startort ist stabil', () => {
    for (const o of START_OPTIONS) {
      const f = new Flight(['kapsel', 'tank-m', 'falke']);
      applySandbox(f, { ...DEFAULT_SANDBOX, start: o.id });
      run(f, 5);
      expect(f.status, o.id).not.toBe('crashed');
    }
  });

  it('Schubfaktor verzehnfacht den Schub, der Treibstoff bleibt voll', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    const base = f.engine().thrust;
    applySandbox(f, { ...DEFAULT_SANDBOX, thrust: 10 });
    expect(f.engine().thrust).toBeCloseTo(base * 10);
    f.throttle = 1;
    run(f, 10);
    expect(f.active.fuel).toBe(f.fuelCapacity);
  });

  it('unzerstörbar: Aufprall mit 300 m/s ist eine Landung', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    applySandbox(f, { ...DEFAULT_SANDBOX, indestructible: true });
    f.throttle = 1;
    run(f, 20);
    f.throttle = 0;
    f.vx = 0;
    f.vy = -300;
    run(f, 60);
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(EARTH);
  });
});

describe('Neue Bauteile', () => {
  it('alle Vorlagen sind gültig', () => {
    for (const t of TEMPLATES)
      expect(
        checkDesign(t.parts).filter((p) => p.level === 'error'),
        t.id,
      ).toEqual([]);
  });

  it('Nasenkegel halbiert den Luftwiderstand beim Aufstieg', () => {
    const top = (design: string[]): number => {
      const f = new Flight(design);
      f.throttle = 1;
      run(f, 40);
      return f.maxAltitude;
    };
    expect(top(['nase', 'sonde', 'tank-m', 'falke'])).toBeGreaterThan(
      top(['sonde', 'tank-m', 'falke']) * 1.02,
    );
  });

  it('Vakuumtriebwerk verliert am Boden Schub, im All nicht', () => {
    const f = new Flight(['kapsel', 'tank-m', 'nova']);
    f.throttle = 1;
    run(f, 1);
    const low = f.engine().thrust;
    f.placeInOrbit(EARTH, 150_000, Math.PI / 2);
    run(f, 1);
    expect(low).toBeLessThan(f.engine().thrust * 0.6);
  });

  it('Reaktionsrad dreht schneller', () => {
    const spin = (design: string[]): number => {
      const f = new Flight(design);
      f.placeInOrbit(EARTH, 150_000, Math.PI / 2);
      const a0 = f.angle;
      f.turn = 1;
      run(f, 1);
      return Math.abs(f.angle - a0);
    };
    expect(spin(['rad', 'kapsel', 'tank-s', 'falke'])).toBeGreaterThan(
      spin(['kapsel', 'tank-s', 'falke']) * 1.3,
    );
  });

  it('Mars-Gleiter: Luftbremse, Fallschirm und Lande-Autopilot landen sicher', () => {
    const c = challengeById('glider')!;
    const f = new Flight(c.design);
    c.setup(f);
    expect(f.refBody()).toBe(MARS);
    f.toggleAirbrakes();
    f.deployChute();
    const lander = new LandingPilot();
    const memo = {};
    let r = null;
    for (let i = 0; i < 60 * 600 && !r; i++) {
      lander.update(f);
      f.update(1 / 60);
      r = c.judge(f, memo);
    }
    expect(r?.success, r?.text).toBe(true);
  });
});
