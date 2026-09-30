/**
 * Bahnvorhersage ohne Ruckeln: Die Vorhersage (tausende Rechenschritte) läuft in einem eigenen
 * Web Worker. Das Spiel fragt an, zeichnet mit der letzten fertigen Vorhersage weiter und nimmt die
 * neue, sobald sie da ist. Es läuft immer höchstens eine Anfrage; kommt währenddessen eine neue,
 * wird danach nur die jüngste gerechnet. Ohne Worker (Tests, alte Browser) wird wie früher direkt
 * gerechnet.
 */
import type { Flight, FlightSnapshot, Prediction } from './flight';
import { bodyById, type BodyId } from './world';

export interface PredictRequest {
  id: number;
  snap: FlightSnapshot;
}

/** Vorhersage zum Verschicken: Körper als Kennungen statt als Objekte. */
export interface PackedPrediction extends Omit<
  Prediction,
  'ref' | 'impact' | 'reentry' | 'encounter' | 'nodeRef'
> {
  ref: BodyId;
  impact: BodyId | null;
  reentry: BodyId | null;
  encounter: (Omit<NonNullable<Prediction['encounter']>, 'body'> & { body: BodyId }) | null;
  nodeRef: BodyId | null;
}

export interface PredictResponse {
  id: number;
  pred: PackedPrediction | null;
  error?: string;
}

export function packPrediction(p: Prediction): PackedPrediction {
  const cut = (a: Float64Array): Float64Array => a.slice(0, p.n);
  return {
    ...p,
    xs: cut(p.xs),
    ys: cut(p.ys),
    vxs: cut(p.vxs),
    vys: cut(p.vys),
    ts: cut(p.ts),
    ref: p.ref.id,
    impact: p.impact?.id ?? null,
    reentry: p.reentry?.id ?? null,
    encounter: p.encounter ? { ...p.encounter, body: p.encounter.body.id } : null,
    nodeRef: p.nodeRef?.id ?? null,
  };
}

export function unpackPrediction(p: PackedPrediction): Prediction {
  return {
    ...p,
    ref: bodyById(p.ref),
    impact: p.impact ? bodyById(p.impact) : null,
    reentry: p.reentry ? bodyById(p.reentry) : null,
    encounter: p.encounter ? { ...p.encounter, body: bodyById(p.encounter.body) } : null,
    nodeRef: p.nodeRef ? bodyById(p.nodeRef) : null,
  };
}

/** Vorhersage-Dienst für einen Flugbildschirm. */
export class PredictionService {
  private worker: Worker | null | undefined;
  private nextId = 1;
  private busy = 0;
  private queued: { f: Flight; gen: number } | null = null;
  private gen = 0;
  /** Die jüngste fertige Vorhersage (und zu welcher Anfrage-Generation sie gehört). */
  latest: Prediction | null = null;
  /** Wird aufgerufen, wenn eine neue Vorhersage da ist. */
  onResult: ((p: Prediction | null) => void) | null = null;

  private getWorker(): Worker | null {
    if (this.worker !== undefined) return this.worker;
    if (typeof Worker === 'undefined') return (this.worker = null);
    try {
      const w = new Worker(new URL('./predict.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<PredictResponse>) => this.receive(e.data);
      w.onerror = (e) => {
        e.preventDefault();
        this.fail();
      };
      w.onmessageerror = () => this.fail();
      this.worker = w;
    } catch {
      this.worker = null;
    }
    return this.worker;
  }

  private fail(): void {
    this.worker?.terminate();
    this.worker = null;
    this.busy = 0;
  }

  private receive(r: PredictResponse): void {
    if (r.id !== this.busy) return;
    this.busy = 0;
    const gen = this.pendingGen;
    if (gen === this.gen) {
      this.latest = r.pred ? unpackPrediction(r.pred) : null;
      this.onResult?.(this.latest);
    }
    if (this.queued) {
      const q = this.queued;
      this.queued = null;
      this.send(q.f, q.gen);
    }
  }

  private pendingGen = 0;

  private send(f: Flight, gen: number): void {
    const w = this.getWorker();
    const snap = f.status === 'flying' ? f.snapshot() : null;
    if (!w || !snap) {
      this.latest = f.status === 'flying' ? f.predict() : null;
      this.onResult?.(this.latest);
      return;
    }
    this.busy = this.nextId++;
    this.pendingGen = gen;
    try {
      w.postMessage({ id: this.busy, snap } satisfies PredictRequest);
    } catch {
      this.fail();
      this.latest = f.predict();
      this.onResult?.(this.latest);
    }
  }

  /** Neue Vorhersage anfordern (ersetzt eine noch wartende Anfrage). */
  request(f: Flight): void {
    if (f.status !== 'flying') {
      this.queued = null;
      this.gen++;
      this.latest = null;
      this.onResult?.(null);
      return;
    }
    if (this.busy) this.queued = { f, gen: this.gen };
    else this.send(f, this.gen);
  }

  /** Alles Alte verwerfen (neuer Flug, Neustart). */
  reset(): void {
    this.gen++;
    this.queued = null;
    this.latest = null;
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.busy = 0;
    this.queued = null;
  }
}
