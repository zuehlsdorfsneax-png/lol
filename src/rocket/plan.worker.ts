/**
 * Bordcomputer im Hintergrund: rechnet einen Plan auf einer Kopie des Flugs und schickt das
 * fertige Manöver zurück. So bleibt das Spiel flüssig, während die Suche viele Mehrkörper-
 * Vorhersagen durchprobiert.
 */
import { Flight } from './flight';
import type { PlanRequest, PlanResponse } from './planClient';
import { makePlan } from './planner';

self.onmessage = (e: MessageEvent<PlanRequest>) => {
  const { id, plan, snap } = e.data;
  const start = performance.now();
  let res: PlanResponse;
  try {
    const f = Flight.restore(snap);
    const result = makePlan(f, plan);
    res = { id, plan: result, node: f.node, ms: performance.now() - start };
  } catch (err) {
    res = { id, plan: null, node: null, ms: performance.now() - start, error: String(err) };
  }
  self.postMessage(res);
};
