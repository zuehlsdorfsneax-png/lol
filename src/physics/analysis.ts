/** Hilfsfunktionen zur Auswertung von Messreihen. */

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(xs: ArrayLike<number>, ys: ArrayLike<number>): Regression {
  const n = Math.min(xs.length, ys.length);
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]!;
    sy += ys[i]!;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return {
    slope,
    intercept: my - slope * mx,
    r2: sxx === 0 || syy === 0 ? 1 : (sxy * sxy) / (sxx * syy),
  };
}

/** Entfernt Sprünge um 2π aus einer Winkelreihe. */
export function unwrap(angles: ArrayLike<number>): number[] {
  const out: number[] = [];
  let offset = 0;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i]!;
    if (i > 0) {
      const d = a + offset - out[i - 1]!;
      if (d > Math.PI) offset -= 2 * Math.PI;
      else if (d < -Math.PI) offset += 2 * Math.PI;
    }
    out.push(a + offset);
  }
  return out;
}

/** Winkel auf (−π, π]. */
export function wrapAngle(a: number): number {
  let r = a % (2 * Math.PI);
  if (r <= -Math.PI) r += 2 * Math.PI;
  if (r > Math.PI) r -= 2 * Math.PI;
  return r;
}
