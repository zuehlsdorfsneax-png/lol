import { describe, expect, it } from 'vitest';
import { MAX_PARTICLES, ParticleSystem } from '../../src/lagrange/particles';
import { SYSTEMS, findSystem } from '../../src/lagrange/systems';

describe('Teilchen im Lagrange-Labor', () => {
  it('behält höchstens MAX_PARTICLES und verwirft die ältesten', () => {
    const ps = new ParticleSystem(0.01);
    for (let i = 0; i < MAX_PARTICLES + 10; i++) ps.add(0.5, 0.5 + i * 1e-3, 0, 0);
    expect(ps.particles).toHaveLength(MAX_PARTICLES);
    expect(ps.particles[0]!.id).toBe(11);
    expect(ps.particles[MAX_PARTICLES - 1]!.id).toBe(MAX_PARTICLES + 10);
  });

  it('schlägt in der Erde schon bei deren echtem Radius ein', () => {
    const { mu, radii } = findSystem('erde-mond');
    expect(radii[0]).toBeCloseTo(6.371e6 / 3.844e8, 3);
    const ps = new ParticleSystem(mu, radii);
    // 0,01 Längeneinheiten vom Erdmittelpunkt = 3.844 km, also im Erdinneren
    const inside = ps.add(-mu + 0.01, 0, 0, 0);
    ps.advance(1e-4);
    expect(inside.status).toBe('crashed');
  });

  it('schlägt in Pluto bei dessen Radius von 0,06 Längeneinheiten ein', () => {
    const { mu, radii } = findSystem('pluto-charon');
    const ps = new ParticleSystem(mu, radii);
    const p = ps.add(-mu + 0.03, 0, 0, 0);
    ps.advance(1e-4);
    expect(p.status).toBe('crashed');
  });

  it('lässt ein Teilchen außerhalb des Körpers aktiv', () => {
    const { mu, radii } = findSystem('erde-mond');
    const ps = new ParticleSystem(mu, radii);
    const p = ps.add(-mu + 0.05, 0, 0, 0);
    ps.advance(1e-4);
    expect(p.status).toBe('active');
  });

  it('jedes System hat Körperradien kleiner als den Abstand der Körper', () => {
    for (const s of SYSTEMS) {
      expect(s.radii[0]).toBeGreaterThan(0);
      expect(s.radii[1]).toBeGreaterThan(0);
      expect(s.radii[0] + s.radii[1]).toBeLessThan(1);
    }
  });
});
