import { describe, expect, it } from 'vitest';
import { haloCircles } from '../src/rocket/planets';
import { local, localSunDir, skyLayerSize, toScreen, type View } from '../src/rocket/view';

function viewUp(up: number): View {
  return { width: 800, height: 600, scale: 2, cx: 10, cy: -20, up, ox: 400, oy: 300 };
}

describe('Sonnenrichtung im lokalen System', () => {
  it('stimmt mit den Achsen überein, die local() auf den Bildschirm legt', () => {
    const x0 = 5000;
    const y0 = -3000;
    for (const up of [0, 1.1, Math.PI / 2, 4]) {
      const v = viewUp(up);
      for (const axis of [0, 0.7, Math.PI / 2, 3]) {
        for (const sun of [0.2, 1.5, Math.PI, -2.5]) {
          const calls: number[][] = [];
          const ctx = {
            transform: (...args: number[]) => calls.push(args),
          } as unknown as CanvasRenderingContext2D;
          local(ctx, v, x0, y0, axis);
          const [a, b, c, d] = calls[0]!;
          const ex = [a! / v.scale, b! / v.scale];
          const ey = [c! / v.scale, d! / v.scale];
          const [ox, oy] = toScreen(v, x0, y0);
          const [sx, sy] = toScreen(v, x0 + Math.cos(sun) * 1e6, y0 + Math.sin(sun) * 1e6);
          const len = Math.hypot(sx - ox, sy - oy);
          const [lx, ly] = localSunDir(sun, axis);
          expect((sx - ox) / len).toBeCloseTo(lx * ex[0]! + ly * ey[0]!, 6);
          expect((sy - oy) / len).toBeCloseTo(lx * ex[1]! + ly * ey[1]!, 6);
        }
      }
    }
  });

  it('zeigt bei Sonne auf der Achse nach außen und bei Sonne über dem Horizont nach oben', () => {
    expect(localSunDir(1.2, 1.2)).toEqual([0, 1]);
    const [lx, ly] = localSunDir(Math.PI / 2, 0);
    expect(lx).toBeCloseTo(-1, 9);
    expect(ly).toBeCloseTo(0, 9);
  });
});

describe('Schein der Lufthülle', () => {
  it('ohne Sonnenrichtung bleibt der Verlauf um die Mitte', () => {
    const h = haloCircles(100, 50, 40, 10, 0.96, null);
    expect(h.x).toBe(100);
    expect(h.y).toBe(50);
    expect(h.inner).toBeCloseTo(0.96 * 40, 9);
    expect(h.outer).toBe(50);
  });

  it('auf der Sonnenseite reicht der Schein so weit wie ohne Verschiebung', () => {
    const rpx = 300;
    const glow = 12;
    const h = haloCircles(0, 0, rpx, glow, 0.98, 0);
    expect(h.x + h.outer).toBeCloseTo(rpx + glow, 9);
    expect(h.x + h.inner).toBeCloseTo(0.98 * rpx, 9);
  });

  it('auf der Nachtseite endet der Schein am Körperrand, bei jeder Sonnenrichtung', () => {
    const rpx = 300;
    const glow = 12;
    for (const sun of [0, 0.8, 2, 3.14, -1.6]) {
      const h = haloCircles(0, 0, rpx, glow, 0.98, sun);
      const nightRimX = -Math.cos(sun) * rpx;
      const nightRimY = -Math.sin(sun) * rpx;
      expect(Math.hypot(nightRimX - h.x, nightRimY - h.y)).toBeGreaterThanOrEqual(h.outer - 1e-9);
    }
  });

  it('läuft der Verlauf am inneren Ende nicht unter null', () => {
    expect(haloCircles(0, 0, 4, 30, 0.96, 0).inner).toBe(0);
  });
});

describe('Himmelsebene', () => {
  it('folgt der Pixeldichte, gerundet auf 128 Pixel', () => {
    expect(skyLayerSize(500, 1)).toBe(512);
    expect(skyLayerSize(500, 2)).toBe(1024);
    expect(skyLayerSize(500, 0.75)).toBe(384);
    expect(skyLayerSize(1000, 1)).toBeGreaterThanOrEqual(1000);
  });

  it('bleibt bei höchstens 1536 Pixeln, auch auf dichten Displays', () => {
    expect(skyLayerSize(1633, 1)).toBe(1536);
    expect(skyLayerSize(1000, 3)).toBe(1536);
  });
});
