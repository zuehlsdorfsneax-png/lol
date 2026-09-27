/**
 * Eingeschränktes Drei-Körper-Problem (CR3BP) im mitrotierenden System.
 * Normierte Einheiten: Gesamtmasse 1, Abstand der Hauptkörper 1, Winkelgeschwindigkeit 1.
 * Hauptkörper: Masse 1−μ bei (−μ, 0) und Masse μ bei (1−μ, 0).
 */

export interface Point {
  x: number;
  y: number;
}

export interface LagrangePoint extends Point {
  name: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
}

/** Routh-Kriterium: L4/L5 sind nur für μ < μ_R linear stabil (27μ(1−μ) < 1). */
export const ROUTH_MU = 0.5 * (1 - Math.sqrt(23 / 27));

function distances(mu: number, x: number, y: number): [number, number] {
  return [Math.hypot(x + mu, y), Math.hypot(x - 1 + mu, y)];
}

/** Effektives Potential Ω = ½(x² + y²) + (1−μ)/r₁ + μ/r₂ (Gravitation + Zentrifugalterm). */
export function effectivePotential(mu: number, x: number, y: number): number {
  const [r1, r2] = distances(mu, x, y);
  return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2;
}

export function potentialGradient(mu: number, x: number, y: number): [number, number] {
  const [r1, r2] = distances(mu, x, y);
  const a = (1 - mu) / r1 ** 3;
  const b = mu / r2 ** 3;
  return [x - a * (x + mu) - b * (x - 1 + mu), y - a * y - b * y];
}

export interface Hessian {
  xx: number;
  yy: number;
  xy: number;
}

export function potentialHessian(mu: number, x: number, y: number): Hessian {
  const [r1, r2] = distances(mu, x, y);
  const m1 = 1 - mu;
  const r13 = r1 ** 3;
  const r23 = r2 ** 3;
  const r15 = r1 ** 5;
  const r25 = r2 ** 5;
  const dx1 = x + mu;
  const dx2 = x - 1 + mu;
  return {
    xx: 1 - m1 / r13 + (3 * m1 * dx1 * dx1) / r15 - mu / r23 + (3 * mu * dx2 * dx2) / r25,
    yy: 1 - m1 / r13 + (3 * m1 * y * y) / r15 - mu / r23 + (3 * mu * y * y) / r25,
    xy: (3 * m1 * dx1 * y) / r15 + (3 * mu * dx2 * y) / r25,
  };
}

/** Jacobi-Konstante C = 2Ω − v² – die einzige Erhaltungsgröße des CR3BP. */
export function jacobiConstant(mu: number, x: number, y: number, vx: number, vy: number): number {
  return 2 * effectivePotential(mu, x, y) - (vx * vx + vy * vy);
}

function bisect(f: (x: number) => number, lo: number, hi: number): number {
  let flo = f(lo);
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
}

/**
 * Lagrange-Punkte: L1–L3 als Nullstellen von ∂Ω/∂x auf der x-Achse (numerisch per Bisektion),
 * L4/L5 exakt an den Spitzen gleichseitiger Dreiecke (r₁ = r₂ = 1).
 */
export function lagrangePoints(mu: number): LagrangePoint[] {
  const fx = (x: number): number => potentialGradient(mu, x, 0)[0];
  const eps = 1e-12;
  const secondary = 1 - mu;
  return [
    { name: 'L1', x: bisect(fx, -mu + eps, secondary - eps), y: 0 },
    { name: 'L2', x: bisect(fx, secondary + eps, 2), y: 0 },
    { name: 'L3', x: bisect(fx, -2, -mu - eps), y: 0 },
    { name: 'L4', x: 0.5 - mu, y: Math.sqrt(3) / 2 },
    { name: 'L5', x: 0.5 - mu, y: -Math.sqrt(3) / 2 },
  ];
}

export interface Complex {
  re: number;
  im: number;
}

function complexSqrt(re: number, im: number): Complex {
  const r = Math.hypot(re, im);
  const a = Math.sqrt((r + re) / 2);
  const b = Math.sqrt(Math.max(0, (r - re) / 2));
  return { re: a, im: im < 0 ? -b : b };
}

export interface StabilityAnalysis {
  hessian: Hessian;
  /** Die vier Eigenwerte λ der linearisierten Bewegung. */
  eigenvalues: Complex[];
  /** Linear stabil, wenn alle Eigenwerte rein imaginär sind (Schwingung statt Wegdriften). */
  stable: boolean;
  /** Größter Realteil = Anwachsrate der Abweichung (0 bei Stabilität). */
  growthRate: number;
}

/**
 * Lineare Stabilitätsanalyse eines Gleichgewichtspunkts: Kleine Abweichungen (ξ, η) gehorchen
 * ξ'' − 2η' = Ωxx·ξ + Ωxy·η und η'' + 2ξ' = Ωxy·ξ + Ωyy·η. Der Ansatz e^{λt} führt auf
 * λ⁴ + (4 − Ωxx − Ωyy)·λ² + (Ωxx·Ωyy − Ωxy²) = 0.
 */
