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

const STARS = Array.from({ length: 460 }, (_, i) => ({
  x: hash(i, 1),
  y: hash(i, 2),
  s: 0.4 + hash(i, 3) ** 3 * 2.2,
  a: 0.25 + hash(i, 4) * 0.75,
  tw: hash(i, 5) * 6.28,
  warm: hash(i, 6),
}));

/** Milchstraße: ein weiches Band quer über den Himmel (dicht, mit dunklen Staubbändern). */
const MILKY = Array.from({ length: 150 }, (_, i) => ({
  t: hash(i, 7),
  off: (hash(i, 8) - 0.5) * 0.13,
  r: 0.025 + hash(i, 9) * 0.07,
  a: 0.035 + hash(i, 10) * 0.05,
  hue: hash(i, 11),
}));

/** Farbige Nebel (Lichtjahre entfernt – sie drehen sich nur mit dem Himmel). */
const NEBULAE: readonly [number, number, number, string][] = [
  [0.22, 0.28, 0.16, '140,90,220'],
  [0.74, 0.7, 0.19, '60,150,190'],
  [0.63, 0.2, 0.11, '220,90,140'],
  [0.3, 0.8, 0.13, '90,120,230'],
];

/**
 * Hintergrund aus Milchstraße und Nebeln – einmal in ein eigenes Bild gezeichnet und dann nur noch
 * gedreht eingeblendet. Vorher kostete er in jedem Bild 70 große Farbverläufe (auf Tablets der
 * teuerste Teil des Himmels).
 */
let skyLayer: { canvas: HTMLCanvasElement; size: number } | null = null;
let skyLayerFailed = false;

function makeSkyLayer(): { canvas: HTMLCanvasElement; size: number } | null {
  if (skyLayerFailed || typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) {
    skyLayerFailed = true;
    return null;
  }
  const R = size / 2;
  for (const [nx, ny, nr, rgbStr] of NEBULAE) {
    const x = nx * size;
    const y = ny * size;
    const rad = nr * size;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${rgbStr},0.13)`);
    gr.addColorStop(0.5, `rgba(${rgbStr},0.05)`);
    gr.addColorStop(1, `rgba(${rgbStr},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  for (const m of MILKY) {
    const px = (m.t - 0.5) * 2.2 * R;
    const py = (m.off + (m.t - 0.5) * 0.5) * 2 * R;
    const x = R + px;
    const y = R + py;
    const rad = m.r * R;
    const col = m.hue > 0.8 ? '255,215,190' : m.hue < 0.2 ? '170,190,255' : '200,208,255';
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col},${m.a})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  // Dunkle Staubbahn mitten im Band
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 40; i++) {
    const t = hash(i, 12);
    const x = R + (t - 0.5) * 2.2 * R;
    const y = R + ((t - 0.5) * 0.5 + (hash(i, 13) - 0.5) * 0.03) * 2 * R;
    const rad = (0.012 + hash(i, 14) * 0.025) * R;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  g.globalCompositeOperation = 'source-over';
  // Viele winzige Sterne im Band
  for (let i = 0; i < 900; i++) {
    const t = hash(i, 15);
    const x = R + (t - 0.5) * 2.2 * R;
    const y = R + ((t - 0.5) * 0.5 + (hash(i, 16) - 0.5) * 0.12) * 2 * R;
    g.fillStyle = `rgba(230,235,255,${0.15 + hash(i, 17) * 0.35})`;
    g.fillRect(x, y, 1, 1);
  }
  return { canvas, size };
}

/** Kleines weiches Leuchten für helle Sterne (einmal gezeichnet). */
let glowSprite: HTMLCanvasElement | null = null;
function starGlow(): HTMLCanvasElement | null {
  if (glowSprite || typeof document === 'undefined') return glowSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  if (!g) return null;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.2, 'rgba(210,225,255,0.35)');
  gr.addColorStop(1, 'rgba(210,225,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  glowSprite = c;
  return c;
}

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
  skyLayer ??= makeSkyLayer();
  if (skyLayer) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2);
    ctx.rotate(spin);
    ctx.drawImage(skyLayer.canvas, -R, -R, 2 * R, 2 * R);
    ctx.restore();
  }
  const glow = starGlow();
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
    // Die hellsten Sterne mit weichem Schein
    if (glow && st.s > 1.9) {
      const gs = st.s * 5;
      ctx.globalAlpha *= 0.55;
      ctx.drawImage(glow, x + st.s / 2 - gs / 2, y + st.s / 2 - gs / 2, gs, gs);
    }
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ Zwischengespeicherte Ebenen

/**
 * Eine Bildebene in Bildschirmgröße, die nur neu gezeichnet wird, wenn sich ihr Schlüssel ändert
 * (Größe, Drehung, Helligkeit …) – sonst wird sie nur 1:1 kopiert. Für den Hintergrund aus
 * Milchstraße, Sternen und Planetenkulisse: Er ändert sich im Flug nur langsam, kostete aber
 * jedes Bild einige große Zeichenschritte.
 */
export class LayerCache {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private failed = false;

