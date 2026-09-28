/**
 * Flugansicht: Himmel mit Tag, Nacht und Dämmerung, Himmelskörper, Wolken, Bäume und Felsen,
 * Startanlage, Stationen und Basen, Satelliten, Rauch, Rakete und Richtungsmarker.
 */
import { drawRocket, drawSatellite, setLighting } from './draw';
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
  blob,
  drawStars,
  hash,
  label,
  local,
  mix,
  mixHex,
  screenAngle,
  sectorPath,
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
};

/** Bodenfarbe in der Nahansicht. */
const GROUND: Record<string, string> = {
  mercury: '#8c827a',
  venus: '#b8864a',
  moon: '#9aa0a8',
  mars: '#b04a26',
  phobos: '#7d6f60',
  europa: '#d8ccb6',
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

/** Zeichnet einen Himmelskörper (die Erde hat ihre eigene Funktion). */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  v: View,
  b: Body,
  t: number,
  minPx = 0,
): void {
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
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(-0.4, 0, 0.8, hgt * 0.3);
      ctx.fillStyle = hash(i, 43) < 0.5 ? '#2f6b3a' : '#3d7d3f';
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
  const rock = b === MARS ? '#7a3219' : b === EUROPA ? '#b9a78c' : '#5f646c';
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
function drawGroundShade(ctx: CanvasRenderingContext2D, v: View, b: Body, t: number): void {
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
    haze.addColorStop(1, `rgba(${tint},0.35)`);
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
  const color = mixHex(mixHex('#1c2338', '#ffffff', light.day), '#ffb07a', light.twilight * 0.5);
  const shadowC = mixHex(mixHex('#141a2c', '#c9d3e6', light.day), '#c77b5a', light.twilight * 0.4);
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
    const cos = Math.cos(tang);
    const sin = Math.sin(tang);
    ctx.globalAlpha = 0.85;
    for (let k = 0; k < c.puffs; k++) {
      const off = (k / (c.puffs - 1) - 0.5) * sizePx * 1.4;
      const pr = sizePx * (0.28 + hash(c.seed * 7 + k, 65) * 0.22);
      const lift = hash(c.seed * 7 + k, 66) * pr * 0.4;
      const px = sx + off * cos + lift * sin;
      const py = sy + off * sin - lift * cos;
      ctx.fillStyle = shadowC;
      ctx.beginPath();
      ctx.ellipse(px, py + pr * 0.18, pr, pr * 0.62, tang, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(px, py, pr * 0.95, pr * 0.58, tang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Startanlage: Rampe, Turm mit Blinklicht, Montagehalle und Treibstofftanks. */
function drawLaunchPad(ctx: CanvasRenderingContext2D, v: View, time: number): void {
  if (v.scale < 0.03) return;
  const R = EARTH.radius;
  ctx.save();
  local(ctx, v, 0, R, Math.PI / 2);
  // Montagehalle
  ctx.fillStyle = '#d9dde3';
  ctx.fillRect(-150, 0, 58, 62);
  ctx.fillStyle = '#b9c0ca';
  ctx.fillRect(-150, 0, 8, 62);
  ctx.fillStyle = '#6b7380';
  ctx.fillRect(-132, 0, 22, 48);
  ctx.fillStyle = '#2f5fbf';
  ctx.fillRect(-150, 52, 58, 5);
  ctx.fillStyle = '#e0503a';
  ctx.fillRect(-146, 38, 10, 7);
  // Tanks
  for (const x of [58, 76]) {
    ctx.fillStyle = '#6b7380';
    ctx.fillRect(x - 4, 0, 1, 7);
    ctx.fillRect(x + 3, 0, 1, 7);
    ctx.beginPath();
    ctx.arc(x, 12, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#eef1f5';
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.arc(x + 2, 11, 6.5, -1, 1.4);
    ctx.fill();
  }
  if (v.scale >= 0.25) {
    ctx.fillStyle = '#5c6470';
    ctx.fillRect(-9, -1.2, 18, 1.2);
    ctx.fillStyle = '#3c434d';
    ctx.fillRect(-12, -3, 24, 1.8);
    ctx.fillStyle = '#1a1d23';
    ctx.fillRect(-3, -3, 6, 1.8);
    // Turm
    ctx.strokeStyle = '#c0452f';
    ctx.lineWidth = 0.35;
    ctx.strokeRect(5, 0, 2.2, 34);
    ctx.beginPath();
    for (let y = 0; y < 34; y += 2.2) {
      ctx.moveTo(5, y);
      ctx.lineTo(7.2, y + 2.2);
      ctx.moveTo(7.2, y);
      ctx.lineTo(5, y + 2.2);
    }
    ctx.stroke();
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(4.6, 34, 3, 0.6);
    // Blitzableiter mit Blinklicht
    ctx.fillStyle = '#9aa3b2';
    ctx.fillRect(5.9, 34.6, 0.3, 6);
    ctx.fillStyle = `rgba(255,60,60,${Math.sin(time * 4) > 0.3 ? 1 : 0.25})`;
    ctx.beginPath();
    ctx.arc(6.05, 40.8, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy - 18);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 18);
    ctx.lineTo(sx + 10, sy - 14);
    ctx.lineTo(sx, sy - 10);
    ctx.fill();
    label(ctx, site.name, sx + 12, sy - 14, '#fde68a');
    return;
  }
  ctx.save();
  local(ctx, v, x, y, a);
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(-12, -0.4, 24, 0.5);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 0.35;
  ctx.beginPath();
  ctx.ellipse(0, 0.1, 9, 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Kuppel
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.arc(-20, 0, 6, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#60a5fa';
  for (const wx of [-23, -20, -17]) ctx.fillRect(wx - 0.5, 2, 1, 1.2);
  // Antenne
  ctx.fillStyle = '#9aa3b2';
  ctx.fillRect(17, 0, 0.5, 14);
  ctx.fillStyle = `rgba(252,211,77,${Math.sin(time * 3) > 0 ? 1 : 0.2})`;
  ctx.beginPath();
  ctx.arc(17.25, 14.4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (v.scale < 1.5) label(ctx, site.name, sx + 14, sy - 20, '#fde68a');
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
  const h = f.length;
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
}

export function drawFlight(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  opts: FlightDrawOptions,
): void {
  const { width: W, height: H } = v;
  const time = opts.time;
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
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, mix(dayTop, '#03050c', Math.pow(k, 0.5)));
  sky.addColorStop(1, mix(dayBottom, '#060a16', Math.pow(k, 0.7)));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const starAlpha = inAir ? Math.max(Math.min(1, Math.max(0, (k - 0.3) / 0.6)), 1 - light.day) : 1;
  drawStars(ctx, v, starAlpha, -v.up, time);

  // Ferne Körper zuerst, nahe zuletzt.
  const dist = (b: Body): number => {
    const [bx, by] = bodyState(b, f.t);
    return Math.hypot(bx - f.x, by - f.y);
  };
  const order = [...BODIES].sort((a, b) => dist(b) - dist(a));
  for (const b of order) drawBody(ctx, v, b, f.t, b === SUN ? 3 : 1.2);
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
  drawGroundShade(ctx, v, near.body, f.t);
  // Bäume, Felsen, Gebäude und Basen liegen nachts im Dunkeln.
  // In 5-%-Schritten (der Filter wird dann seltener neu gesetzt); ohne Filter-Unterstützung
  // (ältere Safari) bleiben die Details einfach hell.
  const dim = near.body === SUN ? 1 : Math.round((0.3 + 0.7 * light.day) * 20) / 20;
  const canFilter = typeof ctx.filter === 'string';
  if (dim < 0.99 && canFilter) ctx.filter = `brightness(${dim})`;
  drawSurfaceDetail(ctx, v, near.body, f.t);
  if (near.body === EARTH) drawLaunchPad(ctx, v, time);
  if (f.site) drawSite(ctx, v, f.site, f.t, time);
  if (canFilter) ctx.filter = 'none';
  if (near.body === EARTH && near.altitude < 25_000) drawClouds(ctx, v, light);
  drawStation(ctx, v, f.t, 6);

  // Satelliten in der Nähe
  for (const s of f.satellites) {
    const [x, y] = satelliteState(s, f.t);
    const [sx, sy] = toScreen(v, x, y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    ctx.save();
    local(ctx, v, x, y, f.t * 0.02 + s.id, Math.max(v.scale, 3.4));
    drawSatellite(ctx);
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

  // Rauch, Staub und Feuer
  const dustColor = DUST[near.body.id] ?? '#b4b8bf';
  const smokeColor = mixHex('#5a5f6b', '#e4e8ef', 0.3 + 0.7 * light.day);
  for (const p of f.particles) {
    const [sx, sy] = toScreen(v, p.x, p.y);
    if (sx < -80 || sx > W + 80 || sy < -80 || sy > H + 80) continue;
    const q = p.life / p.max;
    const grow = p.kind === 'smoke' ? 1 + q * 5 : p.kind === 'dust' ? 1 + q * 3.5 : 1 + q * 2;
    const size = Math.max(
      1.2,
      Math.min(p.kind === 'smoke' ? 70 : 45, p.size * grow * Math.min(3, v.scale)),
    );
    ctx.globalAlpha =
      (1 - q) *
      (p.kind === 'smoke' ? 0.32 : p.kind === 'dust' ? 0.45 : p.kind === 'spark' ? 0.9 : 0.85);
    ctx.fillStyle =
      p.kind === 'smoke'
        ? smokeColor
        : p.kind === 'dust'
          ? dustColor
          : p.kind === 'fire'
            ? q < 0.3
              ? '#fff1b8'
              : q < 0.6
                ? '#ffb347'
                : '#ff5a2a'
            : '#ffcf73';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (f.status !== 'crashed') {
    const parts = f.segs.flatMap((s) => s.parts);
    const heightM = f.length;
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
      chuteOpen: f.chute === 'open' ? f.chuteOpen : 0,
      chuteArea: f.chuteArea,
      brakes: f.airbrakes ? 1 : 0,
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
  }
  const flash = opts.flash ?? 0;
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,240,210,${flash * 0.65})`;
    ctx.fillRect(0, 0, W, H);
  }
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
    const flick = 0.85 + 0.15 * Math.sin(time * 37);
    const hx = cx + ux * r * 0.9;
    const hy = cy + uy * r * 0.9;
    const cool = f.shielded;
    const ang = Math.atan2(uy, ux);
    ctx.globalAlpha = 1;
    // Plasmahülle um die Rakete, nach hinten gezogen
    const sheath = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 2.6);
    sheath.addColorStop(0, `rgba(255,236,200,${0.55 * heat * flick})`);
    sheath.addColorStop(0.4, `rgba(255,${cool ? 150 : 110},${cool ? 90 : 60},${0.45 * heat})`);
    sheath.addColorStop(1, 'rgba(255,60,120,0)');
    ctx.fillStyle = sheath;
    ctx.beginPath();
    ctx.ellipse(cx - ux * r * 0.4, cy - uy * r * 0.4, r * 2.6, r * 1.5, ang, 0, Math.PI * 2);
    ctx.fill();
    // Flammenzungen, die nach hinten wegströmen
    for (let k = -2; k <= 2; k++) {
      const len = r * (4.5 + 2.5 * Math.sin(time * 23 + k * 1.7)) * heat;
      const side = k * r * 0.28;
      const bx = hx - uy * side;
      const by = hy + ux * side;
      const tx = bx - ux * len;
      const ty = by - uy * len;
      const g = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0, `rgba(255,${cool ? 200 : 170},${cool ? 120 : 90},${0.7 * heat})`);
      g.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - uy * r * 0.16, by + ux * r * 0.16);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + uy * r * 0.16, by - ux * r * 0.16);
      ctx.closePath();
      ctx.fill();
    }
    // Heller Kern an der Front (Stoßwelle)
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 1.3);
    g.addColorStop(0, `rgba(255,250,235,${0.95 * heat * flick})`);
    g.addColorStop(
      0.4,
      cool ? `rgba(255,190,110,${0.75 * heat})` : `rgba(255,130,60,${0.8 * heat})`,
    );
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 1.3, 0, Math.PI * 2);
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
