/**
 * Bahnen in einem Zentralkraftfeld F ∝ 1/rⁿ (normierte Einheiten: Startradius 1,
 * Kreisbahngeschwindigkeit 1). Zeigt, warum gerade n = 2 geschlossene, stabile Bahnen liefert
 * (Satz von Bertrand).
 */

export type ForceLawOutcome = 'bound' | 'crash' | 'escape';

export interface ForceLawOrbit {
  points: { x: number; y: number }[];
  outcome: ForceLawOutcome;
  /** Gemessener Winkel zwischen zwei aufeinanderfolgenden Periapsen in Grad (NaN, falls keine). */
  apsidalAngle: number;
}

/** Theoretischer Apsidenwinkel (Peri → Apo) für fast kreisförmige Bahnen: π/√(3 − n). */
export function theoreticalApsidalAngle(n: number): number {
  return n < 3 ? 180 / Math.sqrt(3 - n) : NaN;
}

export function simulateForceLaw(
  exponent: number,
  speedFactor: number,
  duration = 60,
  baseDt = 0.002,
): ForceLawOrbit {
  let x = 1;
  let y = 0;
  let vx = 0;
  let vy = speedFactor;
  const acc = (px: number, py: number): [number, number] => {
    const r = Math.hypot(px, py);
    const f = -1 / r ** (exponent + 1);
    return [px * f, py * f];
  };
  let [ax, ay] = acc(x, y);
  const points = [{ x, y }];
  let outcome: ForceLawOutcome = 'bound';
  let prevR = 1;
  let prevDr = 0;
  let t = 0;
  let nextSample = 0.02;
  // Aufsummierter Bahnwinkel, damit auch ein voller Umlauf (360°) messbar ist.
  let theta = 0;
  let prevAngle = 0;
  const periapsisAngles: number[] = [];
  while (t < duration) {
    // Schrittweite ∝ Freifallzeit √(r^(n+1)): nahe am Zentrum automatisch feiner.
    const r0 = Math.hypot(x, y);
    const dt = baseDt * Math.min(1, r0 ** ((exponent + 1) / 2));
    vx += ax * dt * 0.5;
    vy += ay * dt * 0.5;
    x += vx * dt;
    y += vy * dt;
    [ax, ay] = acc(x, y);
    vx += ax * dt * 0.5;
    vy += ay * dt * 0.5;
    t += dt;
    const r = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    let dTheta = angle - prevAngle;
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    theta += dTheta;
    prevAngle = angle;
    const dr = r - prevR;
    if (prevDr < 0 && dr >= 0) periapsisAngles.push(theta);
    prevDr = dr;
    prevR = r;
    if (t >= nextSample) {
      points.push({ x, y });
      nextSample += 0.02;
    }
    if (r < 0.03) {
      outcome = 'crash';
      break;
    }
    if (r > 30) {
      outcome = 'escape';
      break;
    }
  }
  points.push({ x, y });
  let apsidalAngle = NaN;
  if (periapsisAngles.length >= 2) {
    apsidalAngle = ((periapsisAngles[1]! - periapsisAngles[0]!) * 180) / Math.PI;
  }
  return { points, outcome, apsidalAngle };
}