  /** Zeichnet die Ebene (über `paint`, mit derselben Transformation wie `ctx`) und blendet sie ein. */
  draw(ctx: CanvasRenderingContext2D, key: string, paint: (g: CanvasRenderingContext2D) => void) {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    if (this.failed || typeof document === 'undefined') {
      paint(ctx);
      return;
    }
    if (!this.canvas) this.canvas = document.createElement('canvas');
    const c = this.canvas;
    const g = c.getContext('2d');
    if (!g) {
      this.failed = true;
      paint(ctx);
      return;
    }
    const tr = ctx.getTransform();
    const full = `${cw}x${ch}|${tr.a.toFixed(4)}|${key}`;
    if (full !== this.key) {
      if (c.width !== cw || c.height !== ch) {
        c.width = cw;
        c.height = ch;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cw, ch);
      g.setTransform(tr);
      paint(g);
      this.key = full;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ Weiche Bildchen

const sprites = new Map<string, HTMLCanvasElement | null>();

/**
 * Weicher runder Fleck in einer Farbe (für Rauch, Staub, Feuer, Leuchten) – einmal gezeichnet und
 * danach nur noch skaliert eingeblendet. Viel schneller als ein Farbverlauf je Teilchen und
 * weicher als eine harte Scheibe.
 */
export function softSprite(rgbStr: string, core = 0.35): HTMLCanvasElement | null {
  const key = `soft|${rgbStr}|${core}`;
  if (sprites.has(key)) return sprites.get(key)!;
  let c: HTMLCanvasElement | null = null;
  if (typeof document !== 'undefined') {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgbStr},1)`);
      gr.addColorStop(core, `rgba(${rgbStr},0.75)`);
      gr.addColorStop(0.7, `rgba(${rgbStr},0.25)`);
      gr.addColorStop(1, `rgba(${rgbStr},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    } else c = null;
  }
  sprites.set(key, c);
  return c;
}

/** Wolkenbausch: oben hell, unten im Schatten, weicher Rand (zwei Farben als „r,g,b“). */
export function cloudSprite(top: string, bottom: string): HTMLCanvasElement | null {
  const key = `cloud|${top}|${bottom}`;
  if (sprites.has(key)) return sprites.get(key)!;
  let c: HTMLCanvasElement | null = null;
  if (typeof document !== 'undefined') {
    c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    if (g) {
      const shade = g.createLinearGradient(0, 8, 0, 88);
      shade.addColorStop(0, `rgb(${top})`);
      shade.addColorStop(0.55, `rgb(${top})`);
      shade.addColorStop(1, `rgb(${bottom})`);
      g.fillStyle = shade;
      g.fillRect(0, 0, 96, 96);
      // Weicher Rand: Alpha mit einem runden Verlauf ausstanzen
      g.globalCompositeOperation = 'destination-in';
      const mask = g.createRadialGradient(48, 48, 0, 48, 48, 48);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(0.6, 'rgba(0,0,0,0.92)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = mask;
      g.fillRect(0, 0, 96, 96);
      g.globalCompositeOperation = 'source-over';
    } else c = null;
  }
  // Nur eine überschaubare Zahl Farbstufen merken (Tag, Dämmerung, Nacht).
  if (sprites.size > 400) sprites.clear();
  sprites.set(key, c);
  return c;
}

/** „#rrggbb“ als „r,g,b“ (für die Bildchen). */
export function rgbOf(hex: string): string {
  return rgb(hex).join(',');
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

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Belegte Flächen der Beschriftungen im aktuellen Bild (null = keine Prüfung). */
let placed: Rect[] | null = null;

/**
 * Ab jetzt weichen Beschriftungen einander und den freigehaltenen Flächen (z. B. Tipps über der
 * Karte) aus. Mit `endLabels()` wieder abschalten.
 */
export function beginLabels(reserved: Rect[] = []): void {
  placed = [...reserved];
}

export function endLabels(): void {
  placed = null;
}

/** Fläche freihalten (z. B. das Raketensymbol), ohne etwas zu zeichnen. */
export function reserveLabel(r: Rect): void {
  placed?.push(r);
}

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Beschriftung mit dunklem Rand; weicht am rechten Rand nach links aus. Überdeckt sie eine andere,
 * rückt sie nach unten oder oben; `weak` = lieber weglassen als überdecken.
 */
export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 12,
  weak = false,
): void {
  ctx.font = `600 ${size}px Jost, system-ui, sans-serif`;
  const width = ctx.measureText(text).width;
  const room = ctx.canvas.width / (ctx.getTransform().a || 1);
  const left = Math.max(8, x - width - 20);
  if (x + width > room - 8) x = left;
  if (placed) {
    // Freien Platz suchen: rechts vom Punkt, etwas darunter oder darüber, sonst links davon.
    const line = size * 1.35;
    const box = (bx: number, dy: number): Rect => ({
      x: bx - 2,
      y: y + dy - line / 2,
      w: width + 4,
      h: line,
    });
    let spot: [number, number] | null = null;
    for (const bx of x === left ? [x] : [x, left]) {
      const dy = [0, line, -line, 2 * line, -2 * line, 3 * line, -3 * line].find(
        (d) => !placed!.some((r) => overlaps(r, box(bx, d))),
      );
      if (dy !== undefined) {
        spot = [bx, dy];
        break;
      }
    }
    if (!spot && weak) return;
    [x, y] = spot ? [spot[0], y + spot[1]] : [x, y];
    placed.push(box(x, 0));
  }
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
