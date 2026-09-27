import { G } from './constants';
import type { NBody } from './nbody';

export type IntegratorId = 'euler' | 'euler-cromer' | 'verlet' | 'rk4' | 'yoshida4';

export interface IntegratorInfo {
  id: IntegratorId;
  name: string;
  order: number;
  /** Symplektische Verfahren erhalten die Energie über lange Zeit (kein systematischer Drift). */
  symplectic: boolean;
  /** Kraftauswertungen pro Schritt – bestimmt den Rechenaufwand. */
  forceEvaluations: number;
  description: string;
}

export const INTEGRATORS: Record<IntegratorId, IntegratorInfo> = {
  euler: {
    id: 'euler',
    name: 'Euler (explizit)',
    order: 1,
    symplectic: false,
    forceEvaluations: 1,
    description:
      'Einfachstes Verfahren: Position und Geschwindigkeit werden mit den Werten vom Schrittanfang fortgeschrieben. Die Energie wächst systematisch – Bahnen spiralen nach außen.',
  },
  'euler-cromer': {
    id: 'euler-cromer',
    name: 'Euler-Cromer (semi-implizit)',
    order: 1,
    symplectic: true,
    forceEvaluations: 1,
    description:
      'Erst die Geschwindigkeit, dann mit der neuen Geschwindigkeit die Position. Kaum mehr Aufwand als Euler, aber symplektisch: die Energie schwankt nur, statt zu driften.',
  },
  verlet: {
    id: 'verlet',
    name: 'Velocity-Verlet (Leapfrog)',
    order: 2,
    symplectic: true,
    forceEvaluations: 1,
    description:
      'Halber Geschwindigkeitsschritt, voller Ortsschritt, halber Geschwindigkeitsschritt. Standard in der Himmelsmechanik und Molekulardynamik: zeitumkehrbar und langzeitstabil.',
  },
  rk4: {
    id: 'rk4',
    name: 'Runge-Kutta 4',
    order: 4,
    symplectic: false,
    forceEvaluations: 4,
    description:
      'Klassisches Verfahren 4. Ordnung: sehr genau pro Schritt, aber nicht symplektisch – über sehr lange Zeiten driftet die Energie langsam.',
  },
  yoshida4: {
    id: 'yoshida4',
    name: 'Yoshida (4. Ordnung, symplektisch)',
    order: 4,
    symplectic: true,
    forceEvaluations: 3,
    description:
      'Drei geschickt gewichtete Leapfrog-Schritte (einer davon rückwärts) ergeben ein symplektisches Verfahren 4. Ordnung (Yoshida 1990).',
  },
};

// Yoshida-Koeffizienten (Yoshida 1990, Phys. Lett. A 150, 262).
const CBRT2 = Math.cbrt(2);
const W1 = 1 / (2 - CBRT2);
const W0 = -CBRT2 / (2 - CBRT2);
const YOSHIDA_C = [W1 / 2, (W0 + W1) / 2, (W0 + W1) / 2, W1 / 2] as const;
const YOSHIDA_D = [W1, W0, W1] as const;

interface Scratch {
  x0: Float64Array;
  y0: Float64Array;
  vx0: Float64Array;
  vy0: Float64Array;
  kx: Float64Array[];
  ky: Float64Array[];
  kvx: Float64Array[];
  kvy: Float64Array[];
  tx: Float64Array;
  ty: Float64Array;
}

const scratchCache = new WeakMap<NBody, Scratch>();

function scratch(sys: NBody): Scratch {
  let s = scratchCache.get(sys);
  if (!s) {
    const f = (): Float64Array => new Float64Array(sys.n);
    s = {
      x0: f(),
      y0: f(),
      vx0: f(),
      vy0: f(),
      kx: [f(), f(), f(), f()],
      ky: [f(), f(), f(), f()],
      kvx: [f(), f(), f(), f()],
      kvy: [f(), f(), f(), f()],
      tx: f(),
      ty: f(),
    };
    scratchCache.set(sys, s);
  }
  return s;
}

function drift(sys: NBody, dt: number): void {
  const { n, alive, x, y, vx, vy } = sys;
  for (let i = 0; i < n; i++) {
    if (!alive[i]) continue;
    x[i]! += vx[i]! * dt;
    y[i]! += vy[i]! * dt;
  }
}

function kick(sys: NBody, dt: number): void {
  const { n, alive, vx, vy, ax, ay } = sys;
  for (let i = 0; i < n; i++) {
    if (!alive[i]) continue;
    vx[i]! += ax[i]! * dt;
    vy[i]! += ay[i]! * dt;
  }
}

function stepEuler(sys: NBody, dt: number): void {
  sys.ensureAccelerations();
  drift(sys, dt);
  kick(sys, dt);
  sys.accValid = false;
}

function stepEulerCromer(sys: NBody, dt: number): void {
  sys.ensureAccelerations();
  kick(sys, dt);
  drift(sys, dt);
  sys.accValid = false;
}

