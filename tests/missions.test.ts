import { describe, expect, it } from 'vitest';
import { MISSIONS, type SimMission } from '../src/missions/missions';
import { evaluateMission } from '../src/missions/run';

const sim = (id: string): SimMission => MISSIONS.find((m) => m.id === id) as SimMission;

describe('Missionen', () => {
  it('haben eindeutige IDs', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });

  it.each([
    ['erste-bahn', 1, 3],
    ['erste-bahn', 0.15, 0],
    ['absturz', 0.2, 3],
    ['absturz', 0.3, 0],
    ['flucht', 1.21, 3],
    ['flucht', 1.1, 0],
    ['grenzgaenger', 0.47, 3],
    ['grenzgaenger', 0.55, 0],
    ['rueckwaerts', 0.91, 3],
    ['naeher', 0.535, 3],
    ['naeher', 0.45, 0],
    ['schwere-sonne', 6.3, 3],
    ['schwere-sonne', 8, 0],
  ])('%s mit %f ergibt %i Sterne', (id, value, stars) => {
    expect(evaluateMission(sim(id), value).stars).toBe(stars);
  });

  it('die Startwerte sind noch nicht gelöst (außer bei "mehr ist besser")', () => {
    for (const id of ['erste-bahn', 'absturz', 'flucht', 'naeher', 'schwere-sonne']) {
      const m = sim(id);
      expect(evaluateMission(m, m.control.initial).stars, id).toBe(0);
    }
  });
});
