/** "Schöne" Achsenteilung mit Schritten 1, 2, 2,5 oder 5 × 10ⁿ. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const raw = span / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step)
    ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return ticks;
}

/** Zehnerpotenzen im Bereich (für logarithmische Achsen). */
export function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  const a = Math.floor(Math.log10(min));
  const b = Math.ceil(Math.log10(max));
  const every = Math.max(1, Math.ceil((b - a) / 6));
  for (let e = a; e <= b; e += every) {
    const v = 10 ** e;
    if (v >= min * 0.999 && v <= max * 1.001) ticks.push(v);
  }
  return ticks;
}

/** Erweitert einen Bereich auf die nächsten "schönen" Ticks. */
export function niceRange(min: number, max: number, target = 5): [number, number] {
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    return [min - d, max + d];
  }
  const t = niceTicks(min, max, target);
  const step = t.length > 1 ? t[1]! - t[0]! : (max - min) / target;
  return [Math.floor(min / step - 1e-9) * step, Math.ceil(max / step - 1e-9) * step];
}
