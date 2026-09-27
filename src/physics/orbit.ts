/** Bahnelemente einer Zwei-Körper-Relativbewegung (eben). */
export interface OrbitalElements {
  /** Abstand und Relativgeschwindigkeit. */
  r: number;
  v: number;
  /** Spezifische Bahnenergie ε = v²/2 − μ/r (negativ = gebunden). */
  energy: number;
  bound: boolean;
  /** Große Halbachse (bei ungebundener Bahn negativ). */
  a: number;
  e: number;
  /** Argument der Periapsis (Richtung des nächsten Punkts) in rad. */
  omega: number;
  periapsis: number;
  /** Apoapsis – `Infinity` bei ungebundener Bahn. */
  apoapsis: number;
  /** Umlaufzeit – `NaN` bei ungebundener Bahn. */
  period: number;
  /** Spezifischer Drehimpuls (Vorzeichen = Umlaufsinn, positiv = gegen den Uhrzeigersinn). */
  h: number;
}

/**
 * Berechnet die oskulierenden Bahnelemente aus relativer Position und Geschwindigkeit.
 * `mu` = G·(m₁ + m₂).
 */
export function orbitalElements(
  mu: number,
  dx: number,
  dy: number,
  dvx: number,
  dvy: number,
): OrbitalElements {
  const r = Math.hypot(dx, dy);
  const v2 = dvx * dvx + dvy * dvy;
  const energy = v2 / 2 - mu / r;
  const h = dx * dvy - dy * dvx;
  const rv = dx * dvx + dy * dvy;
  // Exzentrizitätsvektor e = ((v² − μ/r)·r − (r·v)·v) / μ
  const ex = ((v2 - mu / r) * dx - rv * dvx) / mu;
  const ey = ((v2 - mu / r) * dy - rv * dvy) / mu;
  const e = Math.hypot(ex, ey);
  const bound = energy < 0;
  const a = -mu / (2 * energy);
  const periapsis = (h * h) / (mu * (1 + e));
  return {
    r,
    v: Math.sqrt(v2),
    energy,
    bound,
    a,
    e,
    omega: Math.atan2(ey, ex),
    periapsis,
    apoapsis: bound && e < 1 ? a * (1 + e) : Infinity,
    period: bound ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : NaN,
    h,
  };
}

export function circularSpeed(mu: number, r: number): number {
  return Math.sqrt(mu / r);
}

export function escapeSpeed(mu: number, r: number): number {
  return Math.sqrt((2 * mu) / r);
}

/** Vis-viva-Gleichung: Bahngeschwindigkeit im Abstand r auf einer Bahn mit Halbachse a. */
export function visViva(mu: number, r: number, a: number): number {
  return Math.sqrt(mu * (2 / r - 1 / a));
}

/**
 * Periapsis einer Bahn, die im Abstand r₀ tangential mit f·v_Kreis startet (Zwei-Körper).
 * Für f < 1 ist der Start die Apoapsis, für f > 1 die Periapsis.
 */
export function periapsisFromTangentialStart(r0: number, speedFactor: number): number {
  const f2 = speedFactor * speedFactor;
  if (f2 >= 1) return r0;
  return (r0 * f2) / (2 - f2);
}

/** Exzentrizität einer Bahn mit tangentialem Start bei f·v_Kreis. */
export function eccentricityFromTangentialStart(speedFactor: number): number {
  return Math.abs(speedFactor * speedFactor - 1);
}
