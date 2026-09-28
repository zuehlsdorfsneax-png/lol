/**
 * Zwei-Körper-Bahnen (Kepler): Bahnelemente aus Ort und Geschwindigkeit, Ort zu einer späteren
 * Zeit und die Zeit bis zum höchsten oder tiefsten Bahnpunkt. Die Bahn liegt in der Ebene; `dir`
 * ist +1 gegen und −1 im Uhrzeigersinn (so fliegen alle Körper im Spiel).
 */

export interface Elements {
  mu: number;
  /** Große Halbachse (negativ bei Hyperbeln). */
  a: number;
  e: number;
  /** Richtung des tiefsten Punkts (Periapsis). */
  argp: number;
  /** Mittlere Anomalie zur Zeit t0 (bei Hyperbeln: hyperbolische mittlere Anomalie). */
  m0: number;
  t0: number;
  /** Mittlere Bewegung (rad/s). */
  n: number;
  dir: 1 | -1;
  /** Bahnparameter p = h²/μ. */
  p: number;
}

function wrapPi(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function mod2pi(a: number): number {
  const t = a % (2 * Math.PI);
  return t < 0 ? t + 2 * Math.PI : t;
}

export function elements(
  mu: number,
  rx: number,
  ry: number,
  vx: number,
  vy: number,
  t0 = 0,
): Elements {
  const r = Math.hypot(rx, ry);
  const v2 = vx * vx + vy * vy;
  const h = rx * vy - ry * vx;
  const dir: 1 | -1 = h >= 0 ? 1 : -1;
  const rv = rx * vx + ry * vy;
  const ex = ((v2 - mu / r) * rx - rv * vx) / mu;
  const ey = ((v2 - mu / r) * ry - rv * vy) / mu;
  let e = Math.hypot(ex, ey);
  const argp = e > 1e-9 ? Math.atan2(ey, ex) : Math.atan2(ry, rx);
  if (e < 1e-9) e = 0;
  const a = 1 / (2 / r - v2 / mu);
  const p = (h * h) / mu;
  const nu = dir * wrapPi(Math.atan2(ry, rx) - argp);
  let m0: number;
  let n: number;
  if (e < 1) {
    const E =
      2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
    m0 = mod2pi(E - e * Math.sin(E));
    n = Math.sqrt(mu / a ** 3);
  } else {
    const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
    m0 = e * Math.sinh(F) - F;
    n = Math.sqrt(mu / (-a) ** 3);
  }
  return { mu, a, e, argp, m0, t0, n, dir, p };
}

/** Wahre Anomalie zur Zeit t. */
function trueAnomaly(el: Elements, t: number): number {
  const { e } = el;
  const M = el.m0 + el.n * (t - el.t0);
  if (e < 1) {
    const m = mod2pi(M);
    let E = e < 0.8 ? m : Math.PI;
    for (let i = 0; i < 30; i++) {
      const d = (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-12) break;
    }
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }
  let F = Math.asinh(M / e);
  for (let i = 0; i < 50; i++) {
    const d = (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
    F -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(F / 2));
}

/** Ort und Geschwindigkeit relativ zum Zentralkörper zur Zeit t. */
export function stateAt(el: Elements, t: number): [number, number, number, number] {
  const nu = trueAnomaly(el, t);
  const r = el.p / (1 + el.e * Math.cos(nu));
  const th = el.argp + el.dir * nu;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const k = Math.sqrt(el.mu / el.p);
  const vr = k * el.e * Math.sin(nu);
  const vt = k * (1 + el.e * Math.cos(nu)) * el.dir;
  return [r * c, r * s, vr * c - vt * s, vr * s + vt * c];
}

/** Zeit bis zum nächsten tiefsten Punkt (bei Hyperbeln nur, solange er noch vor uns liegt). */
export function timeToPeriapsis(el: Elements, t: number): number {
  const M = el.m0 + el.n * (t - el.t0);
  if (el.e < 1) return mod2pi(-M) / el.n;
  return M < 0 ? -M / el.n : Infinity;
}

/** Zeit bis zum nächsten höchsten Punkt (nur bei Ellipsen). */
export function timeToApoapsis(el: Elements, t: number): number {
  if (el.e >= 1) return Infinity;
  const M = el.m0 + el.n * (t - el.t0);
  return mod2pi(Math.PI - M) / el.n;
}

/** Mittlere Anomalie zu einer wahren Anomalie. */
function meanAnomaly(e: number, nu: number): number {
  if (e < 1) {
    const E =
      2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
    return E - e * Math.sin(E);
  }
  const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
  return e * Math.sinh(F) - F;
}

/** Zeit, bis die Bahn auf dem Weg nach innen den Abstand r erreicht (∞ = nie). */
export function timeToRadius(el: Elements, t: number, r: number): number {
  const { e, p } = el;
  if (e < 1e-9) return Infinity;
  const c = (p / r - 1) / e;
  if (c > 1 || c < -1) return Infinity;
  const target = meanAnomaly(e, -Math.acos(c));
  const now = el.m0 + el.n * (t - el.t0);
  if (e < 1) return mod2pi(target - now) / el.n;
  return target > now ? (target - now) / el.n : Infinity;
}

export function period(el: Elements): number {
  return el.e < 1 ? (2 * Math.PI) / el.n : Infinity;
}
