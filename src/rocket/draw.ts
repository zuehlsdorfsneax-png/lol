import { smoothPath } from '../sim/view';
import { part, segments, type PartDef } from './parts';
import type { Flight, Prediction } from './flight';
import {
  BODIES,
  EARTH,
  JUPITER,
  MARS,
  MOON,
  PHOBOS,
  STATION,
  SUN,
  VENUS,
  bodyState,
  orbitAngle,
  stationState,
  type Body,
} from './world';

// ------------------------------------------------------------------ Bauteile

export interface Paint {
  id: string;
  name: string;
  /** Punkte, ab denen die Lackierung freigeschaltet ist. */
  points: number;
  metal: [string, string, string];
  stripe: string;
  band: string;
}

export const PAINTS: readonly Paint[] = [
  {
    id: 'klassisch',
    name: 'Klassisch',
    points: 0,
    metal: ['#c9d1dc', '#ffffff', '#aeb7c4'],
    stripe: '#e0503a',
    band: '#2f5fbf',
  },
  {
    id: 'nacht',
    name: 'Nachtflug',
    points: 50,
    metal: ['#1f2a44', '#3b4d78', '#18203a'],
    stripe: '#38bdf8',
    band: '#a78bfa',
  },
  {
    id: 'feuer',
    name: 'Feuervogel',
    points: 120,
    metal: ['#d9480f', '#ff8a3d', '#b83a0a'],
    stripe: '#ffd43b',
    band: '#1b1b1b',
  },
  {
    id: 'arktis',
    name: 'Arktis',
    points: 250,
    metal: ['#d7f0f7', '#ffffff', '#b5dbe8'],
    stripe: '#0ea5a5',
    band: '#155e75',
  },
  {
    id: 'gold',
    name: 'Goldrakete',
    points: 450,
    metal: ['#b8860b', '#ffe08a', '#8a6508'],
    stripe: '#2b2b2b',
    band: '#7c2d12',
  },
  {
    id: 'galaxie',
    name: 'Galaxie',
    points: 700,
    metal: ['#312e81', '#7c3aed', '#1e1b4b'],
    stripe: '#f472b6',
    band: '#22d3ee',
  },
];

let paint: Paint = PAINTS[0]!;
let METAL: string[] = paint.metal;

/** Lackierung für alle folgenden Zeichnungen wählen. */
export function setPaint(id: string): void {
  paint = PAINTS.find((p) => p.id === id) ?? PAINTS[0]!;
  METAL = paint.metal;
}

function hGrad(ctx: CanvasRenderingContext2D, w: number, stops: string[]): CanvasGradient {
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, stops[0]!);
  g.addColorStop(0.38, stops[1]!);
  g.addColorStop(1, stops[2]!);
  return g;
}

/** Zeichnet ein Bauteil; Koordinaten in Metern, y nach oben, Unterkante bei y0. */
export function drawPart(
  ctx: CanvasRenderingContext2D,
  def: PartDef,
  y0: number,
  footY = y0,
): void {
  const { width: w, height: h } = def;
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = 'rgba(20,26,40,0.55)';
  switch (def.kind) {
    case 'tank': {
      ctx.fillStyle = hGrad(ctx, w, METAL);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      ctx.fillStyle = paint.stripe;
      ctx.fillRect(-w / 2, y0 + h - 0.28, w, 0.28);
      ctx.fillRect(-w / 2, y0, w, 0.28);
      if (h > 4) {
        ctx.fillStyle = paint.band;
        ctx.fillRect(-w / 2, y0 + h * 0.5 - 0.35, w, 0.7);
      }
      // Glanzlinie
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-w * 0.22, y0 + 0.4, w * 0.07, h - 0.8);
      break;
    }
    case 'capsule': {
      const top = w * 0.36;
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0);
      ctx.lineTo(w / 2, y0);
      ctx.lineTo(top / 2, y0 + h);
      ctx.lineTo(-top / 2, y0 + h);
      ctx.closePath();
      ctx.fillStyle = hGrad(ctx, w, METAL);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = paint.stripe;
      ctx.fillRect(-w / 2, y0, w, 0.2);
      ctx.beginPath();
      ctx.arc(0, y0 + h * 0.45, w * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = '#1b2a4a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-w * 0.04, y0 + h * 0.48, w * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160,210,255,0.8)';
      ctx.fill();
      break;
    }
    case 'chute': {
      ctx.beginPath();
      ctx.ellipse(0, y0, w / 2, h, 0, 0, Math.PI);
      ctx.fillStyle = '#f28c28';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-0.06, y0, 0.12, h * 0.9);
      break;
    }
    case 'engine': {
      const mountH = h * 0.3;
      ctx.fillStyle = '#59616e';
      ctx.fillRect(-w * 0.3, y0 + h - mountH, w * 0.6, mountH);
      ctx.beginPath();
      ctx.moveTo(-w * 0.22, y0 + h - mountH);
      ctx.lineTo(w * 0.22, y0 + h - mountH);
      ctx.quadraticCurveTo(w * 0.28, y0 + h * 0.3, w / 2, y0);
      ctx.lineTo(-w / 2, y0);
      ctx.quadraticCurveTo(-w * 0.28, y0 + h * 0.3, -w * 0.22, y0 + h - mountH);
      ctx.closePath();
      ctx.fillStyle = hGrad(ctx, w, ['#2a2f38', '#8d96a6', '#23272f']);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a1d23';
      ctx.fillRect(-w / 2, y0, w, 0.08);
      break;
    }
    case 'decoupler': {
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w / 2, y0, w, h);
      ctx.clip();
      ctx.fillStyle = '#f2c230';
      for (let x = -w / 2 - h; x < w / 2; x += 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x + 0.25, y0);
        ctx.lineTo(x + 0.25 + h, y0 + h);
        ctx.lineTo(x + h, y0 + h);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'booster': {
      ctx.fillStyle = '#59616e';
      ctx.fillRect(-w / 2 - 0.3, y0, w + 0.6, h);
      const foot = Math.min(footY, y0);
      const top = y0 + h + 1.4;
      for (const sgn of [-1, 1]) {
        const cx = sgn * (w / 2 + 0.62);
        const bw = 1.1;
        ctx.fillStyle = hGrad(ctx, bw, METAL);
        ctx.save();
        ctx.translate(cx, 0);
        ctx.fillRect(-bw / 2, foot + 0.6, bw, top - foot - 0.6);
        ctx.strokeRect(-bw / 2, foot + 0.6, bw, top - foot - 0.6);
        ctx.fillStyle = paint.stripe;
        ctx.fillRect(-bw / 2, top - 0.9, bw, 0.25);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, top);
        ctx.quadraticCurveTo(0, top + 1.8, bw / 2, top);
        ctx.closePath();
        ctx.fillStyle = '#e8ecf2';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#3b414c';
        ctx.beginPath();
        ctx.moveTo(-bw * 0.3, foot + 0.6);
        ctx.lineTo(bw * 0.3, foot + 0.6);
        ctx.lineTo(bw * 0.45, foot);
        ctx.lineTo(-bw * 0.45, foot);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'legs': {
      ctx.fillStyle = '#6b7380';
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeStyle = '#3b414c';
      ctx.lineWidth = 0.22;
      ctx.lineCap = 'round';
      const foot = Math.min(footY, y0) - 0.1;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo((sgn * w) / 2, y0 + h * 0.6);
        ctx.lineTo(sgn * (w / 2 + 1.4), foot + 0.3);
        ctx.stroke();
        ctx.fillStyle = '#3b414c';
        ctx.fillRect(sgn * (w / 2 + 1.4) - 0.45, foot, 0.9, 0.25);
      }
      break;
    }
  }
}

