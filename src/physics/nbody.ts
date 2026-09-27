import { G } from './constants';

export type BodyKind = 'star' | 'planet' | 'moon' | 'intruder' | 'particle';

export interface BodyInit {
  name: string;
  kind: BodyKind;
  mass: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface BodyMeta {
  name: string;
  kind: BodyKind;
}

/**
 * Zustand eines ebenen N-Körper-Systems als "Structure of Arrays" (schnell, cachefreundlich).
 * Körper mit Masse 0 sind Testteilchen: Sie spüren die Gravitation, erzeugen aber keine.
 */
export class NBody {
  readonly n: number;
  readonly meta: BodyMeta[];
  readonly mass: Float64Array;
  readonly radius: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  readonly ax: Float64Array;
  readonly ay: Float64Array;
  /** 1 = aktiv, 0 = entfernt (abgestürzt, verschmolzen). */
  readonly alive: Uint8Array;
  /** Gibt an, ob `ax/ay` zu den aktuellen Positionen passen (für Velocity-Verlet). */
  accValid = false;
  /** Zähler der Kraftauswertungen – Maß für den Rechenaufwand. */
  forceEvaluations = 0;

  private sourceList: number[] = [];

  constructor(bodies: readonly BodyInit[]) {
    const n = bodies.length;
    this.n = n;
    this.meta = bodies.map(({ name, kind }) => ({ name, kind }));
    this.mass = new Float64Array(n);
    this.radius = new Float64Array(n);
    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    this.vx = new Float64Array(n);
    this.vy = new Float64Array(n);
    this.ax = new Float64Array(n);
    this.ay = new Float64Array(n);
    this.alive = new Uint8Array(n).fill(1);
    bodies.forEach((b, i) => {
      this.mass[i] = b.mass;
      this.radius[i] = b.radius;
      this.x[i] = b.x;
      this.y[i] = b.y;
      this.vx[i] = b.vx;
      this.vy[i] = b.vy;
    });
    this.updateSources();
  }

  /** Indizes aller aktiven Körper mit Masse (Quellen des Gravitationsfelds). */
  get sources(): readonly number[] {
    return this.sourceList;
  }

  updateSources(): void {
    this.sourceList = [];
    for (let i = 0; i < this.n; i++) {
      if (this.alive[i] && this.mass[i]! > 0) this.sourceList.push(i);
    }
    this.accValid = false;
  }

  remove(i: number): void {
    this.alive[i] = 0;
    this.updateSources();
  }

  /** Beschleunigungen für die Positionen `px/py` (Standard: aktuelle Positionen). */
  computeAccelerations(
    px: Float64Array = this.x,
    py: Float64Array = this.y,
    outX: Float64Array = this.ax,
    outY: Float64Array = this.ay,
  ): void {
    const { n, alive, mass } = this;
    const sources = this.sourceList;
    this.forceEvaluations++;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      let axi = 0;
      let ayi = 0;
      const xi = px[i]!;
      const yi = py[i]!;
      for (let k = 0; k < sources.length; k++) {
        const j = sources[k]!;
        if (j === i) continue;
        const dx = px[j]! - xi;
        const dy = py[j]! - yi;
        const r2 = dx * dx + dy * dy;
        const inv = (G * mass[j]!) / (r2 * Math.sqrt(r2));
        axi += dx * inv;
        ayi += dy * inv;
      }
      outX[i] = axi;
      outY[i] = ayi;
    }
  }

  ensureAccelerations(): void {
    if (!this.accValid) {
      this.computeAccelerations();
      this.accValid = true;
    }
  }

  distance(i: number, j: number): number {
    return Math.hypot(this.x[j]! - this.x[i]!, this.y[j]! - this.y[i]!);
  }

  /** Gesamtenergie (kinetisch + potentiell) aller massebehafteten Körper. */
  energy(): number {
    const sources = this.sourceList;
    let e = 0;
    for (let a = 0; a < sources.length; a++) {
      const i = sources[a]!;
      const m = this.mass[i]!;
      e += 0.5 * m * (this.vx[i]! ** 2 + this.vy[i]! ** 2);
      for (let b = a + 1; b < sources.length; b++) {
        const j = sources[b]!;
        e -= (G * m * this.mass[j]!) / this.distance(i, j);
      }
    }
    return e;
  }

  /** Gesamtdrehimpuls (z-Komponente) aller massebehafteten Körper. */
  angularMomentum(): number {
    let l = 0;
    for (const i of this.sourceList) {
      l += this.mass[i]! * (this.x[i]! * this.vy[i]! - this.y[i]! * this.vx[i]!);
    }
    return l;
  }

  /** Verschiebt alles so, dass Schwerpunkt und Gesamtimpuls null sind. */
  centerOfMassFrame(): void {
    let m = 0;
    let cx = 0;
    let cy = 0;
    let px = 0;
    let py = 0;
    for (const i of this.sourceList) {
      const mi = this.mass[i]!;
      m += mi;
      cx += mi * this.x[i]!;
      cy += mi * this.y[i]!;
      px += mi * this.vx[i]!;
      py += mi * this.vy[i]!;
    }
    if (m === 0) return;
    for (let i = 0; i < this.n; i++) {
      this.x[i]! -= cx / m;
      this.y[i]! -= cy / m;
      this.vx[i]! -= px / m;
      this.vy[i]! -= py / m;
    }
    this.accValid = false;
  }

  /**
   * Vollständig unelastischer Stoß: `j` wird in `i` eingegliedert (Impuls und Masse bleiben
   * erhalten, das Volumen addiert sich).
   */
  merge(i: number, j: number): void {
    const mi = this.mass[i]!;
    const mj = this.mass[j]!;
    const m = mi + mj;
    if (m > 0) {
      this.x[i] = (mi * this.x[i]! + mj * this.x[j]!) / m;
      this.y[i] = (mi * this.y[i]! + mj * this.y[j]!) / m;
      this.vx[i] = (mi * this.vx[i]! + mj * this.vx[j]!) / m;
      this.vy[i] = (mi * this.vy[i]! + mj * this.vy[j]!) / m;
    }
    this.mass[i] = m;
    this.radius[i] = Math.cbrt(this.radius[i]! ** 3 + this.radius[j]! ** 3);
    this.remove(j);
  }
}
