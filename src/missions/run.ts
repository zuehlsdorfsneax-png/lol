import { YEAR } from '../physics';
import { Simulation } from '../sim/Simulation';
import { applyControl, type RunResult, type SimMission } from './missions';

export function createMissionSim(m: SimMission, value: number): Simulation {
  return new Simulation(applyControl(m, value), {
    rocheEvents: false,
    trailCapacity: 4000,
    trailInterval: (m.years * YEAR) / 3000,
    trailAngle: 0.03,
  });
}

/** Ergebnis, sobald ein Ereignis eingetreten oder die Zeit abgelaufen ist (sonst null). */
export function missionResult(m: SimMission, sim: Simulation): RunResult | null {
  const ev = sim.pending;
  if (ev && ev.kind !== 'roche') {
    return { outcome: ev.kind, time: sim.time, elements: sim.moonElements() };
  }
  if (sim.time >= m.years * YEAR)
    return { outcome: 'stable', time: sim.time, elements: sim.moonElements() };
  return null;
}

/** Wertet eine Mission ohne Darstellung aus (für Tests und "Sofort auswerten"). */
export function evaluateMission(
  m: SimMission,
  value: number,
): { result: RunResult; stars: number } {
  const sim = createMissionSim(m, value);
  let result: RunResult | null = null;
  while (!result) {
    if (sim.pending?.kind === 'roche') sim.acknowledge();
    sim.advance(m.years * YEAR - sim.time, 100_000);
    result = missionResult(m, sim);
  }
  return { result, stars: m.score(result, value) };
}
