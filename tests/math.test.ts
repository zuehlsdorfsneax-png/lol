import { describe, expect, it } from 'vitest';
import {
  circleIntersectsRect,
  circlesIntersect,
  clamp,
  lerp,
  pointInRect,
  randomInt,
  randomRange,
  rectsIntersect,
} from '../src/engine';

describe('utils', () => {
  it('begrenzt und interpoliert Werte', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('nutzt die übergebene Zufallsquelle', () => {
    expect(randomRange(10, 20, () => 0.5)).toBe(15);
    expect(randomInt(1, 6, () => 0)).toBe(1);
    expect(randomInt(1, 6, () => 0.999999)).toBe(6);
  });
});

describe('collision', () => {
  const rect = { x: 0, y: 0, width: 10, height: 10 };

  it('erkennt Punkte in Rechtecken inklusive Rand', () => {
    expect(pointInRect(5, 5, rect)).toBe(true);
    expect(pointInRect(10, 10, rect)).toBe(true);
    expect(pointInRect(11, 5, rect)).toBe(false);
  });

  it('erkennt überlappende Rechtecke, aber nicht bloßes Berühren', () => {
    expect(rectsIntersect(rect, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsIntersect(rect, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
    expect(rectsIntersect(rect, { x: 20, y: 20, width: 5, height: 5 })).toBe(false);
  });

  it('erkennt überlappende Kreise', () => {
    expect(circlesIntersect({ x: 0, y: 0, radius: 5 }, { x: 8, y: 0, radius: 5 })).toBe(true);
    expect(circlesIntersect({ x: 0, y: 0, radius: 5 }, { x: 10, y: 0, radius: 5 })).toBe(false);
  });

  it('erkennt Kreis-Rechteck-Überlappung auch an Ecken', () => {
    expect(circleIntersectsRect({ x: 5, y: 5, radius: 1 }, rect)).toBe(true);
    expect(circleIntersectsRect({ x: 13, y: 5, radius: 4 }, rect)).toBe(true);
    // Diagonal neben der Ecke (10, 10): Abstand ≈ 4,24 > Radius 4
    expect(circleIntersectsRect({ x: 13, y: 13, radius: 4 }, rect)).toBe(false);
  });
});
