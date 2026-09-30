/**
 * Flugansicht: Himmel mit Tag, Nacht und Dämmerung, Himmelskörper, Wolken, Bäume und Felsen,
 * Startanlage, Stationen und Basen, Satelliten, Rauch, Rakete und Richtungsmarker.
 */
import { drawRocket, drawSatellite, setLighting } from './draw';
import { drawPlanetDisk } from './planets';
import { drawLaunchComplex, drawRidges, drawSkySun } from './landscape';
import { bodySpin, satelliteState, type Flight, type LandingSite } from './flight';
import {
  BODIES,
  EARTH,
  EUROPA,
  JUPITER,
  MARS,
  MERCURY,
  MOON,
  PHOBOS,
  STATION,
  SUN,
  VENUS,
  bodyById,
  bodyState,
  orbitAngle,
  stationState,
  type Body,
} from './world';
import {
  LayerCache,
  blob,
  cloudSprite,
  drawStars,
  hash,
  label,
  local,
  mix,
  mixHex,
  rgbOf,
  screenAngle,
  sectorPath,
  softSprite,
  toScreen,
  type View,
} from './view';

// ------------------------------------------------------------------ Sonne und Licht

export interface SunLight {
  /** Höhe der Sonne über dem Horizont (−1 … 1). */
  elevation: number;
  /** 0 = Nacht, 1 = Tag */
  day: number;
  /** Dämmerung (am Horizont am stärksten). */
  twilight: number;
  /** Liegt die Rakete im Schatten eines Körpers? */
  shadow: boolean;
  /** Richtung zur Sonne (Weltwinkel). */
  dir: number;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Sonnenstand an einem Punkt über einem Körper. */
export function sunLight(x: number, y: number, body: Body, t: number): SunLight {
  const [sx, sy] = bodyState(SUN, t);
  const [bx, by] = bodyState(body, t);
  const dx = sx - x;
  const dy = sy - y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = (x - bx) / (Math.hypot(x - bx, y - by) || 1);
  const uy = (y - by) / (Math.hypot(x - bx, y - by) || 1);
  const elevation = body === SUN ? 1 : (ux * dx + uy * dy) / d;
  // Schatten: Liegt der Körper zwischen Rakete und Sonne?
  let shadow = false;
  if (body !== SUN) {
    const rx = x - bx;
    const ry = y - by;
    const proj = (rx * dx + ry * dy) / d;
    if (proj < 0) {
      const px = rx - (proj * dx) / d;
      const py = ry - (proj * dy) / d;
      shadow = Math.hypot(px, py) < body.radius;
    }
  }
  return {
    elevation,
    day: smooth(-0.12, 0.14, elevation),
    twilight: Math.exp(-((elevation / 0.16) ** 2)),
    shadow,
    dir: Math.atan2(dy, dx),
  };
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

function onLand(angle: number): boolean {
  const deg = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
  return LAND.some(([a, b]) => deg >= a && deg <= b);
}

/** Berge der Erde nur über Land – sanft ansteigend ab der Küste. */
function earthRidgeMask(angle: number): number {
  const deg = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
  let inland = -1;
  for (const [a, b] of LAND) inland = Math.max(inland, Math.min(deg - a, b - deg));
  return smooth(0, 2.5, inland);
}

/** Krater: Winkel (Grad, mitrotierend), Abstand (Anteil des Radius), Radius (Anteil). */
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

/** Kontinente für die Fernansicht: Winkel (°), Abstand und Größe als Anteil des Erdradius, Form. */
const CONTINENTS: readonly [number, number, number, number][] = [
  [92, 0.78, 0.34, 1.3],
  [178, 0.66, 0.3, 2.1],
  [262, 0.8, 0.2, 0.4],
  [322, 0.62, 0.28, 3.3],
  [28, 0.5, 0.13, 5.1],
  [215, 0.2, 0.1, 4.2],
];

/** Wolkenwirbel der Erde (Fernansicht). */
const SWIRLS: readonly [number, number, number, number][] = [
  [40, 0.7, 0.16, 2.2],
  [140, 0.85, 0.12, 0.7],
  [205, 0.55, 0.14, 3.9],
  [290, 0.8, 0.1, 5.5],
  [350, 0.35, 0.12, 1.1],
];

/** Farben der Körper: Grundfarbe, Details, Leuchten der Atmosphäre. */
const LOOK: Record<string, { base: string; detail: string; glow: string | null }> = {
  sun: { base: '#ffcf4d', detail: '#ffe9a3', glow: 'rgba(255,190,60,' },
  mercury: { base: '#9b9189', detail: 'rgba(60,52,46,0.35)', glow: null },
  venus: { base: '#e6c27a', detail: '#f4dcaa', glow: 'rgba(255,210,140,' },
  moon: { base: '#a3a8b0', detail: 'rgba(80,86,96,0.35)', glow: null },
  mars: { base: '#c1502a', detail: '#8f3317', glow: 'rgba(255,150,110,' },
  phobos: { base: '#8a7b6c', detail: 'rgba(60,50,40,0.4)', glow: null },
  jupiter: { base: '#d8b48a', detail: '#b0764a', glow: 'rgba(240,200,150,' },
  europa: { base: '#e2d6c0', detail: '#a0663d', glow: null },
  ganymede: { base: '#9d9384', detail: 'rgba(70,60,50,0.4)', glow: null },
  ceres: { base: '#8e8a86', detail: 'rgba(50,48,46,0.45)', glow: null },
};

/** Bodenfarbe in der Nahansicht. */
const GROUND: Record<string, string> = {
  mercury: '#8c827a',
  venus: '#b8864a',
  moon: '#9aa0a8',
  mars: '#b04a26',
  phobos: '#7d6f60',
  europa: '#d8ccb6',
  ganymede: '#948a7c',
  ceres: '#85817c',
};

function drawCraters(
  ctx: CanvasRenderingContext2D,
  v: View,
  b: Body,
  bx: number,
  by: number,
  rot: number,
  color: string,
  count = CRATERS.length,
): void {
  const R = b.radius;
  const reach = Math.hypot(v.width, v.height) / v.scale;
  for (let k = 0; k < count; k++) {
    const [ang, dist, rad] = CRATERS[k % CRATERS.length]!;
    const a = rot + ((ang + (k >= CRATERS.length ? 17 : 0)) * Math.PI) / 180;
    const dd = k >= CRATERS.length ? 1 - dist * 0.6 : dist;
    const cx = bx + dd * R * Math.cos(a);
    const cy = by + dd * R * Math.sin(a);
    const cr = rad * R * (k >= CRATERS.length ? 0.6 : 1);
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

/** Schattenseite eines Körpers (von der Sonne abgewandt), als Verlauf über der Scheibe. */
function nightSide(
  ctx: CanvasRenderingContext2D,
  v: View,
  sx: number,
  sy: number,
  rpx: number,
  t: number,
  strength = 0.62,
): void {
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
  g.addColorStop(0.46, 'rgba(0,0,0,0.04)');
  g.addColorStop(0.56, `rgba(2,4,12,${strength * 0.8})`);
  g.addColorStop(1, `rgba(2,4,12,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(sx - rpx, sy - rpx, 2 * rpx, 2 * rpx);
}

function drawEarth(ctx: CanvasRenderingContext2D, v: View, t: number): void {
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
      const rot = v.up - Math.PI / 2;
      ctx.fillStyle = '#3f8f4e';
      for (const [ang, dist, rad, seed] of CONTINENTS) {
        const a = (ang * Math.PI) / 180 - rot;
        blob(ctx, sx + dist * rpx * Math.cos(a), sy - dist * rpx * Math.sin(a), rad * rpx, seed);
        ctx.fill();
      }
      if (rpx > 14) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (const [ang, dist, rad, seed] of SWIRLS) {
          const a = (ang * Math.PI) / 180 - rot + t * 2e-6;
          blob(ctx, sx + dist * rpx * Math.cos(a), sy - dist * rpx * Math.sin(a), rad * rpx, seed);
          ctx.fill();
        }
      }
      nightSide(ctx, v, sx, sy, rpx, t, 0.7);
      // Stadtlichter auf der Nachtseite
      if (rpx > 30) {
        const [sunX, sunY] = bodyState(SUN, t);
        const sunA = Math.atan2(sunY, sunX);
        for (let i = 0; i < 90; i++) {
          const a = hash(i, 21) * Math.PI * 2;
          if (!onLand(a)) continue;
          const darkness = -Math.cos(a - sunA);
          if (darkness < 0.15) continue;
          const dist = 0.55 + hash(i, 22) * 0.43;
          const [px, py] = toScreen(v, R * dist * Math.cos(a), R * dist * Math.sin(a));
          ctx.globalAlpha = Math.min(1, (darkness - 0.15) * 3) * 0.85;
          ctx.fillStyle = '#ffd27a';
          ctx.fillRect(px, py, 1.4, 1.4);
        }
        ctx.globalAlpha = 1;
      }
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
  // Strand und Wiese etwas heller am Rand
  ctx.fillStyle = 'rgba(210,190,120,0.9)';
  for (const [a, b] of LAND) {
    for (const edge of [a, b]) {
      ctx.beginPath();
      if (
        sectorPath(
          ctx,
          v,
          0,
          0,
          R,
          ((edge - 0.02) * Math.PI) / 180,
          ((edge + 0.02) * Math.PI) / 180,
        )
      )
        ctx.fill();
    }
  }
}

/**
 * Fernansicht mit Oberflächenbild (siehe planets.ts). false, wenn der Körper zu groß, zu klein
 * oder außerhalb des Bildes ist – oder es kein Bild gibt (dann die einfachen Formen).
 */
function drawFarDisk(ctx: CanvasRenderingContext2D, v: View, b: Body, t: number): boolean {
  const [bx, by] = bodyState(b, t);
  const [sx, sy] = toScreen(v, bx, by);
  const rpx = b.radius * v.scale;
  if (rpx < 3 || rpx >= 2_500) return false;
  const glowPx =
    b === SUN
      ? Math.max(rpx * 1.4, 26 - rpx)
      : b.atmosphere > 0
        ? Math.max(4, b.atmosphere * 1.6 * v.scale, rpx * 0.03)
        : 0;
  const reach = rpx + glowPx;
  if (sx < -reach || sx > v.width + reach || sy < -reach || sy > v.height + reach) return true;
  const [sunX, sunY] = bodyState(SUN, t);
  const [px, py] = toScreen(v, sunX, sunY);
  const sunAngle = Math.atan2(py - sy, px - sx);
  const spin = b === EARTH ? 0 : bodySpin(b, t) || orbitAngle(b, t);
  return drawPlanetDisk(ctx, b, sx, sy, rpx, v.up - Math.PI / 2 - spin, sunAngle, glowPx);
}

/** Zeichnet einen Himmelskörper (die Erde hat ihre eigene Funktion). */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  v: View,
  b: Body,
  t: number,
  minPx = 0,
): void {
  if (drawFarDisk(ctx, v, b, t)) return;
  if (b === EARTH) {
    drawEarth(ctx, v, t);
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
  // Aus der Nähe (Scheibe größer als der Bildschirm) nur Bodenfarbe, keine Fernansicht-Muster.
  const close = rpx >= 2_500;
  ctx.fillStyle = close ? (GROUND[b.id] ?? look.base) : look.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rot = bodySpin(b, t) || orbitAngle(b, t);
  if (b === MOON || b === PHOBOS) drawCraters(ctx, v, b, bx, by, rot, look.detail);
  if (b === MERCURY) drawCraters(ctx, v, b, bx, by, rot, look.detail, 20);
  if (!close && rpx > 3) {
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
      // Polkappen an den Polen des Planeten (nicht am Bildschirmrand)
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const rot = v.up - Math.PI / 2;
      for (const [k, w, hh] of [
        [0.93, 0.35, 0.12],
        [-0.95, 0.25, 0.08],
      ] as const) {
        const [px, py] = toScreen(v, bx, by + b.radius * k);
        ctx.beginPath();
        ctx.ellipse(px, py, rpx * w, rpx * hh, -rot, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (b === EUROPA) {
      // Risse im Eispanzer
      ctx.strokeStyle = 'rgba(150,85,45,0.6)';
      ctx.lineWidth = Math.max(0.6, rpx * 0.02);
      for (let k = 0; k < 7; k++) {
        const a0 = hash(k, 31) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx + rpx * Math.cos(a0), sy + rpx * Math.sin(a0));
        ctx.quadraticCurveTo(
          sx + rpx * (hash(k, 32) - 0.5),
          sy + rpx * (hash(k, 33) - 0.5),
          sx + rpx * Math.cos(a0 + 2 + hash(k, 34)),
          sy + rpx * Math.sin(a0 + 2 + hash(k, 34)),
        );
        ctx.stroke();
      }
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
    if (b !== SUN) nightSide(ctx, v, sx, sy, rpx, t, 0.55);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Kulisse am Boden

/** Sichtbarer Winkelbereich eines Körpers um die Bildmitte (mitdrehend). */
function visibleArc(v: View, b: Body, t: number): { from: number; to: number; spin: number } {
  const [bx, by] = bodyState(b, t);
  const spin = bodySpin(b, t);
  const phi = Math.atan2(v.cy - by, v.cx - bx) - spin;
  const half = (Math.hypot(v.width, v.height) * 0.6) / (v.scale * b.radius);
  return { from: phi - half, to: phi + half, spin };
}

/** Ebene mit halber Auflösung für Rauch und Staub; `smokeDirty` = zuletzt benutzter Bereich. */
let smokeCanvas: HTMLCanvasElement | null = null;
let smokeDirty: { x: number; y: number; w: number; h: number } | null = null;
function smokeLayer(W: number, H: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const w = Math.ceil(W / 2);
  const h = Math.ceil(H / 2);
  if (!smokeCanvas) smokeCanvas = document.createElement('canvas');
  if (smokeCanvas.width !== w || smokeCanvas.height !== h) {
    smokeCanvas.width = w;
    smokeCanvas.height = h;
    smokeDirty = null;
  }
  const g = smokeCanvas.getContext('2d');
  if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  if (smokeDirty)
    g.clearRect(smokeDirty.x - 1, smokeDirty.y - 1, smokeDirty.w + 2, smokeDirty.h + 2);
  smokeDirty = null;
  g.setTransform(0.5, 0, 0, 0.5, 0, 0);
  return g;
}

/** Wie stark Bodendetails gerade abgedunkelt werden (Nacht), 0 = voll beleuchtet. */
let nightDim = 0;
/** Ausklappen der Solarflügel (0…1) und Zeitpunkt des letzten Bilds. */
let solarAnim = 0;
let solarClock = 0;

/** Lichtfleck auf dem Boden unter der Rakete (Scheinwerfer oder Triebwerksstrahl). */
function drawLampPool(
  ctx: CanvasRenderingContext2D,
  v: View,
  f: Flight,
  near: { body: Body; altitude: number },
  rgb: string,
  radius: number,
  strength: number,
  reach: number,
): void {
  const [bx, by] = bodyState(near.body, f.t);
  const up = Math.atan2(f.y - by, f.x - bx);
  const gx = bx + Math.cos(up) * near.body.radius;
  const gy = by + Math.sin(up) * near.body.radius;
  const [sx, sy] = toScreen(v, gx, gy);
  const [tx, ty] = toScreen(v, gx - Math.sin(up), gy + Math.cos(up));
  const img = softSprite(rgb, 0.35);
  if (!img) return;
  const r = radius * v.scale;
  if (r < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, strength * Math.max(0, 1 - near.altitude / reach));
  ctx.translate(sx, sy);
  ctx.rotate(Math.atan2(ty - sy, tx - sx));
  ctx.scale(1, 0.32);
  ctx.drawImage(img, -r, -r, 2 * r, 2 * r);
  ctx.restore();
}
const litCache = new Map<string, string>();

/** Farbe eines Bodendetails im aktuellen Licht. */
function lit(hex: string): string {
  if (nightDim < 0.01) return hex;
  const key = `${hex}|${nightDim}`;
  let c = litCache.get(key);
  if (!c) {
    c = mixHex(hex, '#05070f', nightDim);
    litCache.set(key, c);
  }
  return c;
}

/** Bäume in der Nähe der Startrampe, Felsen und kleine Krater auf den anderen Körpern. */
function drawSurfaceDetail(ctx: CanvasRenderingContext2D, v: View, b: Body, t: number): void {
  if (v.scale < 0.3 || !b.solid) return;
  const [bx, by] = bodyState(b, t);
  const { from, to, spin } = visibleArc(v, b, t);
  const R = b.radius;
  if (b === EARTH) {
    if (v.scale < 0.3) return;
    const step = 28 / R;
    const pad = Math.PI / 2;
    for (let i = Math.floor(from / step); i <= Math.ceil(to / step); i++) {
      const a = i * step;
      if (Math.abs(a - pad) * R < 220 || !onLand(a)) continue;
      if (hash(i, 41) < 0.35) continue;
      const hgt = 8 + hash(i, 42) * 12;
      ctx.save();
      local(ctx, v, bx + R * Math.cos(a), by + R * Math.sin(a), a);
      ctx.fillStyle = lit('#5b3a1e');
      ctx.fillRect(-0.4, 0, 0.8, hgt * 0.3);
      ctx.fillStyle = hash(i, 43) < 0.5 ? lit('#2f6b3a') : lit('#3d7d3f');
      if (hash(i, 44) < 0.5) {
        ctx.beginPath();
        ctx.moveTo(-hgt * 0.28, hgt * 0.25);
        ctx.lineTo(0, hgt);
        ctx.lineTo(hgt * 0.28, hgt * 0.25);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, hgt * 0.6, hgt * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    return;
  }
  const step = (b === PHOBOS ? 6 : 14) / R;
  const rock = b === MARS ? lit('#7a3219') : b === EUROPA ? lit('#b9a78c') : lit('#5f646c');
  for (let i = Math.floor(from / step); i <= Math.ceil(to / step); i++) {
    if (hash(i, 51) < 0.45) continue;
    const a = i * step;
    const w = 0.5 + hash(i, 52) ** 2 * 3.5;
    const wa = a + spin;
    ctx.save();
    local(ctx, v, bx + R * Math.cos(wa), by + R * Math.sin(wa), wa);
    if (hash(i, 53) < 0.18 && w > 1.5) {
      // flacher Krater
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, -0.05, w * 3, 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(-w, -0.2);
      ctx.lineTo(-w * 0.6, w * 0.55);
      ctx.lineTo(w * 0.2, w * 0.7);
      ctx.lineTo(w, 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-w * 0.5, w * 0.4, w * 0.4, w * 0.12);
    }
    ctx.restore();
  }
}

/** Etwas Tiefe im Boden: unter der Oberfläche wird es dunkler, am Horizont liegt Dunst. */
function drawGroundShade(
  ctx: CanvasRenderingContext2D,
  v: View,
  b: Body,
  t: number,
  day = 1,
): void {
  if (b === SUN || !b.solid || b.radius * v.scale < 2_500) return;
  const [bx, by] = bodyState(b, t);
  const d = Math.hypot(v.cx - bx, v.cy - by) || 1;
  const gy = toScreen(v, bx + ((v.cx - bx) / d) * b.radius, by + ((v.cy - by) / d) * b.radius)[1];
  if (gy > v.height + 10 || gy < -v.height) return;
  ctx.save();
  ctx.beginPath();
  if (!sectorPath(ctx, v, bx, by, b.radius, 0, 2 * Math.PI)) {
    ctx.restore();
    return;
  }
  ctx.clip();
  const depth = Math.max(60, Math.min(260, v.height * 0.35));
  const g = ctx.createLinearGradient(0, gy, 0, gy + depth);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.08, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, gy - 4, v.width, depth + v.height);
  ctx.restore();
  if (b.atmosphere > 0) {
    // Dunst über dem Horizont
    const haze = ctx.createLinearGradient(0, gy - 70, 0, gy + 2);
    const tint = b === MARS ? '232,170,130' : b === VENUS ? '240,200,120' : '200,225,255';
    haze.addColorStop(0, `rgba(${tint},0)`);
    haze.addColorStop(1, `rgba(${tint},${0.08 + 0.27 * day})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, gy - 70, v.width, 72);
  }
}

/** Wolken über der Erde: fest verankert, dichter über der Startrampe. */
const CLOUDS = Array.from({ length: 260 }, (_, i) => {
  const near = i < 60;
  return {
    a: near ? Math.PI / 2 + (hash(i, 61) - 0.5) * 0.18 : hash(i, 61) * Math.PI * 2,
    alt: 1_500 + hash(i, 62) * 6_500,
    size: 350 + hash(i, 63) * 1_400,
    puffs: 3 + Math.floor(hash(i, 64) * 4),
    seed: i,
  };
});

function drawClouds(ctx: CanvasRenderingContext2D, v: View, light: SunLight): void {
  if (v.scale < 0.004 || v.scale > 6) return;
  const [ex, ey] = [0, 0];
  // Licht in Stufen (gemerkte Bildchen): oben die Sonnenseite, unten der Schatten.
  const day = Math.round(light.day * 8) / 8;
  const dusk = Math.round(light.twilight * 4) / 4;
  const top = rgbOf(mixHex(mixHex('#1c2338', '#ffffff', day), '#ffb07a', dusk * 0.5));
  const bottom = rgbOf(mixHex(mixHex('#10152a', '#b7c3d9', day), '#b86a4c', dusk * 0.4));
  const img = cloudSprite(top, bottom);
  const rot = v.up - Math.PI / 2;
  for (const c of CLOUDS) {
    const r = EARTH.radius + c.alt;
    const [sx, sy] = toScreen(v, ex + r * Math.cos(c.a), ey + r * Math.sin(c.a));
    const sizePx = c.size * v.scale;
    if (sizePx < 3) continue;
    if (sx < -sizePx * 2 || sx > v.width + sizePx * 2 || sy < -sizePx || sy > v.height + sizePx)
      continue;
    // Die Wolke liegt waagerecht zur Oberfläche.
    const tang = -(c.a - Math.PI / 2 - rot);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(tang);
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < c.puffs; k++) {
      const off = (k / (c.puffs - 1) - 0.5) * sizePx * 1.4;
      const pr = sizePx * (0.3 + hash(c.seed * 7 + k, 65) * 0.24);
      const lift = hash(c.seed * 7 + k, 66) * pr * 0.45;
      if (img) ctx.drawImage(img, off - pr * 1.25, -lift - pr * 0.85, pr * 2.5, pr * 1.6);
      else {
        ctx.fillStyle = `rgb(${top})`;
        ctx.beginPath();
        ctx.ellipse(off, -lift, pr, pr * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** Basis auf einem Körper: Landefeld, Kuppel, Antenne mit Blinklicht. */
function drawSite(
  ctx: CanvasRenderingContext2D,
  v: View,
  site: LandingSite,
  t: number,
  time: number,
): void {
  const b = bodyById(site.body);
  const [bx, by] = bodyState(b, t);
  const a = bodySpin(b, t) + site.angle;
  const x = bx + b.radius * Math.cos(a);
  const y = by + b.radius * Math.sin(a);
  const [sx, sy] = toScreen(v, x, y);
  if (sx < -200 || sx > v.width + 200 || sy < -200 || sy > v.height + 200) return;
  if (v.scale < 0.15) {
    // Nur ein Fähnchen mit Namen
    ctx.strokeStyle = lit('#fde68a');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy - 18);
    ctx.stroke();
    ctx.fillStyle = lit('#f59e0b');
    ctx.beginPath();
    ctx.moveTo(sx, sy - 18);
    ctx.lineTo(sx + 10, sy - 14);
    ctx.lineTo(sx, sy - 10);
    ctx.fill();
    label(ctx, site.name, sx + 12, sy - 14, lit('#fde68a'));
    return;
  }
  ctx.save();
  local(ctx, v, x, y, a);
  ctx.fillStyle = lit('#6b7280');
  ctx.fillRect(-12, -0.4, 24, 0.5);
  ctx.strokeStyle = lit('#fde68a');
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.ellipse(0, 0.1, 9, 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Kuppel
  ctx.fillStyle = lit('#e5e7eb');
  ctx.beginPath();
  ctx.arc(-20, 0, 6, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = lit('#60a5fa');
  for (const wx of [-23, -20, -17]) ctx.fillRect(wx - 0.5, 2, 1, 1.2);
  // Antenne
  ctx.fillStyle = lit('#9aa3b2');
  ctx.fillRect(17, 0, 0.5, 14);
  ctx.fillStyle = `rgba(252,211,77,${Math.sin(time * 3) > 0 ? 1 : 0.2})`;
  ctx.beginPath();
  ctx.arc(17.25, 14.4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (v.scale < 1.5) label(ctx, site.name, sx + 14, sy - 20, lit('#fde68a'));
}

// ------------------------------------------------------------------ Raumstation

const METAL_STATION = ['#c9d1dc', '#f5f7fa', '#9aa3b2'];

function stationGrad(ctx: CanvasRenderingContext2D, w: number): CanvasGradient {
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, METAL_STATION[0]!);
  g.addColorStop(0.38, METAL_STATION[1]!);
  g.addColorStop(1, METAL_STATION[2]!);
  return g;
}

export function drawStation(
  ctx: CanvasRenderingContext2D,
  v: View,
  t: number,
  minPx: number,
): void {
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
    label(ctx, STATION.name, sx + 10, sy - 10, '#bfdbfe', 11, true);
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
    ctx.fillStyle = stationGrad(ctx, w);
    ctx.fillRect(-w / 2, a, w, b2 - a);
    ctx.strokeRect(-w / 2, a, w, b2 - a);
  }
  // Andockstutzen vorn mit Positionslicht
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(-1.2, 13, 2.4, STATION.port - 13);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-1.4, STATION.port - 0.4, 2.8, 0.6);
  ctx.restore();
}

// ------------------------------------------------------------------ Flugansicht

/** Himmelsfarben je Atmosphäre bei Tag: oben, unten. */
const SKY: Record<string, [string, string]> = {
  earth: ['#3d7fd6', '#a6d2ff'],
  mars: ['#b98a64', '#e8c29a'],
  venus: ['#b8792b', '#f0b35a'],
  jupiter: ['#8a6a4a', '#d8b48a'],
};
const NIGHT: [string, string] = ['#03050c', '#0a1024'];
const DUSK: Record<string, string> = {
  earth: '#ff8a4c',
  mars: '#7fa6c9',
  venus: '#e0782f',
  jupiter: '#c2865a',
};

export function flightView(
  f: Flight,
  width: number,
  height: number,
  scale: number,
  shakeX = 0,
  shakeY = 0,
): View {
  const near = f.nearest();
  const up0 = near.altitude < near.body.radius * 3 ? near.body : f.refBody();
  const c = f.state(up0);
  const up = Math.atan2(f.y - c.y, f.x - c.x);
  // Mit offenem Schirm liegt die Bildmitte zwischen Rakete und Schirm.
  const h = f.visualLength;
  return {
    width,
    height,
    scale,
    cx: f.x + Math.cos(f.angle) * h * 0.5,
    cy: f.y + Math.sin(f.angle) * h * 0.5,
    up,
    ox: width / 2 + shakeX,
    oy: height * 0.5 + shakeY,
  };
}

const DUST: Record<string, string> = {
  earth: '#cbbfae',
  moon: '#b4b8bf',
  mars: '#c8764a',
  phobos: '#9c8b78',
  mercury: '#a39a92',
  europa: '#e8e0d0',
  ganymede: '#b0a698',
  ceres: '#a09c96',
  venus: '#d8a860',
};

export interface FlightDrawOptions {
  time: number;
  /** Bildschirmfarbe der Explosion (Blitz). */
  flash?: number;
  /**
   * Mindestlänge der Rakete in Pixeln (damit sie bei automatischem Herauszoomen sichtbar
   * bleibt). Zoomt man selbst heraus, wird sie mit kleiner.
   */
  minRocket?: number;
  /**
   * Bildqualität (0,5…1) der Anpassung an langsame Geräte: Unter 0,85 fallen große, teure
   * Leuchteffekte weg (Sonnenschein, Abendrot, Blendflecken).
   */
  quality?: number;
}

export function drawFlight(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  opts: FlightDrawOptions,
): void {
  const { width: W, height: H } = v;
  const time = opts.time;
  const fancy = (opts.quality ?? 1) >= 0.85;
  const air = f.air();
  const near = f.nearest();
  const light = sunLight(v.cx, v.cy, near.body, f.t);

  // Himmel: Farbe der Luft, nach Sonnenstand zwischen Tag, Dämmerung und Nacht
  const colors = SKY[air.body.id];
  const inAir = colors && air.altitude < air.body.atmosphere * 1.1;
  const k = inAir ? Math.min(1, Math.max(0, air.altitude / (air.body.atmosphere * 1.1))) : 1;
  const dayTop = colors ? mixHex(NIGHT[0], colors[0], light.day) : NIGHT[0];
  const dayBottom = colors
    ? mixHex(
        mixHex(NIGHT[1], colors[1], light.day),
        DUSK[air.body.id] ?? '#ff8a4c',
        light.twilight * 0.7,
      )
    : NIGHT[1];
  const horizon = mixHex(dayBottom, '#060a16', Math.pow(k, 0.7));
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, mix(dayTop, '#03050c', Math.pow(k, 0.5)));
  sky.addColorStop(0.55, mix(mixHex(dayTop, dayBottom, 0.55), '#050812', Math.pow(k, 0.6)));
  sky.addColorStop(1, horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const starAlpha = inAir ? Math.max(Math.min(1, Math.max(0, (k - 0.3) / 0.6)), 1 - light.day) : 1;
  // Milchstraße, Sterne und der Planet als Kulisse: als eine Ebene, die nur neu gezeichnet wird,
  // wenn sich der Blick merklich gedreht hat, die Höhe sich ändert oder das Licht.
  const back = backdropFor(f, v, near.body, near.altitude, inAir ? k : 1);
  const bgKey = `${Math.round(v.up / 0.0015)}|${Math.round(starAlpha * 20)}|${back?.key ?? ''}`;
  // Am hellen Tag unten in der Luft sind keine Sterne zu sehen: dann die ganze Ebene sparen.
  if (starAlpha > 0.02 || back)
    BACKGROUND.draw(ctx, bgKey, (g) => {
      drawStars(g, v, starAlpha, -v.up, 0);
      if (back) {
        g.save();
        g.globalAlpha = back.fade;
        drawBody(g, back.view, near.body, f.t, 0);
        g.restore();
      }
    });
  void time;

  // Ferne Körper zuerst, nahe zuletzt.
  const dist = (b: Body): number => {
    const [bx, by] = bodyState(b, f.t);
    return Math.hypot(bx - f.x, by - f.y);
  };
  const order = [...BODIES].sort((a, b) => dist(b) - dist(a));
  // Bodenpunkt unter der Bildmitte (für Sonne und Horizont)
  const [nbx, nby] = bodyState(near.body, f.t);
  const nd = Math.hypot(v.cx - nbx, v.cy - nby) || 1;
  const groundY = toScreen(
    v,
    nbx + ((v.cx - nbx) / nd) * near.body.radius,
    nby + ((v.cy - nby) / nd) * near.body.radius,
  )[1];
  const closeUp = near.body.solid && near.body.radius * v.scale >= 20_000;
  if (near.body !== SUN && (inAir || closeUp))
    drawSkySun(ctx, v, light, groundY, inAir ? k : 1, !!inAir, fancy);
  const dimNow = near.body === SUN ? 0 : Math.round((1 - light.day) * 0.7 * 20) / 20;
  for (const b of order) {
    if (b === near.body && closeUp)
      drawRidges(
        ctx,
        v,
        b,
        f.t,
        bodySpin(b, f.t),
        horizon,
        dimNow,
        b === EARTH ? earthRidgeMask : undefined,
      );
    drawBody(ctx, v, b, f.t, b === SUN ? 3 : 1.2);
  }
  // Nachtseite der Nahansicht abdunkeln
  const nearPx = near.body.radius * v.scale;
  if (nearPx >= 20_000 && light.day < 0.99 && near.body !== SUN) {
    const [bx, by] = bodyState(near.body, f.t);
    ctx.beginPath();
    if (sectorPath(ctx, v, bx, by, near.body.radius, 0, 2 * Math.PI)) {
      ctx.fillStyle = `rgba(3,6,18,${(1 - light.day) * 0.62})`;
      ctx.fill();
    }
  }
  drawGroundShade(ctx, v, near.body, f.t, light.day);
  // Bäume, Felsen, Gebäude und Basen liegen nachts im Dunkeln: ihre Farben werden abgedunkelt
  // (in 5-%-Schritten, gemerkt). Früher per Helligkeitsfilter – der kostet auf vielen Geräten
  // für jede einzelne Form eine eigene Bildebene.
  nightDim = near.body === SUN ? 0 : Math.round((1 - light.day) * 0.7 * 20) / 20;
  drawSurfaceDetail(ctx, v, near.body, f.t);
  if (near.body === EARTH) drawLaunchComplex(ctx, v, time, lit, nightDim, f.status === 'flying');
  if (f.site) drawSite(ctx, v, f.site, f.t, time);
  nightDim = 0;
  if (near.body === EARTH && near.altitude < 25_000) drawClouds(ctx, v, light);
  drawStation(ctx, v, f.t, 6);

  // Satelliten in der Nähe
  for (const s of f.satellites) {
    const [x, y] = satelliteState(s, f.t);
    const [sx, sy] = toScreen(v, x, y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    ctx.save();
    local(ctx, v, x, y, f.t * 0.02 + s.id, Math.max(v.scale, 3.4));
    drawSatellite(ctx, s.part);
    ctx.restore();
    label(ctx, s.name, sx + 18, sy - 12, '#a5f3fc', 11);
  }

  // Trümmer
  setLighting(1, light.shadow ? 0.35 : 0.5 + 0.5 * light.day);
  for (const d of f.debris) {
    ctx.save();
    local(ctx, v, d.x, d.y, d.angle, Math.max(v.scale, 0.02));
    drawRocket(ctx, d.parts);
    ctx.restore();
  }

  // Rauch, Staub und Feuer: weiche Bausche (gemerkte Bildchen, nur skaliert eingeblendet)
  const dustRgb = rgbOf(DUST[near.body.id] ?? '#b4b8bf');
  // Rauchfarbe in 10 Helligkeitsstufen – so bleiben es wenige gemerkte Bildchen.
  const smokeRgb = rgbOf(
    mixHex('#5a5f6b', '#e4e8ef', Math.round((0.3 + 0.7 * light.day) * 10) / 10),
  );
  const smokeImg = softSprite(smokeRgb, 0.25);
  const dustImg = softSprite(dustRgb, 0.3);
  const fireImg = [
    softSprite('255,241,184', 0.45),
    softSprite('255,179,71', 0.4),
    softSprite('255,90,42', 0.35),
  ];
  const sparkImg = softSprite('255,207,115', 0.55);
  // Viele Rauchbausche: in eine Ebene mit halber Auflösung zeichnen und einmal vergrößert
  // einblenden – weiche Wolken sehen gleich aus, kosten aber nur ein Viertel der Pixel.
  const layer = f.particles.length > 50 ? smokeLayer(W, H) : null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of f.particles) {
    const [sx, sy] = toScreen(v, p.x, p.y);
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
    const q = p.life / p.max;
    const grow = p.kind === 'smoke' ? 1 + q * 5 : p.kind === 'dust' ? 1 + q * 3.5 : 1 + q * 2;
    const size = Math.max(
      1.2,
      Math.min(p.kind === 'smoke' ? 80 : 50, p.size * grow * Math.min(3, v.scale)),
    );
    const alpha =
      (1 - q) *
      (p.kind === 'smoke' ? 0.42 : p.kind === 'dust' ? 0.55 : p.kind === 'spark' ? 1 : 0.95);
    if (alpha < 0.03) continue;
    const soft = layer && (p.kind === 'smoke' || p.kind === 'dust');
    const g = soft ? layer : ctx;
    g.globalAlpha = alpha;
    const img =
      p.kind === 'smoke'
        ? smokeImg
        : p.kind === 'dust'
          ? dustImg
          : p.kind === 'fire'
            ? fireImg[q < 0.3 ? 0 : q < 0.6 ? 1 : 2]!
            : sparkImg;
    // Das Bildchen hat einen weichen Rand – etwas größer zeichnen als die alte Scheibe.
    const d = size * 2.3;
    if (soft) {
      x0 = Math.min(x0, sx - d / 2);
      y0 = Math.min(y0, sy - d / 2);
      x1 = Math.max(x1, sx + d / 2);
      y1 = Math.max(y1, sy + d / 2);
    }
    if (img) g.drawImage(img, sx - d / 2, sy - d / 2, d, d);
    else {
      g.fillStyle = `rgb(${p.kind === 'smoke' ? smokeRgb : dustRgb})`;
      g.beginPath();
      g.arc(sx, sy, size, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (layer && x1 > x0) {
    // Nur den benutzten Ausschnitt einblenden (in ganzen Ebenen-Pixeln).
    const bx = Math.max(0, Math.floor(x0 / 2));
    const by = Math.max(0, Math.floor(y0 / 2));
    const bw = Math.min(layer.canvas.width, Math.ceil(x1 / 2)) - bx;
    const bh = Math.min(layer.canvas.height, Math.ceil(y1 / 2)) - by;
    if (bw > 0 && bh > 0) {
      ctx.globalAlpha = 1;
      ctx.drawImage(layer.canvas, bx, by, bw, bh, bx * 2, by * 2, bw * 2, bh * 2);
    }
    smokeDirty = { x: bx, y: by, w: bw, h: bh };
  }
  ctx.globalAlpha = 1;

  if (f.status !== 'crashed') {
    const parts = f.segs.flatMap((s) => s.parts);
    const heightM = f.length;
    // Solarflügel klappen langsam aus und ein; Scheinwerfer brennen im Dunkeln.
    const dtAnim = Math.max(0, Math.min(0.2, time - solarClock));
    solarClock = time;
    solarAnim += ((f.solarOpen ? 1 : 0) - solarAnim) * Math.min(1, dtAnim * 1.2);
    if (solarAnim < 0.01) solarAnim = f.solarOpen ? 0.01 : 0;
    const dark = light.shadow || light.day < 0.45;
    const lamps = f.hasLights && dark && near.body !== SUN ? 1 : 0;
    if (lamps && near.altitude < 90 && near.body.solid)
      drawLampPool(ctx, v, f, near, '255,240,205', 6 + near.altitude * 0.55, 0.75, 90);
    // Der Triebwerksstrahl beleuchtet den Boden – nachts deutlich, am Tag nur ein warmer Schimmer.
    if (f.thrusting && near.altitude < 160 && near.body.solid && f.engine().thrust > 20_000) {
      const flare = (0.25 + 0.55 * (1 - light.day)) * f.throttle;
      drawLampPool(ctx, v, f, near, '255,170,80', 14 + near.altitude * 0.4, flare, 160);
    }
    const minPx = opts.minRocket ?? 34;
    const scale = Math.max(v.scale, minPx / Math.max(heightM, 1));
    // Licht von der Seite der Sonne
    const side = Math.sin(light.dir - f.angle) >= 0 ? 1 : -1;
    const level = light.shadow ? 0.3 : 0.55 + 0.45 * Math.max(light.day, inAir ? 0 : 1);
    setLighting(side, level, Math.max(0, (f.heat - 0.25) / 0.75));
    ctx.save();
    local(ctx, v, f.x, f.y, f.angle, scale);
    drawRocket(ctx, parts, {
      throttle: f.thrusting ? f.throttle : 0,
      air: air.rho,
      chuteOpen: f.chuteDeployed ? f.chuteOpen : 0,
      chuteArea: f.chuteArea,
      chuteCollapse: f.chuteCollapse,
      brakes: f.airbrakes ? 1 : 0,
      solar: solarAnim,
      lights: lamps,
      time,
    });
    if (f.rcs && (f.translate.x || f.translate.y) && f.status === 'flying')
      drawRcsPuffs(ctx, f, heightM, time);
    ctx.restore();
    setLighting(1, 1);
    drawHeating(ctx, f, v, heightM * scale, time);
    drawVelocityMarkers(ctx, f, v, heightM * scale);
    drawTargetMarker(ctx, f, v, heightM * scale);
    drawManeuverMarker(ctx, f, v, heightM * scale);
    drawSiteArrow(ctx, f, v);
    // Weit herausgezoomt: Markierung, damit man die winzige Rakete wiederfindet.
    if (heightM * scale < 10) drawRocketMarker(ctx, v, f, heightM * scale);
    drawGroundTag(ctx, f, v, heightM * scale);
  }
  const flash = opts.flash ?? 0;
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,240,210,${flash * 0.65})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Zwischengespeicherter Hintergrund der Flugansicht. */
const BACKGROUND = new LayerCache();

/**
 * Der Planet unter der Rakete als Kulisse: Hoch über dem Boden (wenn der echte Boden längst unter
 * dem Bildrand liegt) sieht man ihn wie aus dem Fenster – die Krümmung, Kontinente, Wolken, die
 * Nachtseite und den Schein der Atmosphäre. Je höher, desto kleiner wird er. Liefert die Kamera
 * dafür (gezeichnet mit derselben Fernansicht wie auf der Karte) und einen Schlüssel für den
 * Zwischenspeicher – oder null, wenn der echte Boden zu sehen ist.
 */
function backdropFor(
  f: Flight,
  v: View,
  body: Body,
  altitude: number,
  airFade: number,
): { view: View; fade: number; key: string } | null {
  if (body === SUN || altitude > body.radius * 40) return null;
  const { width: W, height: H } = v;
  // Erst, wenn der echte Boden unter dem Bild verschwunden ist – dann weich einblenden.
  const groundPx = altitude * v.scale;
  const fade = Math.min(1, Math.max(0, (groundPx - 0.6 * H) / (0.8 * H))) * airFade;
  if (fade < 0.02) return null;
  const [bx, by] = bodyState(body, f.t);
  const [bsx, bsy] = toScreen(v, bx, by);
  const dx = bsx - v.ox;
  const dy = bsy - v.oy;
  const d = Math.hypot(dx, dy) || 1;
  // Scheinbare Größe wie von oben gesehen: sin des Blickwinkels auf den Rand.
  const sinT = body.radius / (body.radius + altitude);
  // Höchstens so groß, dass die Fernansicht mit Oberflächenbild greift.
  const rPx = Math.min(2_400, (H * 0.9 * sinT) / (1 - sinT * 0.985));
  const dist = H * 0.3 + rPx;
  const view: View = {
    ...v,
    scale: rPx / body.radius,
    cx: bx,
    cy: by,
    ox: v.ox + (dx / d) * dist,
    oy: v.oy + (dy / d) * dist,
  };
  if (view.ox < -rPx * 1.2 - W || view.ox > W * 2 + rPx * 1.2) return null;
  const [sunX, sunY] = bodyState(SUN, f.t);
  const sun = Math.atan2(sunY - by, sunX - bx);
  const spin = bodySpin(body, f.t) || orbitAngle(body, f.t);
  const key = [
    body.id,
    Math.round(Math.log(altitude + 1) * 400),
    Math.round(fade * 40),
    Math.round(sun * 300),
    Math.round(spin * 600),
    Math.round(view.ox),
    Math.round(view.oy),
  ].join(',');
  return { view, fade, key };
}

/**
 * Liegt der Boden unter dem Bildrand, zeigt ein kleines Schild unter der Rakete, wie weit er noch
 * weg ist – beim Sinken und dicht über dem Boden (die Kamera zeigt die Rakete groß, der Boden
 * taucht erst spät auf).
 */
function drawGroundTag(ctx: CanvasRenderingContext2D, f: Flight, v: View, rocketPx: number): void {
  if (f.status !== 'flying') return;
  const { body, altitude } = f.nearest();
  if (!body.solid || altitude > 20_000) return;
  const c = f.state(body);
  const rx = f.x - c.x;
  const ry = f.y - c.y;
  const r = Math.hypot(rx, ry);
  const sink = -(rx * (f.vx - c.vx) + ry * (f.vy - c.vy)) / r;
  if (sink < 1 && altitude > 3_000) return;
  const [gx, gy] = toScreen(v, c.x + (rx / r) * body.radius, c.y + (ry / r) * body.radius);
  if (gx > -20 && gx < v.width + 20 && gy > -20 && gy < v.height - 60) return;
  const [sx, sy] = toScreen(v, f.x, f.y);
  const dx = gx - sx;
  const dy = gy - sy;
  const d = Math.hypot(dx, dy) || 1;
  const off = Math.max(28, rocketPx * 0.15 + 26);
  const x = sx + (dx / d) * off;
  const y = sy + (dy / d) * off;
  const text = `Boden ${altitude < 10_000 ? `${Math.round(altitude).toLocaleString('de-DE')} m` : `${(altitude / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km`}`;
  ctx.save();
  ctx.font = '600 12px Jost, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 26;
  ctx.fillStyle = 'rgba(8,12,24,0.72)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 11, w, 22, 11);
  ctx.fill();
  ctx.fillStyle = sink > 40 && altitude < 2_000 ? '#fca5a5' : '#e2e8f0';
  const a = Math.atan2(dy, dx);
  ctx.translate(x - w / 2 + 11, y);
  ctx.rotate(a - Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(-4, -3);
  ctx.lineTo(4, -3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.font = '600 12px Jost, system-ui, sans-serif';
  ctx.fillStyle = sink > 40 && altitude < 2_000 ? '#fca5a5' : '#e2e8f0';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x - w / 2 + 20, y + 0.5);
  ctx.restore();
}

/** Ring und Pfeil um eine winzige Rakete (Spitze zeigt, wohin die Nase zeigt). */
function drawRocketMarker(ctx: CanvasRenderingContext2D, v: View, f: Flight, px: number): void {
  const [sx, sy] = toScreen(v, f.x, f.y);
  const a = screenAngle(v, f.angle);
  const alpha = Math.min(1, (10 - px) / 6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(sx, sy);
  ctx.rotate(a);
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(10, -4);
  ctx.lineTo(10, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
    const flick = 0.85 + 0.15 * Math.sin(time * 37) * Math.sin(time * 23);
    const cool = f.shielded;
    const hx = cx + ux * r * 0.9;
    const hy = cy + uy * r * 0.9;
    // Querrichtung
    const px = -uy;
    const py = ux;
    const L = r * (5 + 3 * heat);
    ctx.globalCompositeOperation = 'lighter';
    // Stoßwelle: eine nach hinten offene, leuchtende Schale vor der Rakete
    const shell = ctx.createLinearGradient(
      hx + ux * r * 0.6,
      hy + uy * r * 0.6,
      hx - ux * L,
      hy - uy * L,
    );
    shell.addColorStop(0, `rgba(255,250,235,${0.85 * heat * flick})`);
    shell.addColorStop(
      0.12,
      cool ? `rgba(255,196,120,${0.6 * heat})` : `rgba(255,140,70,${0.65 * heat})`,
    );
    shell.addColorStop(0.45, `rgba(255,${cool ? 110 : 70},${cool ? 70 : 90},${0.3 * heat})`);
    shell.addColorStop(1, 'rgba(200,60,140,0)');
    ctx.fillStyle = shell;
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const sgn = (i / n) * 2 - 1;
      const w = r * 1.35 * sgn * (1 + Math.abs(sgn) * 0.6);
      const back = r * 0.55 - L * sgn * sgn;
      const x = hx + ux * back + px * w;
      const y = hy + uy * back + py * w;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // Innenkante der Schale (die Rakete sitzt im dunkleren Kern)
    for (let i = n; i >= 0; i--) {
      const sgn = (i / n) * 2 - 1;
      const w = r * 0.8 * sgn;
      const back = r * 0.1 - L * 0.9 * sgn * sgn;
      ctx.lineTo(hx + ux * back + px * w, hy + uy * back + py * w);
    }
    ctx.closePath();
    ctx.fill();
    // Heißer Kern an der Front
    const core = softSprite(cool ? '255,226,170' : '255,200,150', 0.3);
    if (core) {
      const cr = r * (1.1 + 0.25 * heat) * flick;
      ctx.globalAlpha = Math.min(1, 0.9 * heat + 0.1);
      ctx.drawImage(core, hx - cr, hy - cr, 2 * cr, 2 * cr);
    }
    // Flammenzungen, die nach hinten wegströmen
    ctx.globalAlpha = 1;
    for (let k = -3; k <= 3; k++) {
      const wob = Math.sin(time * 19 + k * 2.1) * Math.sin(time * 7 + k);
      const len = L * (0.55 + 0.3 * wob) * (1 - Math.abs(k) * 0.08);
      const bx = hx - ux * r * 0.3 + px * k * r * 0.24;
      const by = hy - uy * r * 0.3 + py * k * r * 0.24;
      const tx = bx - ux * len + px * k * r * 0.5;
      const ty = by - uy * len + py * k * r * 0.5;
      const g = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0, `rgba(255,${cool ? 210 : 170},${cool ? 130 : 100},${0.55 * heat})`);
      g.addColorStop(0.5, `rgba(255,90,70,${0.25 * heat})`);
      g.addColorStop(1, 'rgba(180,60,160,0)');
      ctx.fillStyle = g;
      const wdt = r * 0.2;
      ctx.beginPath();
      ctx.moveTo(bx + px * wdt, by + py * wdt);
      ctx.quadraticCurveTo(
        (bx + tx) / 2 + px * wdt * (1.6 + wob),
        (by + ty) / 2 + py * wdt * (1.6 + wob),
        tx,
        ty,
      );
      ctx.quadraticCurveTo(
        (bx + tx) / 2 - px * wdt * (1.6 - wob),
        (by + ty) / 2 - py * wdt * (1.6 - wob),
        bx - px * wdt,
        by - py * wdt,
      );
      ctx.closePath();
      ctx.fill();
    }
    // Glühende Funken vom Hitzeschild
    const spark = softSprite('255,220,160', 0.6);
    if (spark && heat > 0.25) {
      for (let k = 0; k < 14; k++) {
        const q = (time * (1.3 + hash(k, 201)) + hash(k, 202)) % 1;
        const side = (hash(k, 203) - 0.5) * r * 2.2 * (0.4 + q);
        const x = hx - ux * L * q * 1.1 + px * side;
        const y = hy - uy * L * q * 1.1 + py * side;
        const sr = 2 + 2.5 * (1 - q);
        ctx.globalAlpha = (1 - q) * heat;
        ctx.drawImage(spark, x - sr, y - sr, 2 * sr, 2 * sr);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
  const s = f.speedFrame();
  const speed = Math.hypot(s.vx, s.vy);
  if (speed < 0.2) return;
  const [rx, ry] = toScreen(v, f.x, f.y);
  const [ax, ay] = toScreen(v, f.x + s.vx / speed, f.y + s.vy / speed);
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
  const s = f.status === 'flying' ? f.targetState() : null;
  if (!s) return;
  const [cx, cy] = toScreen(v, v.cx, v.cy);
  const [gx, gy] = toScreen(v, s.x, s.y);
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

/** Blauer Marker: Richtung des geplanten Manövers. */
function drawManeuverMarker(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  rocketPx: number,
): void {
  if (!f.node || f.status !== 'flying') return;
  const r = f.nodeRemaining();
  if (r.mag < 0.01) return;
  const [cx, cy] = toScreen(v, v.cx, v.cy);
  const [gx, gy] = toScreen(v, v.cx + r.x / r.mag, v.cy + r.y / r.mag);
  const d = Math.hypot(gx - cx, gy - cy) || 1;
  const dist = Math.max(70, rocketPx / 2 + 46);
  const px = cx + ((gx - cx) / d) * dist;
  const py = cy + ((gy - cy) / d) * dist;
  ctx.strokeStyle = '#60a5fa';
  ctx.fillStyle = 'rgba(96,165,250,0.25)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(px, py, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 - Math.PI / 2;
    ctx.moveTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9);
    ctx.lineTo(px + Math.cos(a) * 15, py + Math.sin(a) * 15);
  }
  ctx.stroke();
}

/** Pfeil am Bildrand zum Landeplatz einer Herausforderung. */
function drawSiteArrow(ctx: CanvasRenderingContext2D, f: Flight, v: View): void {
  const site = f.site;
  if (!site) return;
  const b = bodyById(site.body);
  const [bx, by] = bodyState(b, f.t);
  const a = bodySpin(b, f.t) + site.angle;
  const [sx, sy] = toScreen(v, bx + b.radius * Math.cos(a), by + b.radius * Math.sin(a));
  const m = 40;
  if (sx > m && sx < v.width - m && sy > m && sy < v.height - m) return;
  const cx = v.width / 2;
  const cy = v.height / 2;
  const dx = sx - cx;
  const dy = sy - cy;
  const k = Math.min((v.width / 2 - m) / Math.abs(dx || 1), (v.height / 2 - m) / Math.abs(dy || 1));
  const px = cx + dx * k;
  const py = cy + dy * k;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, -8);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const info = f.siteInfo();
  if (info)
    label(
      ctx,
      `${site.name} ${info.distance < 10_000 ? `${Math.round(info.distance)} m` : `${Math.round(info.distance / 1000)} km`}`,
      px + (dx > 0 ? -150 : 14),
      py + (dy > 0 ? -16 : 16),
      '#fde68a',
      11,
    );
}