export interface RocketLook {
  throttle: number;
  /** Luftdichte (für die Flammenform). */
  air: number;
  chuteOpen: number;
  time: number;
}

/** Zeichnet eine Rakete (Teile von oben nach unten); Ursprung = Unterkante, y nach oben. */
export function drawRocket(
  ctx: CanvasRenderingContext2D,
  parts: string[],
  look?: RocketLook,
): void {
  // Unterkante jedes Segments für die Landebeine.
  const segs = segments(parts);
  const bottoms = new Map<number, number>();
  let y = 0;
  let index = parts.length;
  for (let s = segs.length - 1; s >= 0; s--) {
    const seg = segs[s]!;
    const segBottom = y;
    for (let k = seg.length - 1; k >= 0; k--) {
      index--;
      bottoms.set(index, segBottom);
      y += part(seg[k]!).height;
    }
  }
  const top = y;

  if (look && look.throttle > 0) {
    drawFlame(ctx, parts, look);
    // Seitenbooster der untersten Stufe brennen mit.
    const bottom = segs[segs.length - 1] ?? [];
    if (bottom.includes('booster')) {
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(sgn * 1.82, 0);
        drawFlame(ctx, parts, look, 0.95);
        ctx.restore();
      }
    }
  }

  y = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const def = part(parts[i]!);
    if (def.kind === 'chute' && look && look.chuteOpen > 0) {
      y += def.height;
      continue;
    }
    drawPart(ctx, def, y, bottoms.get(i) ?? 0);
    y += def.height;
  }

  if (look && look.chuteOpen > 0) drawChute(ctx, top, look.chuteOpen);
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  parts: string[],
  look: RocketLook,
  width?: number,
): void {
  const engine = [...parts].reverse().find((id) => part(id).kind === 'engine');
  const w = width ?? (engine ? part(engine).width * 0.9 : 1.6);
  const vacuum = 1 - Math.min(1, look.air / 1.2);
  const flicker = 0.85 + 0.15 * Math.sin(look.time * 47) * Math.sin(look.time * 31);
  const len = (5 + 12 * look.throttle) * (1 + vacuum * 0.6) * flicker;
  const spread = w * (0.55 + vacuum * 0.3);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  g.addColorStop(0, 'rgba(255,255,240,0.95)');
  g.addColorStop(0.25, 'rgba(255,214,102,0.9)');
  g.addColorStop(0.6, 'rgba(255,120,40,0.55)');
  g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-spread, -len * 0.35, 0, -len);
  ctx.quadraticCurveTo(spread, -len * 0.35, w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-w * 0.25, 0);
  ctx.quadraticCurveTo(0, -len * 0.45, w * 0.25, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
}

function drawChute(ctx: CanvasRenderingContext2D, top: number, open: number): void {
  const w = 3 + 15 * open;
  const hgt = 2 + 5 * open;
  const y = top + 6 + 12 * open;
  ctx.strokeStyle = 'rgba(240,240,240,0.8)';
  ctx.lineWidth = 0.08;
  for (const x of [-w / 2, -w / 4, 0, w / 4, w / 2]) {
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, y, w / 2, hgt, 0, 0, Math.PI);
  ctx.fillStyle = '#f28c28';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  for (let k = -2; k <= 2; k += 2) ctx.fillRect((k * w) / 10 - w / 20, y, w / 10, hgt);
  ctx.restore();
}

// ------------------------------------------------------------------ Kamera

export interface View {
  width: number;
  height: number;
  /** Pixel pro Meter. */
  scale: number;
  /** Weltpunkt in der Bildmitte. */
  cx: number;
  cy: number;
  /** Drehung: dieser Weltwinkel zeigt auf dem Bildschirm nach oben. */
  up: number;
  /** Bildschirmpunkt, auf den (cx, cy) fällt. */
  ox: number;
  oy: number;
}

function toScreen(v: View, x: number, y: number): [number, number] {
  const rot = v.up - Math.PI / 2;
  const dx = x - v.cx;
  const dy = y - v.cy;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  const u = dx * c - dy * s;
  const w = dx * s + dy * c;
  return [v.ox + u * v.scale, v.oy - w * v.scale];
}

/** Lokales Koordinatensystem (m, y entlang `axis`) an einem Weltpunkt. */
function local(
  ctx: CanvasRenderingContext2D,
  v: View,
  x: number,
  y: number,
  axis: number,
  scale = v.scale,
): void {
  const [sx, sy] = toScreen(v, x, y);
  const th = axis - (v.up - Math.PI / 2);
  const s = Math.sin(th);
  const c = Math.cos(th);
  ctx.transform(s * scale, c * scale, c * scale, -s * scale, sx, sy);
}

// ------------------------------------------------------------------ Hintergrund

const STARS = Array.from({ length: 220 }, (_, i) => {
  const r = (n: number): number => (((Math.sin(i * 91.345 + n * 47.853) * 24634.6345) % 1) + 1) % 1;
  return { x: r(1), y: r(2), s: 0.4 + r(3) * 1.3, a: 0.35 + r(4) * 0.65 };
});

