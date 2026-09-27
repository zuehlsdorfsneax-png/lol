export type RandomSource = () => number;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Zufallszahl im halboffenen Intervall [min, max). */
export function randomRange(min: number, max: number, random: RandomSource = Math.random): number {
  return min + random() * (max - min);
}

/** Ganzzahlige Zufallszahl zwischen min und max (beide inklusive). */
export function randomInt(min: number, max: number, random: RandomSource = Math.random): number {
  return Math.floor(randomRange(min, max + 1, random));
}
