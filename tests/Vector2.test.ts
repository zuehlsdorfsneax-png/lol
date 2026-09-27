import { describe, expect, it } from 'vitest';
import { Vector2 } from '../src/engine';

describe('Vector2', () => {
  it('rechnet ohne die Ausgangsvektoren zu verändern', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);
    expect(a.add(b)).toEqual(new Vector2(4, 6));
    expect(b.sub(a)).toEqual(new Vector2(2, 2));
    expect(a.scale(3)).toEqual(new Vector2(3, 6));
    expect(a).toEqual(new Vector2(1, 2));
  });

  it('berechnet Länge, Abstand und Skalarprodukt', () => {
    expect(new Vector2(3, 4).length()).toBe(5);
    expect(new Vector2(3, 4).lengthSquared()).toBe(25);
    expect(new Vector2(1, 1).distanceTo(new Vector2(4, 5))).toBe(5);
    expect(new Vector2(1, 2).dot(new Vector2(3, 4))).toBe(11);
  });

  it('normalisiert auf Länge 1 und lässt den Nullvektor unverändert', () => {
    expect(new Vector2(10, 0).normalize()).toEqual(new Vector2(1, 0));
    expect(new Vector2(3, 4).normalize().length()).toBeCloseTo(1);
    expect(new Vector2().normalize()).toEqual(new Vector2(0, 0));
  });

  it('interpoliert und erzeugt Vektoren aus Winkeln', () => {
    expect(new Vector2(0, 0).lerp(new Vector2(10, 20), 0.25)).toEqual(new Vector2(2.5, 5));
    expect(Vector2.fromAngle(Math.PI / 2, 2).equals(new Vector2(0, 2))).toBe(true);
  });

  it('verändert sich mit set und copy selbst', () => {
    const v = new Vector2();
    expect(v.set(5, 6)).toBe(v);
    expect(v.copy(new Vector2(7, 8))).toEqual(new Vector2(7, 8));
  });
});