function drawStars(ctx: CanvasRenderingContext2D, v: View, alpha: number, spin: number): void {
  if (alpha <= 0.01) return;
  const { width: W, height: H } = v;
  const R = Math.hypot(W, H) / 2;
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  ctx.fillStyle = '#ffffff';
  for (const st of STARS) {
    const px = (st.x - 0.5) * 2 * R;
    const py = (st.y - 0.5) * 2 * R;
    const x = W / 2 + px * c - py * s;
    const y = H / 2 + px * s + py * c;
    if (x < 0 || x > W || y < 0 || y > H) continue;
    ctx.globalAlpha = st.a * alpha;
    ctx.fillRect(x, y, st.s, st.s);
  }
  ctx.globalAlpha = 1;
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((x, i) => Math.round(x + (pb[i]! - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ------------------------------------------------------------------ Himmelskörper

/** Landmassen der Erde als Winkelbereiche (Grad). Die Startrampe liegt bei 90°. */
const LAND: readonly [number, number][] = [
  [62, 128],
  [150, 196],
  [236, 262],
  [292, 338],
  [8, 24],
];

/** Mondkrater: Winkel (Grad, mitrotierend), Abstand (Anteil des Radius), Radius (Anteil). */
const CRATERS: readonly [number, number, number][] = [
  [20, 0.55, 0.16],
  [75, 0.3, 0.1],
  [130, 0.7, 0.12],
  [200, 0.45, 0.2],
  [250, 0.82, 0.08],
  [300, 0.35, 0.13],
  [340, 0.75, 0.1],
  [160, 0.15, 0.07],
  [95, 0.9, 0.05],
  [230, 0.95, 0.04],
  [10, 0.93, 0.05],
  [280, 0.6, 0.06],
];

/**
 * Pfad eines Kreissektors eines Körpers. Bei starker Vergrößerung nur der sichtbare Ausschnitt,
 * als Streifen unter der Oberfläche – so bleiben die Bildschirmkoordinaten klein.
 */
function sectorPath(
  ctx: CanvasRenderingContext2D,
  v: View,
  bx: number,
  by: number,
  R: number,
  a0: number,
  a1: number,
): boolean {
  const reach = Math.hypot(v.width, v.height) / v.scale;
  const [ccx, ccy] = [v.cx, v.cy];
  const d = Math.hypot(ccx - bx, ccy - by);
  if (d - reach > R) return false;
  let lo = a0;
  let hi = a1;
  let depth = R;
  if (R * v.scale > 20_000 && d > reach) {
    const phi = Math.atan2(ccy - by, ccx - bx);
    const cosD = (d * d + R * R - reach * reach) / (2 * d * R);
    const half = cosD <= -1 ? Math.PI : Math.acos(Math.min(1, cosD)) + 0.001;
    // Sichtbares Fenster mit dem Sektor schneiden (Winkel auf phi beziehen).
    const rel0 = phi + Math.atan2(Math.sin(a0 - phi), Math.cos(a0 - phi));
    const rel1 = rel0 + (a1 - a0);
    lo = Math.max(rel0, phi - half);
    hi = Math.min(rel1, phi + half);
    if (a1 - a0 >= 2 * Math.PI - 1e-9) {
      lo = phi - half;
      hi = phi + half;
    }
    if (hi <= lo) return false;
    depth = Math.min(R, 2 * reach);
  } else if (a1 - a0 >= 2 * Math.PI - 1e-9) {
    const [sx, sy] = toScreen(v, bx, by);
    ctx.moveTo(sx + R * v.scale, sy);
    ctx.arc(sx, sy, R * v.scale, 0, Math.PI * 2);
    return true;
  }
  const n = Math.max(8, Math.min(160, Math.ceil(((hi - lo) * R * v.scale) / 12)));
  for (let i = 0; i <= n; i++) {
    const a = lo + ((hi - lo) * i) / n;
    const [sx, sy] = toScreen(v, bx + R * Math.cos(a), by + R * Math.sin(a));
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  const inner = R - depth;
  if (inner <= 1) {
    const [sx, sy] = toScreen(v, bx, by);
    ctx.lineTo(sx, sy);
  } else {
    for (let i = n; i >= 0; i--) {
      const a = lo + ((hi - lo) * i) / n;
      const [sx, sy] = toScreen(v, bx + inner * Math.cos(a), by + inner * Math.sin(a));
      ctx.lineTo(sx, sy);
    }
  }
  ctx.closePath();
  return true;
}

/** Kontinente für die Fernansicht: Winkel (°), Abstand und Größe als Anteil des Erdradius, Form. */
const CONTINENTS: readonly [number, number, number, number][] = [
  [92, 0.78, 0.34, 1.3],
  [178, 0.66, 0.3, 2.1],
  [262, 0.8, 0.2, 0.4],
  [322, 0.62, 0.28, 3.3],
  [28, 0.5, 0.13, 5.1],
  [215, 0.2, 0.1, 4.2],
];

/** Organische Umrisse: Kreis mit überlagerten Wellen, als glatte Kurve gezeichnet. */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  const n = 28;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= n + 1; i++) {
    const a = (i / n) * Math.PI * 2;
    const k =
      1 +
      0.22 * Math.sin(3 * a + seed) +
      0.12 * Math.sin(5 * a + 2 * seed) +
      0.06 * Math.sin(9 * a + seed);
    xs.push(x + r * k * Math.cos(a));
    ys.push(y + r * k * Math.sin(a) * 0.85);
  }
  ctx.beginPath();
  ctx.moveTo((xs[0]! + xs[1]!) / 2, (ys[0]! + ys[1]!) / 2);
  for (let i = 1; i <= n; i++) {
    ctx.quadraticCurveTo(xs[i]!, ys[i]!, (xs[i]! + xs[i + 1]!) / 2, (ys[i]! + ys[i + 1]!) / 2);
  }
  ctx.closePath();
}

function drawEarth(ctx: CanvasRenderingContext2D, v: View): void {
  const R = EARTH.radius;
  const rpx = R * v.scale;
  if (rpx < 20_000) {
    const [sx, sy] = toScreen(v, 0, 0);
    // Atmosphärenschein
    const outer = rpx + Math.max(4, EARTH.atmosphere * 1.6 * v.scale);
    const glow = ctx.createRadialGradient(sx, sy, rpx * 0.98, sx, sy, outer);
    glow.addColorStop(0, 'rgba(120,180,255,0.55)');
    glow.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, outer, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(rpx, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = '#2764b8';
    ctx.fill();
    if (rpx > 4) {
      ctx.clip();
      ctx.fillStyle = '#3f8f4e';
      const rot = v.up - Math.PI / 2;
      for (const [ang, dist, rad, seed] of CONTINENTS) {
        const a = (ang * Math.PI) / 180 - rot;
        blob(ctx, sx + dist * rpx * Math.cos(a), sy - dist * rpx * Math.sin(a), rad * rpx, seed);
        ctx.fill();
      }
      // Tag-Nacht-Schattierung für räumliche Wirkung
      const shade = ctx.createLinearGradient(sx - rpx, sy - rpx, sx + rpx, sy + rpx);
      shade.addColorStop(0, 'rgba(255,255,255,0.12)');
      shade.addColorStop(0.55, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(2,6,20,0.45)');
      ctx.fillStyle = shade;
      ctx.fillRect(sx - rpx, sy - rpx, 2 * rpx, 2 * rpx);
    }
    ctx.restore();
    return;
  }
  // Nahansicht: Boden als Streifen unter der Oberfläche, Land oder Meer.
  ctx.beginPath();
  if (sectorPath(ctx, v, 0, 0, R, 0, 2 * Math.PI)) {
    ctx.fillStyle = '#2764b8';
    ctx.fill();
  }
  ctx.fillStyle = '#3f8f4e';
  for (const [a, b] of LAND) {
    ctx.beginPath();
    if (sectorPath(ctx, v, 0, 0, R, (a * Math.PI) / 180, (b * Math.PI) / 180)) ctx.fill();
  }
}

function drawLaunchPad(ctx: CanvasRenderingContext2D, v: View): void {
  if (v.scale < 0.25) return;
  const R = EARTH.radius;
  ctx.save();
  local(ctx, v, 0, R, Math.PI / 2);
  ctx.fillStyle = '#5c6470';
  ctx.fillRect(-9, -1.2, 18, 1.2);
  ctx.fillStyle = '#3c434d';
  ctx.fillRect(-12, -3, 24, 1.8);
  // Turm
  ctx.strokeStyle = '#c0452f';
  ctx.lineWidth = 0.35;
  ctx.strokeRect(5, 0, 2.2, 30);
  ctx.beginPath();
  for (let y = 0; y < 30; y += 2.2) {
    ctx.moveTo(5, y);
    ctx.lineTo(7.2, y + 2.2);
    ctx.moveTo(7.2, y);
    ctx.lineTo(5, y + 2.2);
  }
  ctx.stroke();
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(4.6, 30, 3, 0.6);
  ctx.restore();
}

/** Mondkrater (auch für Phobos): Winkel (Grad, mitrotierend), Abstand, Radius (Anteile). */
function drawCraters(
  ctx: CanvasRenderingContext2D,
  v: View,
  b: Body,
  bx: number,
  by: number,
  rot: number,
  color: string,
): void {
  const R = b.radius;
  const reach = Math.hypot(v.width, v.height) / v.scale;
  for (const [ang, dist, rad] of CRATERS) {
    const a = rot + (ang * Math.PI) / 180;
    const cx = bx + dist * R * Math.cos(a);
    const cy = by + dist * R * Math.sin(a);
    const cr = rad * R;
    if (Math.hypot(cx - v.cx, cy - v.cy) - cr > reach) continue;
    if (cr * v.scale > 2e6 || cr * v.scale < 0.6) continue;
    const [sx, sy] = toScreen(v, cx, cy);
    ctx.beginPath();
    ctx.arc(sx, sy, cr * v.scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx, sy, cr * v.scale * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
  }
}

/** Farben der Körper: Grundfarbe, Details, Leuchten der Atmosphäre. */
const LOOK: Record<string, { base: string; detail: string; glow: string | null }> = {
  sun: { base: '#ffcf4d', detail: '#ffe9a3', glow: 'rgba(255,190,60,' },
  venus: { base: '#e6c27a', detail: '#f4dcaa', glow: 'rgba(255,210,140,' },
  moon: { base: '#a3a8b0', detail: 'rgba(80,86,96,0.35)', glow: null },
  mars: { base: '#c1502a', detail: '#8f3317', glow: 'rgba(255,150,110,' },
  phobos: { base: '#8a7b6c', detail: 'rgba(60,50,40,0.4)', glow: null },
  jupiter: { base: '#d8b48a', detail: '#b0764a', glow: 'rgba(240,200,150,' },
};

/** Zeichnet einen Himmelskörper (außer der Erde, die ihre eigene Funktion hat). */
function drawBody(ctx: CanvasRenderingContext2D, v: View, b: Body, t: number, minPx = 0): void {
  if (b === EARTH) {
    drawEarth(ctx, v);
    return;
  }
  const look = LOOK[b.id]!;
  const [bx, by] = bodyState(b, t);
  const [sx, sy] = toScreen(v, bx, by);
  const rpx = b.radius * v.scale;
  // Leuchten (Sonne) bzw. Atmosphäre aus der Ferne
  if (look.glow && rpx < 20_000) {
    const outer =
      b === SUN ? Math.max(rpx * 2.4, 26) : rpx + Math.max(3, b.atmosphere * 1.5 * v.scale);
    if (sx > -outer && sx < v.width + outer && sy > -outer && sy < v.height + outer) {
      const g = ctx.createRadialGradient(sx, sy, Math.max(rpx * 0.9, 0.5), sx, sy, outer);
      g.addColorStop(0, `${look.glow}${b === SUN ? 0.9 : 0.45})`);
      g.addColorStop(1, `${look.glow}0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, outer, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (rpx < minPx) {
    ctx.fillStyle = look.base;
    ctx.beginPath();
    ctx.arc(sx, sy, minPx, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  if (!sectorPath(ctx, v, bx, by, b.radius, 0, 2 * Math.PI)) return;
  ctx.fillStyle = look.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rot = orbitAngle(b, t);
  if (b === MOON || b === PHOBOS) drawCraters(ctx, v, b, bx, by, rot, look.detail);
  if (rpx < 20_000 && rpx > 3) {
    if (b === MARS) {
      ctx.fillStyle = look.detail;
      for (const [ang, dist, rad, seed] of CONTINENTS.slice(0, 4)) {
        const a = (ang * Math.PI) / 180 - (v.up - Math.PI / 2);
        blob(
          ctx,
          sx + dist * rpx * Math.cos(a),
          sy - dist * rpx * Math.sin(a),
          rad * rpx * 0.7,
          seed,
        );
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(sx, sy - rpx * 0.93, rpx * 0.35, rpx * 0.12, 0, 0, Math.PI * 2);
      ctx.ellipse(sx, sy + rpx * 0.95, rpx * 0.25, rpx * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (b === JUPITER || b === VENUS) {
      const bands = b === JUPITER ? 9 : 5;
      for (let i = 0; i < bands; i++) {
        ctx.fillStyle = i % 2 ? look.detail : look.base;
        ctx.globalAlpha = b === JUPITER ? 0.8 : 0.35;
        const y0 = sy - rpx + (2 * rpx * i) / bands;
        ctx.fillRect(sx - rpx, y0 + Math.sin(i * 1.7) * rpx * 0.03, 2 * rpx, (2 * rpx) / bands);
      }
      ctx.globalAlpha = 1;
      if (b === JUPITER) {
        ctx.fillStyle = '#c0563a';
        ctx.beginPath();
        ctx.ellipse(sx + rpx * 0.35, sy + rpx * 0.3, rpx * 0.16, rpx * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (b === SUN) {
      const g = ctx.createRadialGradient(sx - rpx * 0.2, sy - rpx * 0.2, 0, sx, sy, rpx);
      g.addColorStop(0, '#fff7d6');
      g.addColorStop(1, '#ffb52e');
      ctx.fillStyle = g;
      ctx.fillRect(sx - rpx, sy - rpx, 2 * rpx, 2 * rpx);
    }
    if (b !== SUN) {
      // Schattenseite (von der Sonne abgewandt)
      const [sunX, sunY] = bodyState(SUN, t);
      const [px, py] = toScreen(v, sunX, sunY);
      const dx = sx - px;
      const dy = sy - py;
      const d = Math.hypot(dx, dy) || 1;
      const g = ctx.createLinearGradient(
        sx - (dx / d) * rpx,
        sy - (dy / d) * rpx,
        sx + (dx / d) * rpx,
        sy + (dy / d) * rpx,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.05)');
      g.addColorStop(1, 'rgba(2,4,12,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - rpx, sy - rpx, 2 * rpx, 2 * rpx);
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Raumstation

function drawStation(ctx: CanvasRenderingContext2D, v: View, t: number, minPx: number): void {
  const [x, y, vx, vy] = stationState(t);
  const [sx, sy] = toScreen(v, x, y);
  const margin = 60 * Math.max(v.scale, 1);
  if (sx < -margin || sx > v.width + margin || sy < -margin || sy > v.height + margin) return;
  const axis = Math.atan2(vy, vx);
  const size = 40 * v.scale;
  if (size < minPx) {
    // Nur ein Symbol, wenn die Station winzig wäre.
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-5, -1.5, 10, 3);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-2, -7, 4, 14);
    ctx.restore();
    return;
  }
  ctx.save();
  local(ctx, v, x, y, axis);
  ctx.lineWidth = 0.15;
  ctx.strokeStyle = 'rgba(20,26,40,0.6)';
  // Gitterträger mit Solarflügeln
  ctx.fillStyle = '#9aa3b2';
  ctx.fillRect(-22, -1, 44, 2);
  for (const sgn of [-1, 1]) {
    for (const off of [8, 15]) {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(sgn * off - 2.5, -9, 5, 7.5);
      ctx.fillRect(sgn * off - 2.5, 1.5, 5, 7.5);
      ctx.strokeStyle = 'rgba(147,197,253,0.6)';
      for (let k = 1; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(sgn * off - 2.5, -9 + k * 1.5);
        ctx.lineTo(sgn * off + 2.5, -9 + k * 1.5);
        ctx.moveTo(sgn * off - 2.5, 1.5 + k * 1.5);
        ctx.lineTo(sgn * off + 2.5, 1.5 + k * 1.5);
        ctx.stroke();
      }
    }
  }
  // Module entlang der Flugrichtung
  const modules: [number, number, number][] = [
    [-14, -6, 3.2],
    [-6, 4, 4],
    [4, 13, 3.4],
  ];
  for (const [a, b2, w] of modules) {
    ctx.fillStyle = hGrad(ctx, w, METAL_STATION);
    ctx.fillRect(-w / 2, a, w, b2 - a);
    ctx.strokeRect(-w / 2, a, w, b2 - a);
  }
  // Andockstutzen vorn
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(-1.2, 13, 2.4, STATION.port - 13);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-1.4, STATION.port - 0.4, 2.8, 0.6);
  ctx.restore();
}

const METAL_STATION = ['#c9d1dc', '#f5f7fa', '#9aa3b2'];

// ------------------------------------------------------------------ Flugansicht

/** Himmelsfarben je Atmosphäre: oben, unten. */
const SKY: Record<string, [string, string]> = {
  earth: ['#3d7fd6', '#a6d2ff'],
  mars: ['#b98a64', '#e8c29a'],
  venus: ['#b8792b', '#f0b35a'],
  jupiter: ['#8a6a4a', '#d8b48a'],
};

export function flightView(f: Flight, width: number, height: number, scale: number): View {
  const near = f.nearest();
  const up0 = near.altitude < near.body.radius * 3 ? near.body : f.refBody();
  const c = f.state(up0);
  const up = Math.atan2(f.y - c.y, f.x - c.x);
  const h = f.length;
  return {
    width,
    height,
    scale,
    cx: f.x + Math.cos(f.angle) * h * 0.5,
    cy: f.y + Math.sin(f.angle) * h * 0.5,
    up,
    ox: width / 2,
    oy: height * 0.5,
  };
}

export function drawFlight(ctx: CanvasRenderingContext2D, f: Flight, v: View, time: number): void {
  const { width: W, height: H } = v;
  const air = f.air();
  const colors = SKY[air.body.id];
  const inAir = colors && air.altitude < air.body.atmosphere * 1.1;
  const k = inAir ? Math.min(1, Math.max(0, air.altitude / (air.body.atmosphere * 1.1))) : 1;
  const top = colors ?? ['#03050c', '#03050c'];
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, mix(top[0], '#03050c', Math.pow(k, 0.5)));
  sky.addColorStop(1, mix(top[1], '#060a16', Math.pow(k, 0.7)));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, v, inAir ? Math.min(1, Math.max(0, (k - 0.3) / 0.6)) : 1, -v.up);

  // Ferne Körper zuerst, nahe zuletzt.
  const dist = (b: Body): number => {
    const [bx, by] = bodyState(b, f.t);
    return Math.hypot(bx - f.x, by - f.y);
  };
  const order = [...BODIES].sort((a, b) => dist(b) - dist(a));
  for (const b of order) drawBody(ctx, v, b, f.t, b === SUN ? 3 : 1.2);
  drawLaunchPad(ctx, v);
  drawStation(ctx, v, f.t, 6);

  // Trümmer
  for (const d of f.debris) {
    ctx.save();
    local(ctx, v, d.x, d.y, d.angle, Math.max(v.scale, 0.02));
    drawRocket(ctx, d.parts);
    ctx.restore();
  }

  // Rauch und Feuer
  for (const p of f.particles) {
    const [sx, sy] = toScreen(v, p.x, p.y);
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
    const q = p.life / p.max;
    const size = Math.max(1.2, p.size * (1 + q * 2) * Math.min(3, v.scale));
    ctx.globalAlpha = (1 - q) * (p.kind === 'smoke' ? 0.35 : 0.9);
    ctx.fillStyle =
      p.kind === 'smoke'
        ? '#d8dde6'
        : p.kind === 'fire'
          ? q < 0.4
            ? '#ffd166'
            : '#ff6b35'
          : '#ffb347';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (f.status !== 'crashed') {
    const parts = f.segs.flatMap((s) => s.parts);
    const heightM = f.length;
    const minPx = 34;
    const scale = Math.max(v.scale, minPx / heightM);
    ctx.save();
    local(ctx, v, f.x, f.y, f.angle, scale);
    drawRocket(ctx, parts, {
      throttle: f.thrusting ? f.throttle : 0,
      air: air.rho,
      chuteOpen: f.chute === 'open' ? f.chuteOpen : 0,
      time,
    });
    if (f.rcs && (f.translate.x || f.translate.y) && f.status === 'flying')
      drawRcsPuffs(ctx, f, heightM, time);
    ctx.restore();
    drawHeating(ctx, f, v, heightM * scale, time);
    drawVelocityMarkers(ctx, f, v, heightM * scale);
    drawTargetMarker(ctx, f, v, heightM * scale);
  }
}

/** Kleine Gaswolken der Lagekontrolldüsen. */
function drawRcsPuffs(ctx: CanvasRenderingContext2D, f: Flight, h: number, time: number): void {
  ctx.fillStyle = 'rgba(235,240,255,0.8)';
  const flick = 0.6 + 0.4 * Math.abs(Math.sin(time * 40));
  const y = h * 0.8;
  const puff = (x: number, yy: number, dx: number, dy: number): void => {
    ctx.beginPath();
    ctx.ellipse(
      x + dx * 0.9,
      yy + dy * 0.9,
      0.5 + Math.abs(dx) * 0.6 * flick,
      0.5 + Math.abs(dy) * 0.6 * flick,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  };
  // Die Düsen blasen entgegen der gewünschten Bewegung.
  if (f.translate.x) puff(-Math.sign(f.translate.x) * 1.4, y, -Math.sign(f.translate.x), 0);
  if (f.translate.y) puff(0, f.translate.y > 0 ? -0.3 : h + 0.3, 0, -Math.sign(f.translate.y));
}

/**
 * Wiedereintritt und Schallmauer: Bei hoher Geschwindigkeit in der Luft glüht die Luft vor der
 * Rakete (Kompression), knapp über Schallgeschwindigkeit bildet sich ein Dampfkegel.
 */
function drawHeating(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  rocketPx: number,
  time: number,
): void {
  const air = f.air();
  const rho = air.rho;
  const bv = f.state(air.body);
  const rvx = f.vx - bv.vx;
  const rvy = f.vy - bv.vy;
  const speed = Math.hypot(rvx, rvy);
  if (rho <= 0 || speed < 280 || f.status !== 'flying') return;
  const [rx, ry] = toScreen(v, f.x, f.y);
  const [ax, ay] = toScreen(v, f.x + rvx, f.y + rvy);
  const len = Math.hypot(ax - rx, ay - ry) || 1;
  const ux = (ax - rx) / len;
  const uy = (ay - ry) / len;
  const [cx, cy] = toScreen(v, v.cx, v.cy);
  const r = Math.max(18, rocketPx * 0.45);
  ctx.save();
  const mach = Math.max(0, 1 - Math.abs(speed - 345) / 70) * Math.min(1, rho / 0.2);
  if (mach > 0.02) {
    ctx.globalAlpha = 0.5 * mach;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.1, r * 0.45, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const heat = Math.min(1, (speed - 700) / 1400) * Math.min(1, rho / 0.02);
  if (heat > 0.02) {
    const flick = 0.85 + 0.15 * Math.sin(time * 37);
    const hx = cx + ux * r * 0.9;
    const hy = cy + uy * r * 0.9;
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 1.6);
    g.addColorStop(0, `rgba(255,240,200,${0.9 * heat * flick})`);
    g.addColorStop(0.35, `rgba(255,140,50,${0.7 * heat})`);
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Richtungsmarker (grün = Flugrichtung, orange = Gegenrichtung) relativ zum Bezug. */
function drawVelocityMarkers(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  rocketPx: number,
): void {
  if (f.status !== 'flying') return;
  // In Zielnähe zählt die Geschwindigkeit relativ zur Station (wie beim echten Andocken).
  let rvx: number;
  let rvy: number;
  const ti = f.targetInfo();
  if (f.target === 'station' && ti && ti.distance < 20_000) {
    const [, , svx, svy] = stationState(f.t);
    rvx = f.vx - svx;
    rvy = f.vy - svy;
  } else {
    const rel = f.relative();
    rvx = rel.vx;
    rvy = rel.vy;
  }
  const speed = Math.hypot(rvx, rvy);
  if (speed < 0.2) return;
  const [rx, ry] = toScreen(v, f.x, f.y);
  const [ax, ay] = toScreen(v, f.x + rvx / speed, f.y + rvy / speed);
  const len = Math.hypot(ax - rx, ay - ry) || 1;
  const ux = (ax - rx) / len;
  const uy = (ay - ry) / len;
  const [cx, cy] = toScreen(v, v.cx, v.cy);
  const dist = Math.max(60, rocketPx / 2 + 34);
  const px = cx + ux * dist;
  const py = cy + uy * dist;
  ctx.strokeStyle = '#5ee39a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 7, 0, Math.PI * 2);
  ctx.moveTo(px + ux * 7, py + uy * 7);
  ctx.lineTo(px + ux * 13, py + uy * 13);
  ctx.stroke();
  const qx = cx - ux * dist;
  const qy = cy - uy * dist;
  ctx.strokeStyle = '#ffa24c';
  ctx.beginPath();
  ctx.arc(qx, qy, 7, 0, Math.PI * 2);
  ctx.moveTo(qx - 5, qy - 5);
  ctx.lineTo(qx + 5, qy + 5);
  ctx.moveTo(qx + 5, qy - 5);
  ctx.lineTo(qx - 5, qy + 5);
  ctx.stroke();
}

/** Violette Raute zeigt die Richtung zum Ziel. */
function drawTargetMarker(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  rocketPx: number,
): void {
  if (!f.target || f.status !== 'flying') return;
  let tx: number;
  let ty: number;
  if (f.target === 'station') [tx, ty] = stationState(f.t);
  else
    [tx, ty] = bodyState(
      BODIES.find((b) => b.id === f.target)!,
      f.t,
    );
  const [cx, cy] = toScreen(v, v.cx, v.cy);
  const [gx, gy] = toScreen(v, tx, ty);
  const d = Math.hypot(gx - cx, gy - cy);
  if (d < 1) return;
  const dist = Math.max(80, rocketPx / 2 + 56);
  if (d < dist) return;
  const px = cx + ((gx - cx) / d) * dist;
  const py = cy + ((gy - cy) / d) * dist;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 2;
  ctx.strokeRect(-6, -6, 12, 12);
  ctx.restore();
}

// ------------------------------------------------------------------ Karte

export type MapFocus = 'rocket' | 'ref' | 'sun' | 'venus' | 'earth' | 'moon' | 'mars' | 'jupiter';

export function mapCenter(f: Flight, focus: MapFocus): [number, number] {
  if (focus === 'rocket') return [f.x, f.y];
  const b = focus === 'ref' ? f.refBody() : BODIES.find((q) => q.id === focus)!;
  return bodyState(b, f.t).slice(0, 2) as [number, number];
}

export function mapView(
  f: Flight,
  width: number,
  height: number,
  scale: number,
  focus: MapFocus,
  panX = 0,
  panY = 0,
): View {
  const [cx, cy] = mapCenter(f, focus);
  return {
    width,
    height,
    scale,
    cx: cx + panX,
    cy: cy + panY,
    up: Math.PI / 2,
    ox: width / 2,
    oy: height / 2,
  };
}

/** Passender Maßstab, damit die Bahn bzw. der gewählte Körper ins Bild passt. */
export function fitMapScale(f: Flight, width: number, height: number, focus: MapFocus): number {
  const half = 0.42 * Math.min(width, height);
  const ref = f.refBody();
  const b = focus === 'ref' || focus === 'rocket' ? ref : BODIES.find((q) => q.id === focus)!;
  let r: number;
  if (b === ref) {
    const o = f.orbit(ref);
    r = Math.max(o.r, ref.radius * 1.4);
    if (o.bound && Number.isFinite(o.apoapsis)) r = Math.max(r, o.apoapsis + ref.radius);
    if (!o.bound) r = Math.max(r * 2, Math.min(ref.hill, r * 20));
    if (ref === SUN) r = Math.max(o.r * 1.3, MARS.distance * 1.1);
  } else if (b === SUN) r = MARS.distance * 1.15;
  else r = Math.min(b.hill, b.radius * 60) * 1.2;
  if (focus === 'earth' && ref === EARTH && f.goals.size > 3) r = Math.max(r, MOON.distance * 1.1);
  return half / Math.max(r, 1);
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  ctx.font = '600 12px Jost, system-ui, sans-serif';
  // Am rechten Rand nach links ausweichen.
  const width = ctx.measureText(text).width;
  const room = ctx.canvas.width / (ctx.getTransform().a || 1);
  if (x + width > room - 8) x = Math.max(8, x - width - 20);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(4,6,13,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function km(m: number): string {
  if (!Number.isFinite(m)) return '∞';
  if (Math.abs(m) >= 1e9)
    return `${(m / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. km`;
  return `${Math.round(m / 1000).toLocaleString('de-DE')} km`;
}

function circle(ctx: CanvasRenderingContext2D, v: View, x: number, y: number, r: number): void {
  const [sx, sy] = toScreen(v, x, y);
  const rp = r * v.scale;
  if (rp < 2 || rp > 2e5) return;
  if (sx + rp < 0 || sx - rp > v.width || sy + rp < 0 || sy - rp > v.height) return;
  ctx.beginPath();
  ctx.arc(sx, sy, rp, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  pred: Prediction | null,
): void {
  const { width: W, height: H } = v;
  ctx.fillStyle = '#04060d';
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, v, 0.6, 0);
  const t = f.t;

  // Bahnen der Körper um ihren Mutterkörper
  ctx.lineWidth = 1;
  for (const b of BODIES) {
    if (!b.parent) continue;
    const [px, py] = bodyState(
      BODIES.find((q) => q.id === b.parent)!,
      t,
    );
    ctx.strokeStyle = b.parent === 'sun' ? 'rgba(255,220,150,0.16)' : 'rgba(255,255,255,0.14)';
    circle(ctx, v, px, py, b.distance);
  }
  // Bahn der Station
  ctx.strokeStyle = f.target === 'station' ? 'rgba(192,132,252,0.55)' : 'rgba(192,132,252,0.22)';
  circle(ctx, v, 0, 0, STATION.radius);

  // Hill-Sphären als gestrichelte Kreise
  ctx.setLineDash([5, 5]);
  for (const b of BODIES) {
    if (b === SUN || b === PHOBOS) continue;
    const [bx, by] = bodyState(b, t);
    const hill = b.hill * v.scale;
    if (hill < 8 || hill > 40_000) continue;
    ctx.strokeStyle = 'rgba(167,139,250,0.55)';
    circle(ctx, v, bx, by, b.hill);
    const [sx, sy] = toScreen(v, bx, by);
    if (hill > 50)
      label(
        ctx,
        `Hill-Sphäre ${b.id === 'moon' ? 'des Mondes' : b.id === 'earth' ? 'der Erde' : `von ${b.name}`}`,
        sx + hill * 0.72,
        sy - hill * 0.72,
        '#c4b5fd',
      );
  }
  ctx.setLineDash([]);

  for (const b of BODIES) {
    drawBody(ctx, v, b, t, b === SUN ? 5 : 2.5);
    if (b === EARTH && EARTH.radius * v.scale < 2.5) {
      const [ex, ey] = toScreen(v, 0, 0);
      ctx.fillStyle = '#4b8fe8';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Namen der Körper (Monde nur, wenn sie sich vom Planeten abheben)
  for (const b of BODIES) {
    const [bx, by] = bodyState(b, t);
    if (b.parent && b.parent !== 'sun') {
      const sep = b.distance * v.scale;
      if (sep < 18) continue;
    }
    const [sx, sy] = toScreen(v, bx, by);
    if (sx < -40 || sx > W + 40 || sy < -20 || sy > H + 20) continue;
    label(
      ctx,
      b.name,
      sx + Math.max(5, b.radius * v.scale) + 4,
      sy,
      b === EARTH ? '#9cc3ff' : '#d6d9df',
    );
  }
  drawStation(ctx, v, t, 9);

  if (pred && pred.n > 1) drawPrediction(ctx, f, v, pred);

  for (const d of f.debris) {
    const [sx, sy] = toScreen(v, d.x, d.y);
    ctx.fillStyle = '#8b93a1';
    ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
  }

  // Rakete als Pfeil
  if (f.status !== 'crashed') {
    const [sx, sy] = toScreen(v, f.x, f.y);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-f.angle);
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-7, -6.5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 6.5);
    ctx.closePath();
    ctx.fillStyle = '#ff9f43';
    ctx.strokeStyle = '#04060d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  // Maßstab über den Steuerknöpfen, unter der Anzeige links.
  const target = W * 0.22;
  const meters = target / v.scale;
  const pow = Math.pow(10, Math.floor(Math.log10(meters)));
  const nice =
    [1, 2, 5, 10]
      .map((m) => m * pow)
      .filter((m) => m <= meters)
      .pop() ?? pow;
  const px = nice * v.scale;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const narrow = W < 640;
  const by = narrow ? H - 190 : H - 104;
  ctx.moveTo(16, by);
  ctx.lineTo(16 + px, by);
  ctx.moveTo(16, by - 4);
  ctx.lineTo(16, by + 4);
  ctx.moveTo(16 + px, by - 4);
  ctx.lineTo(16 + px, by + 4);
  ctx.stroke();
  label(ctx, km(nice), 16, by - 14, 'rgba(255,255,255,0.8)');
  if (!narrow)
    label(
      ctx,
      'Ziehen: verschieben · Mausrad: zoomen · Doppelklick: zurück',
      16,
      by + 18,
      'rgba(255,255,255,0.45)',
    );
}

/**
 * Vorhergesagte Bahn relativ zum Bezugskörper; innerhalb der Hill-Sphäre eines anderen Körpers
 * relativ zu diesem (an der Stelle, an der er bei der Ankunft steht) – wie in Raumfahrtspielen.
 */
function drawPrediction(ctx: CanvasRenderingContext2D, f: Flight, v: View, pred: Prediction): void {
  const t = f.t;
  const [rx0, ry0] = bodyState(pred.ref, t);
  const enc = pred.encounter;
  const encPos = enc ? bodyState(enc.body, enc.t) : null;
  const xs = new Float64Array(pred.n);
  const ys = new Float64Array(pred.n);
  for (let i = 0; i < pred.n; i++) {
    let x = pred.xs[i]!;
    let y = pred.ys[i]!;
    if (enc && encPos && i >= enc.enter && i <= enc.exit) {
      const [bx, by] = bodyState(enc.body, pred.ts[i]!);
      x += encPos[0] - bx;
      y += encPos[1] - by;
    } else {
      const [bx, by] = bodyState(pred.ref, pred.ts[i]!);
      x += rx0 - bx;
      y += ry0 - by;
    }
    [xs[i], ys[i]] = toScreen(v, x, y);
  }
  const segment = (a: number, b: number, color: string): void => {
    if (b <= a) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    smoothPath(ctx, xs, ys, a, b, pred.n);
    ctx.stroke();
    // Richtungspfeile etwa alle 140 Pixel
    ctx.fillStyle = color;
    let run = 0;
    for (let i = a + 1; i <= b; i++) {
      const dx = xs[i]! - xs[i - 1]!;
      const dy = ys[i]! - ys[i - 1]!;
      run += Math.hypot(dx, dy);
      if (run < 140) continue;
      run = 0;
      ctx.save();
      ctx.translate(xs[i]!, ys[i]!);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };
  if (enc) {
    segment(0, enc.enter, '#5eead4');
    segment(enc.enter, enc.exit, '#fb923c');
    segment(enc.exit, pred.n - 1, 'rgba(94,234,212,0.45)');
  } else segment(0, pred.n - 1, '#5eead4');

  const mark = (i: number, text: string, color: string): void => {
    if (i < 0) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(xs[i]!, ys[i]!, 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, text, xs[i]! + 8, ys[i]! - 8, color);
  };
  const alt = (i: number): number => {
    const [cx, cy] = bodyState(pred.ref, pred.ts[i]!);
    return Math.hypot(pred.xs[i]! - cx, pred.ys[i]! - cy) - pred.ref.radius;
  };
  // Ap/Pe nur beschriften, wenn sie sich auf dem Bildschirm vom Körper abheben.
  const [rsx, rsy] = toScreen(v, rx0, ry0);
  const apart = (i: number): boolean =>
    Math.hypot(xs[i]! - rsx, ys[i]! - rsy) > pred.ref.radius * v.scale + 14;
  if (pred.high >= 0 && apart(pred.high)) mark(pred.high, `Ap ${km(alt(pred.high))}`, '#fcd34d');
  if (pred.low >= 0 && apart(pred.low)) mark(pred.low, `Pe ${km(alt(pred.low))}`, '#fcd34d');
  if (pred.impact) {
    const i = pred.n - 1;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(xs[i]! - 6, ys[i]! - 6);
    ctx.lineTo(xs[i]! + 6, ys[i]! + 6);
    ctx.moveTo(xs[i]! + 6, ys[i]! - 6);
    ctx.lineTo(xs[i]! - 6, ys[i]! + 6);
    ctx.stroke();
    label(ctx, `Aufschlag: ${pred.impact.name}`, xs[i]! + 10, ys[i]! + 10, '#fca5a5');
  }
  if (enc && encPos) {
    const [sx, sy] = toScreen(v, encPos[0], encPos[1]);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(251,146,60,0.85)';
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(5, enc.body.radius * v.scale), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(
      ctx,
      `${enc.body.name} bei Ankunft · ${km(enc.distance - enc.body.radius)} über dem Boden`,
      sx + 10,
      sy + 16,
      '#fed7aa',
    );
  }
  if (pred.closest && f.target === 'station') {
    const i = pred.closest.index;
    const [gx, gy] = stationState(pred.closest.t);
    const [sx, sy] = toScreen(v, gx, gy);
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xs[i]!, ys[i]!);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    label(ctx, `Nächste Annäherung ${km(pred.closest.distance)}`, sx + 10, sy - 12, '#e9d5ff');
  }
}
