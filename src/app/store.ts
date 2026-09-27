import type { ScenarioParams } from '../physics';

/**
 * Übergabe eines Szenarios an den Simulator (z. B. aus der Stabilitätskarte).
 * Bewusst kein globaler Zustand über die Seite hinaus – nur ein einmaliger "Briefkasten".
 */
let pending: { params: ScenarioParams; title: string } | null = null;

export function openInSimulator(params: ScenarioParams, title: string): void {
  pending = { params, title };
  location.hash = 'simulator';
}

export function takePendingScenario(): { params: ScenarioParams; title: string } | null {
  const p = pending;
  pending = null;
  return p;
}
