/**
 * Planen ohne Ruckeln: Die Suche des Bordcomputers läuft in einem Web Worker auf einer Kopie des
 * Flugs. Das Ergebnis wird nur übernommen, wenn sich die Bahn inzwischen nicht verändert hat
 * (kein Schub, kein Brennen begonnen). Ohne Worker (ältere Browser, Tests) wird wie früher direkt
 * gerechnet.
 */
import type { Flight, FlightSnapshot, ManeuverNode } from './flight';
import { makePlan, type Plan, type PlanId } from './planner';

export interface PlanRequest {
  id: number;
  plan: PlanId;
  snap: FlightSnapshot;
}

export interface PlanResponse {
  id: number;
  plan: Plan | null;
  node: ManeuverNode | null;
  ms: number;
  error?: string;
}

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, (r: PlanResponse | null) => void>();

function disable(): void {
  worker?.terminate();
  worker = null;
  // Offene Anfragen fallen auf die direkte Rechnung zurück.
  for (const done of waiting.values()) done(null);
  waiting.clear();
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === 'undefined') return (worker = null);
  try {
    const w = new Worker(new URL('./plan.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<PlanResponse>) => {
      const done = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      done?.(e.data);
    };
    w.onerror = (e) => {
      e.preventDefault();
      disable();
    };
    w.onmessageerror = disable;
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** Worker schon laden, bevor der erste Plan angefordert wird. */
export function warmPlanner(): void {
  getWorker();
}

function inWorker(req: PlanRequest): Promise<PlanResponse | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  return new Promise((resolve) => {
    waiting.set(req.id, resolve);
    try {
      w.postMessage(req);
    } catch {
      waiting.delete(req.id);
      resolve(null);
    }
  });
}

/**
 * Plant ein Manöver für den Flug. Der Plan wird im Hintergrund gerechnet und dann auf den Flug
 * übertragen – außer, die Bahn hat sich in der Zwischenzeit geändert.
 */
export async function runPlan(f: Flight, id: PlanId): Promise<Plan> {
  const snap = f.snapshot();
  if (!snap || f.status !== 'flying') return makePlan(f, id);
  const dvBefore = f.stats.dvUsed;
  const res = await inWorker({ id: nextId++, plan: id, snap });
  if (!res || !res.plan) return makePlan(f, id);
  const changed =
    f.status !== snap.status ||
    f.stats.dvUsed !== dvBefore ||
    f.node?.frozen === true ||
    (res.node !== null && res.node.t < f.t + 2);
  if (changed)
    return {
      ok: false,
      title: res.plan.title,
      text: 'Die Bahn hat sich beim Rechnen verändert. Bitte noch einmal planen.',
    };
  if (res.node) f.node = res.node;
  else f.clearNode();
  return res.plan;
}