export function linearStability(mu: number, p: Point): StabilityAnalysis {
  const h = potentialHessian(mu, p.x, p.y);
  const b = 4 - h.xx - h.yy;
  const c = h.xx * h.yy - h.xy * h.xy;
  const disc = b * b - 4 * c;
  const roots: Complex[] =
    disc >= 0
      ? [
          { re: (-b + Math.sqrt(disc)) / 2, im: 0 },
          { re: (-b - Math.sqrt(disc)) / 2, im: 0 },
        ]
      : [
          { re: -b / 2, im: Math.sqrt(-disc) / 2 },
          { re: -b / 2, im: -Math.sqrt(-disc) / 2 },
        ];
  const eigenvalues: Complex[] = [];
  for (const s of roots) {
    const l = complexSqrt(s.re, s.im);
    eigenvalues.push(l, { re: -l.re, im: -l.im });
  }
  const growthRate = Math.max(...eigenvalues.map((l) => l.re));
  return { hessian: h, eigenvalues, stable: growthRate < 1e-9, growthRate };
}

export type State4 = [number, number, number, number];

/** Bewegungsgleichungen im rotierenden System (mit Coriolis-Kraft). */
export function derivatives(mu: number, s: State4): State4 {
  const [gx, gy] = potentialGradient(mu, s[0], s[1]);
  return [s[2], s[3], 2 * s[3] + gx, -2 * s[2] + gy];
}

export function rk4Step(mu: number, s: State4, dt: number): State4 {
  const add = (a: State4, k: State4, f: number): State4 => [
    a[0] + k[0] * f,
    a[1] + k[1] * f,
    a[2] + k[2] * f,
    a[3] + k[3] * f,
  ];
  const k1 = derivatives(mu, s);
  const k2 = derivatives(mu, add(s, k1, dt / 2));
  const k3 = derivatives(mu, add(s, k2, dt / 2));
  const k4 = derivatives(mu, add(s, k3, dt));
  return [
    s[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    s[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    s[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    s[3] + (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
  ];
}

/** Schrittweite, die in der Nähe der Hauptkörper automatisch kleiner wird. */
export function adaptiveStep(mu: number, x: number, y: number, eta = 0.01, maxDt = 0.01): number {
  const [r1, r2] = distances(mu, x, y);
  const t1 = Math.sqrt(r1 ** 3 / (1 - mu));
  const t2 = mu > 0 ? Math.sqrt(r2 ** 3 / mu) : Infinity;
  return Math.min(maxDt, eta * Math.min(t1, t2));
}

/** Integriert eine Bahn über die Zeit `duration` und liefert Punkte (x, y) im Abstand `sampleDt`. */
export function integrateOrbit(
  mu: number,
  start: State4,
  duration: number,
  sampleDt: number,
  stopRadius = 1e-3,
): { points: Point[]; state: State4; time: number; collided: boolean } {
  let s = start;
  let t = 0;
  let nextSample = 0;
  const points: Point[] = [];
  let collided = false;
  while (t < duration) {
    if (t >= nextSample) {
      points.push({ x: s[0], y: s[1] });
      nextSample += sampleDt;
    }
    const dt = Math.min(adaptiveStep(mu, s[0], s[1]), duration - t);
    s = rk4Step(mu, s, dt);
    t += dt;
    const [r1, r2] = distances(mu, s[0], s[1]);
    if (r1 < stopRadius || (mu > 0 && r2 < stopRadius * Math.cbrt(mu))) {
      collided = true;
      break;
    }
  }
  points.push({ x: s[0], y: s[1] });
  return { points, state: s, time: t, collided };
}

/** Näherung für den Abstand von L1/L2 zum kleineren Körper: r ≈ ∛(μ/3) (Hill-Radius). */
export function hillApproximation(mu: number): number {
  return Math.cbrt(mu / 3);
}

export interface JacobiCheck {
  mu: number;
  C: number;
  CL1: number;
  CL2: number;
  /** C > C_L1: Die Nullgeschwindigkeitsfläche ist um den Planeten geschlossen – der Mond kann nie entkommen. */
  trapped: boolean;
}

/**
 * Jacobi-Test für einen Mond im N-Körper-Zustand. Das System Stern–Planet wird als CR3BP
 * angenähert: Der Planet ruht im rotierenden System bei (1−μ, 0), der Mond ist ein Testteilchen.
 * Verwendet wird nur die Lage des Mondes *relativ zum Planeten* – so stört eine leicht
 * elliptische Planetenbahn den Test nicht. Positionen/Geschwindigkeiten in SI,
 * `gm` = G·(m_Stern + m_Planet), `mu` = m_Planet/(m_Stern + m_Planet).
 */
export function jacobiCheck(
  gm: number,
  mu: number,
  star: { x: number; y: number },
  planet: { x: number; y: number; vx: number; vy: number },
  moon: { x: number; y: number; vx: number; vy: number },
): JacobiCheck {
  const dx = planet.x - star.x;
  const dy = planet.y - star.y;
  const d = Math.hypot(dx, dy);
  const n = Math.sqrt(gm / d ** 3);
  const ux = dx / d;
  const uy = dy / d;
  const rx = moon.x - planet.x;
  const ry = moon.y - planet.y;
  // Geschwindigkeit im rotierenden System: v_rot = v_rel − ω × r_rel
  const wx = moon.vx - planet.vx + n * ry;
  const wy = moon.vy - planet.vy - n * rx;
  const X = 1 - mu + (rx * ux + ry * uy) / d;
  const Y = (-rx * uy + ry * ux) / d;
  const VX = (wx * ux + wy * uy) / (n * d);
  const VY = (-wx * uy + wy * ux) / (n * d);
  const C = jacobiConstant(mu, X, Y, VX, VY);
  const [l1, l2] = lagrangePoints(mu);
  const CL1 = jacobiConstant(mu, l1!.x, 0, 0, 0);
  const CL2 = jacobiConstant(mu, l2!.x, 0, 0, 0);
  return { mu, C, CL1, CL2, trapped: C > CL1 };
}
