/** Kamera und gemeinsame Zeichenhilfen für Flugansicht und Karte. */

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

export function toScreen(v: View, x: number, y: number): [number, number] {
  const rot = v.up - Math.PI / 2;
  const dx = x - v.cx;
  const dy = y - v.cy;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  const u = dx * c - dy * s;
  const w = dx * s + dy * c;
  return [v.ox + u * v.scale, v.oy - w * v.scale];
}

/** Bildschirmpunkt zurück in Weltkoordinaten. */
export function toWorld(v: View, sx: number, sy: number): [number, number] {
  const u = (sx - v.ox) / v.scale;
  const w = -(sy - v.oy) / v.scale;
  const rot = v.up - Math.PI / 2;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [v.cx + u * c - w * s, v.cy + u * s + w * c];
}

/** Weltwinkel als Bildschirmwinkel (für Pfeile und Marker). */
export function screenAngle(v: View, worldAngle: number): number {
  return -(worldAngle - (v.up - Math.PI / 2));
}

/** Lokales Koordinatensystem (m, y entlang `axis`) an einem Weltpunkt. */
export function local(
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

/** Gleichverteilte Pseudozufallszahl aus einer ganzen Zahl (immer dieselbe). */
export function hash(i: number, n = 0): number {
  const x = Math.sin(i * 91.345 + n * 47.853) * 24634.6345;
  return x - Math.floor(x);
}

// ------------------------------------------------------------------ Sterne

const STARS = Array.from({ length: 320 }, (_, i) => ({
  x: hash(i, 1),
  y: hash(i, 2),
  s: 0.4 + hash(i, 3) ** 2 * 1.8,
  a: 0.3 + hash(i, 4) * 0.7,
  tw: hash(i, 5) * 6.28,
  warm: hash(i, 6),
}));

/** Milchstraße: ein weiches Band quer über den Himmel. */
const MILKY = Array.from({ length: 70 }, (_, i) => ({
  t: hash(i, 7),
  off: (hash(i, 8) - 0.5) * 0.16,
  r: 0.03 + hash(i, 9) * 0.07,
  a: 0.03 + hash(i, 10) * 0.05,
}));

export function drawStars(
  ctx: CanvasRenderingContext2D,
  v: View,
  alpha: number,
  spin: number,
  time = 0,
): void {
  if (alpha <= 0.01) return;
  const { width: W, height: H } = v;
  const R = Math.hypot(W, H) / 2;
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  // Milchstraße zuerst, ganz schwach.
  for (const m of MILKY) {
    const px = (m.t - 0.5) * 2.2 * R;
    const py = (m.off + (m.t - 0.5) * 0.5) * 2 * R;
    const x = W / 2 + px * c - py * s;
    const y = H / 2 + px * s + py * c;
    const rad = m.r * R;
    if (x < -rad || x > W + rad || y < -rad || y > H + rad) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(190,200,255,${m.a * alpha})`);
    g.addColorStop(1, 'rgba(190,200,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  for (const st of STARS) {
    const px = (st.x - 0.5) * 2 * R;
    const py = (st.y - 0.5) * 2 * R;
    const x = W / 2 + px * c - py * s;
    const y = H / 2 + px * s + py * c;
    if (x < 0 || x > W || y < 0 || y > H) continue;
    const twinkle = 0.75 + 0.25 * Math.sin(time * 2.3 + st.tw);
    ctx.globalAlpha = st.a * alpha * twinkle;
    ctx.fillStyle = st.warm > 0.85 ? '#ffd9a8' : st.warm < 0.12 ? '#b9d4ff' : '#ffffff';
    ctx.fillRect(x, y, st.s, st.s);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ Farben

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Farbe zwischen zwei Hex-Farben. */
export function mix(a: string, b: string, t: number): string {
  const pa = rgb(a);
  const pb = rgb(b);
  const k = Math.max(0, Math.min(1, t));
  const c = pa.map((x, i) => Math.round(x + (pb[i]! - x) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Wie `mix`, aber als Hex (für weitere Mischungen). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = rgb(a);
  const pb = rgb(b);
  const k = Math.max(0, Math.min(1, t));
  return `#${pa
    .map((x, i) =>
      Math.round(x + (pb[i]! - x) * k)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

// ------------------------------------------------------------------ Formen

/**
 * Pfad eines Kreissektors eines Körpers. Bei starker Vergrößerung nur der sichtbare Ausschnitt,
 * als Streifen unter der Oberfläche – so bleiben die Bildschirmkoordinaten klein.
 */
export function sectorPath(
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

/** Organische Umrisse: Kreis mit überlagerten Wellen, als glatte Kurve gezeichnet. */
export function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
): void {
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

/** Beschriftung mit dunklem Rand; weicht am rechten Rand nach links aus. */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 12,
): void {
  ctx.font = `600 ${size}px Jost, system-ui, sans-serif`;
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

export function circle(
  ctx: CanvasRenderingContext2D,
  v: View,
  x: number,
  y: number,
  r: number,
): void {
  const [sx, sy] = toScreen(v, x, y);
  const rp = r * v.scale;
  if (rp < 2 || rp > 2e5) return;
  if (sx + rp < 0 || sx - rp > v.width || sy + rp < 0 || sy - rp > v.height) return;
  ctx.beginPath();
  ctx.arc(sx, sy, rp, 0, Math.PI * 2);
  ctx.stroke();
}