function stepVerlet(sys: NBody, dt: number): void {
  sys.ensureAccelerations();
  kick(sys, dt / 2);
  drift(sys, dt);
  sys.computeAccelerations();
  kick(sys, dt / 2);
  sys.accValid = true;
}

function stepYoshida(sys: NBody, dt: number): void {
  for (let s = 0; s < 3; s++) {
    drift(sys, YOSHIDA_C[s]! * dt);
    sys.computeAccelerations();
    kick(sys, YOSHIDA_D[s]! * dt);
  }
  drift(sys, YOSHIDA_C[3] * dt);
  sys.accValid = false;
}

function stepRk4(sys: NBody, dt: number): void {
  const { n, alive, x, y, vx, vy } = sys;
  const s = scratch(sys);
  s.x0.set(x);
  s.y0.set(y);
  s.vx0.set(vx);
  s.vy0.set(vy);
  const factors = [0, 0.5, 0.5, 1];

  for (let k = 0; k < 4; k++) {
    const f = factors[k]! * dt;
    const prev = k - 1;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      if (k === 0) {
        s.tx[i] = s.x0[i]!;
        s.ty[i] = s.y0[i]!;
        s.kx[0]![i] = s.vx0[i]!;
        s.ky[0]![i] = s.vy0[i]!;
      } else {
        s.tx[i] = s.x0[i]! + s.kx[prev]![i]! * f;
        s.ty[i] = s.y0[i]! + s.ky[prev]![i]! * f;
        s.kx[k]![i] = s.vx0[i]! + s.kvx[prev]![i]! * f;
        s.ky[k]![i] = s.vy0[i]! + s.kvy[prev]![i]! * f;
      }
    }
    sys.computeAccelerations(s.tx, s.ty, s.kvx[k], s.kvy[k]);
  }

  const w = dt / 6;
  for (let i = 0; i < n; i++) {
    if (!alive[i]) continue;
    x[i] = s.x0[i]! + w * (s.kx[0]![i]! + 2 * s.kx[1]![i]! + 2 * s.kx[2]![i]! + s.kx[3]![i]!);
    y[i] = s.y0[i]! + w * (s.ky[0]![i]! + 2 * s.ky[1]![i]! + 2 * s.ky[2]![i]! + s.ky[3]![i]!);
    vx[i] = s.vx0[i]! + w * (s.kvx[0]![i]! + 2 * s.kvx[1]![i]! + 2 * s.kvx[2]![i]! + s.kvx[3]![i]!);
    vy[i] = s.vy0[i]! + w * (s.kvy[0]![i]! + 2 * s.kvy[1]![i]! + 2 * s.kvy[2]![i]! + s.kvy[3]![i]!);
  }
  sys.accValid = false;
}

const STEPPERS: Record<IntegratorId, (sys: NBody, dt: number) => void> = {
  euler: stepEuler,
  'euler-cromer': stepEulerCromer,
  verlet: stepVerlet,
  rk4: stepRk4,
  yoshida4: stepYoshida,
};

export function integrate(sys: NBody, integrator: IntegratorId, dt: number): void {
  STEPPERS[integrator](sys, dt);
}

/**
 * Kürzeste dynamische Zeitskala im System: Freifallzeit √(r³/GM) bzw. Begegnungszeit r/v
 * für jedes Paar aus Quelle und Körper. Ein Schritt von `eta` mal diesem Wert löst enge
 * Begegnungen automatisch fein auf (adaptive Schrittweite). Paare mit masselosen
 * Testteilchen werden mit `particleFactor` gewichtet.
 */
export function dynamicalTimescale(sys: NBody, particleFactor = 1): number {
  const { n, alive, mass, x, y, vx, vy } = sys;
  let min = Infinity;
  for (const i of sys.sources) {
    for (let j = 0; j < n; j++) {
      if (j === i || !alive[j]) continue;
      // Paare aus zwei Quellen nur einmal betrachten.
      if (mass[j]! > 0 && j < i) continue;
      const dx = x[j]! - x[i]!;
      const dy = y[j]! - y[i]!;
      const r2 = dx * dx + dy * dy;
      const r = Math.sqrt(r2);
      const freeFall = Math.sqrt((r2 * r) / (G * (mass[i]! + mass[j]!)));
      const dvx = vx[j]! - vx[i]!;
      const dvy = vy[j]! - vy[i]!;
      const v = Math.sqrt(dvx * dvx + dvy * dvy);
      const crossing = v > 0 ? r / v : Infinity;
      // Testteilchen sind nur Anschauung – für sie genügt eine gröbere Auflösung.
      const f = mass[j]! > 0 ? 1 : particleFactor;
      if (freeFall * f < min) min = freeFall * f;
      if (crossing * f < min) min = crossing * f;
    }
  }
  return min;
}
