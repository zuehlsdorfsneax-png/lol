import { jacobiConstant, lagrangePoints } from '../physics';

/** Ausschnitt des rotierenden Systems (normierte Einheiten). */
export interface LView {
  cx: number;
  cy: number;
  /** Halbe sichtbare Breite. */
  half: number;
}

/** 2Ω an einem Punkt (= Jacobi-Konstante eines ruhenden Teilchens). */
export function twoOmega(mu: number, x: number, y: number): number {
  return jacobiConstant(mu, x, y, 0, 0);
}

export interface Grid {
  nx: number;
  ny: number;
  values: Float64Array;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
}

/** Wertet 2Ω auf einem Raster über dem Ausschnitt aus. */
export function sampleGrid(
  mu: number,
  view: LView,
  width: number,
  height: number,
  cell: number,
): Grid {
  const nx = Math.max(2, Math.ceil(width / cell) + 1);
  const ny = Math.max(2, Math.ceil(height / cell) + 1);
  const scale = width / (2 * view.half);
  const x0 = view.cx - view.half;
  const y0 = view.cy + height / 2 / scale;
  // Rasterabstand genau `cell` Pixel; das Raster reicht etwas über den Rand hinaus.
  const dx = cell / scale;
  const dy = cell / scale;
  const values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 - j * dy;
    for (let i = 0; i < nx; i++) values[j * nx + i] = twoOmega(mu, x0 + i * dx, y);
  }
  return { nx, ny, values, x0, y0, dx, dy };
}

/**
 * Marching Squares: Höhenlinie `level` als Liste von Strecken in Rasterkoordinaten (Zelle i,j).
 */
export function contour(grid: Grid, level: number): number[] {
  const { nx, ny, values } = grid;
  const segs: number[] = [];
  const lerp = (a: number, b: number): number => (level - a) / (b - a);
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = values[j * nx + i]!;
      const b = values[j * nx + i + 1]!;
      const c = values[(j + 1) * nx + i + 1]!;
      const d = values[(j + 1) * nx + i]!;
      const code =
        (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      // Kantenpunkte: oben (a–b), rechts (b–c), unten (d–c), links (a–d).
      const top = (): [number, number] => [i + lerp(a, b), j];
      const right = (): [number, number] => [i + 1, j + lerp(b, c)];
      const bottom = (): [number, number] => [i + lerp(d, c), j + 1];
      const left = (): [number, number] => [i, j + lerp(a, d)];
      const add = (p: [number, number], q: [number, number]): void => {
        segs.push(p[0], p[1], q[0], q[1]);
      };
      switch (code) {
        case 1:
        case 14:
          add(left(), bottom());
          break;
        case 2:
        case 13:
          add(bottom(), right());
          break;
        case 3:
        case 12:
          add(left(), right());
          break;
        case 4:
        case 11:
          add(top(), right());
          break;
        case 5:
          add(left(), top());
          add(bottom(), right());
          break;
        case 6:
        case 9:
          add(top(), bottom());
          break;
        case 7:
        case 8:
          add(left(), top());
          break;
        case 10:
          add(left(), bottom());
          add(top(), right());
          break;
      }
    }
  }
  return segs;
}

/** Jacobi-Konstanten der Lagrange-Punkte (Grenzwerte der Nullgeschwindigkeitskurven). */
export function lagrangeLevels(mu: number): { name: string; C: number; x: number; y: number }[] {
  return lagrangePoints(mu).map((p) => ({
    name: p.name,
    x: p.x,
    y: p.y,
    C: twoOmega(mu, p.x, p.y),
  }));
}

/** Sequentielle Blau-Skala (hell = hohes effektives Potential −Ω, also "Hügel" bei L4/L5). */
const RAMP = [
  '#0b1a3a',
  '#0d366b',
  '#184f95',
  '#256abf',
  '#3987e5',
  '#6da7ec',
  '#9ec5f4',
  '#cde2fb',
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const RAMP_RGB = RAMP.map(hexToRgb);

export function rampColor(t: number): [number, number, number] {
  const u = Math.min(Math.max(t, 0), 1) * (RAMP_RGB.length - 1);
  const i = Math.min(Math.floor(u), RAMP_RGB.length - 2);
  const f = u - i;
  const a = RAMP_RGB[i]!;
  const b = RAMP_RGB[i + 1]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
