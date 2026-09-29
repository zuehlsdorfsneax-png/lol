/**
 * Karte: Sonnensystem mit Bahnen, Hill-Sphären, Station, Satelliten, vorhergesagter und
 * geplanter Bahn samt Manöver mit Anfassern zum Ziehen.
 */
import { drawSatellite } from './draw';
import { bodySpin, satelliteState, type Flight, type Prediction } from './flight';
import { clockIn, km } from './format';
import { CIRCULAR_E, period, stateAt } from './kepler';
import { drawBody, drawStation } from './scene';
import {
  beginLabels,
  circle,
  drawStars,
  endLabels,
  label,
  local,
  reserveLabel,
  toScreen,
  type View,
} from './view';
import {
  BODIES,
  EARTH,
  MARS,
  MOON,
  PHOBOS,
  STATION,
  SUN,
  bodyById,
  bodyState,
  forms,
  stationState,
  type Body,
} from './world';

export type MapFocus =
  | 'rocket'
  | 'ref'
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'ceres'
  | 'jupiter'
  | 'europa'
  | 'ganymede';

export type HandleKind = 'pro' | 'retro' | 'out' | 'in';

/** Was auf der Karte angeklickt werden kann. */
export interface MapHits {
  /** Bildschirmpunkte der Vorhersage (für Klicks auf die Bahn). */
  path: { xs: Float64Array; ys: Float64Array; ts: Float64Array; n: number } | null;
  node: { x: number; y: number } | null;
  handles: { kind: HandleKind; x: number; y: number; dx: number; dy: number }[];
}

export function mapCenter(f: Flight, focus: MapFocus): [number, number] {
  if (focus === 'rocket') return [f.x, f.y];
  const b = focus === 'ref' ? f.refBody() : bodyById(focus);
  return bodyState(b, f.t).slice(0, 2) as [number, number];
}

/**
 * Freie Fläche der Karte: oben liegen die Knöpfe, unten Lageanzeige und Schubregler.
 * Die Kartenmitte liegt deshalb etwas über der Bildmitte.
 */
export function mapArea(width: number, height: number): { ox: number; oy: number; h: number } {
  const top = 60;
  const bottom = Math.min(200, height * 0.26);
  const h = Math.max(height * 0.4, height - top - bottom);
  return { ox: width / 2, oy: Math.min(height / 2, top + h / 2), h };
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
  const { ox, oy } = mapArea(width, height);
  return {
    width,
    height,
    scale,
    cx: cx + panX,
    cy: cy + panY,
    up: Math.PI / 2,
    ox,
    oy,
  };
}

/**
 * Passender Maßstab, damit die Bahn bzw. der gewählte Körper ins Bild passt. Mit Vorhersage
 * zählt die ganze gezeichnete Bahn samt geplantem Manöver und Begegnung.
 */
export function fitMapScale(
  f: Flight,
  width: number,
  height: number,
  focus: MapFocus,
  pred: Prediction | null = null,
): number {
  const half = 0.44 * Math.min(width, mapArea(width, height).h);
  const ref = f.refBody();
  const b = focus === 'ref' || focus === 'rocket' ? ref : bodyById(focus);
  let r: number;
  if (b === ref) {
    const o = f.orbit(ref);
    r = Math.max(o.r, ref.radius * 1.4);
    if (pred && pred.n > 1 && pred.ref === ref && f.status === 'flying') {
      const [cx, cy] = bodyState(ref, f.t);
      r = Math.max(r, predictionReach(pred, f.t, cx, cy) * 1.12);
      if (ref === SUN) r = Math.max(r, o.r * 1.2);
    } else {
      if (o.bound && Number.isFinite(o.apoapsis)) r = Math.max(r, o.apoapsis + ref.radius);
      if (!o.bound) r = Math.max(r * 2, Math.min(ref.hill, r * 20));
      if (ref === SUN) r = Math.max(o.r * 1.3, MARS.distance * 1.1);
    }
  } else if (b === SUN) r = MARS.distance * 1.15;
  else r = Math.min(b.hill, b.radius * 60) * 1.2;
  if (focus === 'earth' && ref === EARTH && f.goals.size > 3) r = Math.max(r, MOON.distance * 1.1);
  return half / Math.max(r, 1);
}

export interface MapDrawOptions {
  time: number;
  /** Gerade gezogener Anfasser (wird hervorgehoben). */
  active?: HandleKind | 'node' | null;
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  pred: Prediction | null,
  opts: MapDrawOptions,
): MapHits {
  const { width: W, height: H } = v;
  ctx.fillStyle = '#04060d';
  ctx.fillRect(0, 0, W, H);
  drawStars(ctx, v, 0.6, 0, opts.time);
  const t = f.t;
  const hits: MapHits = { path: null, node: null, handles: [] };
  // Beschriftungen weichen einander aus und lassen den Tipp oben in der Mitte frei.
  // Breite der Tipp-Spalte wie im CSS (.hud-msg), etwas Rand dazu.
  const tipW = (W > 1000 ? Math.min(460, W - 520) : W - 440) + 24;
  beginLabels(
    W >= 760
      ? [
          // Tipp oben, Flugdaten links, Ziel rechts, Schub und Lageanzeige unten
          { x: W / 2 - tipW / 2, y: 48, w: tipW, h: 124 },
          { x: 0, y: 0, w: 250, h: 310 },
          { x: W - 320, y: 0, w: 320, h: 260 },
          { x: W - 250, y: H - 270, w: 250, h: 270 },
          { x: W / 2 - 140, y: H - 200, w: 280, h: 200 },
        ]
      : [
          // Handy: oben Flugdaten und Ziel, unten Lageanzeige und Schub
          { x: 0, y: 0, w: W, h: 232 },
          { x: 0, y: H - 250, w: W, h: 250 },
        ],
  );
  if (f.status !== 'crashed') {
    const [rx, ry] = toScreen(v, f.x, f.y);
    reserveLabel({ x: rx - 14, y: ry - 14, w: 28, h: 28 });
  }

  // Bahnen der Körper um ihren Mutterkörper
  ctx.lineWidth = 1;
  for (const b of BODIES) {
    if (!b.parent) continue;
    const [px, py] = bodyState(bodyById(b.parent), t);
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
        `Hill-Sphäre ${forms(b).gen}`,
        sx + hill * 0.72,
        sy - hill * 0.72,
        '#c4b5fd',
        12,
        true,
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
  drawSatellites(ctx, f, v);
  if (f.site) drawSiteMarker(ctx, f, v);

  if (pred && pred.n > 1) drawPrediction(ctx, f, v, pred, hits, opts);

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

  // Maßstab
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
  // Links unten über den Drehknöpfen: dort verdeckt der Maßstab weder Lageanzeige noch Schubregler.
  const by = narrow ? H - 236 : H - 102;
  const x0 = 16;
  const x1 = x0 + px;
  ctx.moveTo(x0, by);
  ctx.lineTo(x1, by);
  ctx.moveTo(x0, by - 4);
  ctx.lineTo(x0, by + 4);
  ctx.moveTo(x1, by - 4);
  ctx.lineTo(x1, by + 4);
  ctx.stroke();
  ctx.font = '600 12px Jost, system-ui, sans-serif';
  label(ctx, km(nice), x0, by - 14, 'rgba(255,255,255,0.8)');
  if (W >= 900) {
    const hint = f.node
      ? 'Anfasser am Manöver ziehen · Bahn anklicken verschiebt es'
      : 'Bahn anklicken: Manöver planen · Ziehen: verschieben · Mausrad: zoomen';
    label(ctx, hint, x0, by - 34, 'rgba(255,255,255,0.5)', 12, true);
  }
  endLabels();
  return hits;
}

/** Satelliten und ihre Bahnen. */
function drawSatellites(ctx: CanvasRenderingContext2D, f: Flight, v: View): void {
  for (const s of f.satellites) {
    const b = bodyById(s.body);
    const [bx, by] = bodyState(b, f.t);
    const P = period(s.el);
    // Bahnellipse (nur wenn sie auf dem Bildschirm sichtbar groß ist)
    const size = (s.el.p / (1 - Math.min(s.el.e, 0.95))) * v.scale;
    if (Number.isFinite(P) && size > 6 && size < 1e5) {
      ctx.strokeStyle = 'rgba(103,232,249,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= 64; k++) {
        const [x, y] = stateAt(s.el, f.t + (k / 64) * P);
        const [sx, sy] = toScreen(v, bx + x, by + y);
        if (k === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    const [x, y] = satelliteState(s, f.t);
    const [sx, sy] = toScreen(v, x, y);
    if (sx < -20 || sx > v.width + 20 || sy < -20 || sy > v.height + 20) continue;
    ctx.save();
    ctx.fillStyle = 'rgba(103,232,249,0.9)';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    local(ctx, v, x, y, 0, 3.4);
    drawSatellite(ctx);
    ctx.restore();
    if (size > 40) label(ctx, s.name, sx + 12, sy + 10, '#a5f3fc', 11, true);
  }
}

function drawSiteMarker(ctx: CanvasRenderingContext2D, f: Flight, v: View): void {
  const site = f.site!;
  const b = bodyById(site.body);
  const [bx, by] = bodyState(b, f.t);
  const a = bodySpin(b, f.t) + site.angle;
  const [sx, sy] = toScreen(v, bx + b.radius * Math.cos(a), by + b.radius * Math.sin(a));
  if (sx < -40 || sx > v.width + 40 || sy < -40 || sy > v.height + 40) return;
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 16);
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 16);
  ctx.lineTo(sx + 9, sy - 12.5);
  ctx.lineTo(sx, sy - 9);
  ctx.fill();
  label(ctx, site.name, sx + 12, sy - 12, '#fde68a', 11);
}

/** Ein Bahnabschnitt wird im Bild eines Körpers gezeichnet – jetzt oder zu einer festen Zeit. */
interface PathFrame {
  body: Body;
  /** Zeitpunkt, zu dem der Körper gezeigt wird (null = jetzt). */
  at: number | null;
}

interface PatchedPath {
  x: Float64Array;
  y: Float64Array;
  frame: Uint8Array;
  frames: PathFrame[];
}

const pathCache = new WeakMap<Prediction, PatchedPath>();

/**
 * Bahnpunkte in „Stücken“ wie in großen Raumfahrtspielen: jeder Punkt relativ zu dem Körper, in
 * dessen Einflussbereich er liegt (Bezugskörper, dessen Mutterkörper … bis zur Sonne). Die
 * Begegnung erscheint um den Zielkörper an der Stelle, wo er beim Eintritt stehen wird. So endet
 * etwa der Heimflug vom Mond wirklich an der Erde (früher im Mondbild, weit neben der Erde).
 * Pro Vorhersage nur einmal berechnet.
 */
function patchedPath(pred: Prediction): PatchedPath {
  const cached = pathCache.get(pred);
  if (cached) return cached;
  const enc = pred.encounter;
  const chain: Body[] = [pred.ref];
  for (let b = pred.ref; b.parent;) {
    b = bodyById(b.parent);
    chain.push(b);
  }
  const frames: PathFrame[] = chain.map((body) => ({ body, at: null }));
  let encFrame = -1;
  if (enc) {
    encFrame = frames.length;
    frames.push({ body: enc.body, at: pred.ts[enc.enter]! });
  }
  const x = new Float64Array(pred.n);
  const y = new Float64Array(pred.n);
  const frame = new Uint8Array(pred.n);
  for (let i = 0; i < pred.n; i++) {
    const t = pred.ts[i]!;
    let k = chain.length - 1;
    if (enc && i >= enc.enter && i <= enc.exit) k = encFrame;
    else
      for (let j = 0; j < chain.length; j++) {
        const b = chain[j]!;
        const [bx, by] = bodyState(b, t);
        if (b === SUN || Math.hypot(pred.xs[i]! - bx, pred.ys[i]! - by) < b.hill) {
          k = j;
          break;
        }
      }
    const [bx, by] = bodyState(frames[k]!.body, t);
    x[i] = pred.xs[i]! - bx;
    y[i] = pred.ys[i]! - by;
    frame[i] = k;
  }
  const out = { x, y, frame, frames };
  pathCache.set(pred, out);
  return out;
}

/** Weltposition, an der ein Bahnstück gezeichnet wird. */
function frameOrigin(fr: PathFrame, t: number): [number, number] {
  const [x, y] = bodyState(fr.body, fr.at ?? t);
  return [x, y];
}

/**
 * Wie weit (Weltmeter vom Punkt `cx, cy`) die gezeichnete Bahn reicht – für den automatischen
 * Kartenmaßstab. Weit hinaus fliegende Bahnen zählen höchstens bis knapp über die Hill-Sphäre des
 * Bezugskörpers.
 */
export function predictionReach(pred: Prediction, t: number, cx: number, cy: number): number {
  const path = patchedPath(pred);
  const origins = path.frames.map((fr) => frameOrigin(fr, t));
  // Bei einem Mond darf die Bahn bis zum Planeten reichen (Heimflug), bei einem Planeten nur knapp
  // über seine Hill-Sphäre hinaus (sonst wäre er beim Flug zum Nachbarplaneten nur ein Punkt).
  const parent = pred.ref.parent ? bodyById(pred.ref.parent) : null;
  const cap =
    pred.ref === SUN ? Infinity : parent && parent !== SUN ? parent.hill : pred.ref.hill * 1.15;
  // Nach einer Begegnung ist der Rest nur noch blass angedeutet – er zählt nicht mit.
  const last = pred.encounter ? pred.encounter.exit : pred.n - 1;
  let r = 0;
  const step = Math.max(1, Math.floor(pred.n / 600));
  for (let i = 0; i <= last; i += step) {
    const o = origins[path.frame[i]!]!;
    const d = Math.hypot(path.x[i]! + o[0] - cx, path.y[i]! + o[1] - cy);
    r = Math.max(r, Math.min(d, cap));
  }
  const enc = pred.encounter;
  if (enc) {
    const [ex, ey] = bodyState(enc.body, pred.ts[enc.enter]!);
    r = Math.max(r, Math.min(cap, Math.hypot(ex - cx, ey - cy) + enc.body.radius * 3));
  }
  return r;
}

/**
 * Streckenzug in sichtbare Stücke zerlegen (Bildschirm plus etwas Rand). Strecken, die den
 * Bereich schneiden, werden an seinem Rand abgeschnitten (Liang-Barsky).
 */
export function clippedRuns(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  a: number,
  b: number,
  width: number,
  height: number,
  margin = 80,
): { x: number[]; y: number[] }[] {
  const x0 = -margin;
  const y0 = -margin;
  const x1 = width + margin;
  const y1 = height + margin;
  const runs: { x: number[]; y: number[] }[] = [];
  let cur: { x: number[]; y: number[] } | null = null;
  for (let i = a + 1; i <= b; i++) {
    const ax = xs[i - 1]!;
    const ay = ys[i - 1]!;
    const bx = xs[i]!;
    const by = ys[i]!;
    if (!Number.isFinite(ax + ay + bx + by)) {
      cur = null;
      continue;
    }
    const dx = bx - ax;
    const dy = by - ay;
    let t0 = 0;
    let t1 = 1;
    let visible = true;
    for (const [p, q] of [
      [-dx, ax - x0],
      [dx, x1 - ax],
      [-dy, ay - y0],
      [dy, y1 - ay],
    ] as const) {
      if (p === 0) {
        if (q < 0) visible = false;
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
      if (t0 > t1) visible = false;
      if (!visible) break;
    }
    if (!visible) {
      cur = null;
      continue;
    }
    if (!cur || t0 > 0) {
      cur = { x: [ax + t0 * dx], y: [ay + t0 * dy] };
      runs.push(cur);
    }
    cur.x.push(ax + t1 * dx);
    cur.y.push(ay + t1 * dy);
    if (t1 < 1) cur = null;
  }
  return runs;
}

/** Weicher Linienzug durch die Mittelpunkte (wie `smoothPath`), für ein sichtbares Stück. */
function smoothRun(ctx: CanvasRenderingContext2D, x: number[], y: number[]): void {
  const n = x.length;
  if (n < 2) return;
  ctx.moveTo(x[0]!, y[0]!);
  for (let k = 1; k < n - 1; k++)
    ctx.quadraticCurveTo(x[k]!, y[k]!, (x[k]! + x[k + 1]!) / 2, (y[k]! + y[k + 1]!) / 2);
  ctx.lineTo(x[n - 1]!, y[n - 1]!);
}

/**
 * Vorhergesagte Bahn relativ zum Bezugskörper; innerhalb der Hill-Sphäre eines anderen Körpers
 * relativ zu diesem (an der Stelle, an der er bei der Ankunft steht) – wie in Raumfahrtspielen.
 * Mit Manöver: bis dahin türkis, danach rosa (geplant).
 */
function drawPrediction(
  ctx: CanvasRenderingContext2D,
  f: Flight,
  v: View,
  pred: Prediction,
  hits: MapHits,
  opts: MapDrawOptions,
): void {
  const t = f.t;
  const [rx0, ry0] = bodyState(pred.ref, t);
  const enc = pred.encounter;
  const encPos = enc ? bodyState(enc.body, pred.ts[enc.enter]!) : null;
  // Die Lage relativ zu den Körpern ändert sich nur mit einer neuen Vorhersage: einmal rechnen,
  // danach pro Bild nur noch verschieben und skalieren.
  const path = patchedPath(pred);
  const origins = path.frames.map((fr) => frameOrigin(fr, t));
  const xs = new Float64Array(pred.n);
  const ys = new Float64Array(pred.n);
  for (let i = 0; i < pred.n; i++) {
    const o = origins[path.frame[i]!]!;
    [xs[i], ys[i]] = toScreen(v, path.x[i]! + o[0], path.y[i]! + o[1]);
  }
  hits.path = { xs, ys, ts: pred.ts, n: pred.n };
  const segment = (a: number, b: number, color: string, dash = false): void => {
    if (b <= a) return;
    // Beim Wechsel des Bezugskörpers springt die Darstellung: dort keine Verbindungslinie.
    for (let i = a + 1; i <= b; i++)
      if (path.frame[i] !== path.frame[i - 1]) {
        segment(a, i - 1, color, dash);
        segment(i, b, color, dash);
        return;
      }
    // Nur der sichtbare Teil: Eine Bahn zum Mond reicht bei starkem Zoom Millionen Pixel über den
    // Rand hinaus – gestrichelt gezeichnet hat das früher fast eine Sekunde pro Bild gekostet.
    const runs = clippedRuns(xs, ys, a, b, v.width, v.height);
    if (runs.length === 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash([7, 5]);
    ctx.beginPath();
    for (const r of runs) smoothRun(ctx, r.x, r.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Richtungspfeile etwa alle 140 Pixel
    ctx.fillStyle = color;
    for (const r of runs) {
      let run = 0;
      for (let i = 1; i < r.x.length; i++) {
        const dx = r.x[i]! - r.x[i - 1]!;
        const dy = r.y[i]! - r.y[i - 1]!;
        run += Math.hypot(dx, dy);
        if (run < 140) continue;
        run = 0;
        const px = r.x[i]!;
        const py = r.y[i]!;
        if (px < 0 || px > v.width || py < 0 || py > v.height) continue;
        const a2 = Math.atan2(dy, dx);
        const c = Math.cos(a2);
        const sn = Math.sin(a2);
        ctx.beginPath();
        ctx.moveTo(px + 6 * c, py + 6 * sn);
        ctx.lineTo(px - 4 * c + 5 * sn, py - 4 * sn - 5 * c);
        ctx.lineTo(px - 4 * c - 5 * sn, py - 4 * sn + 5 * c);
        ctx.closePath();
        ctx.fill();
      }
    }
  };
  /** Ein Abschnitt, in dem die Begegnung orange hervorgehoben wird. */
  const colored = (a: number, b: number, base: string, faded: string, dash: boolean): void => {
    if (enc && enc.enter >= a && enc.enter <= b) {
      segment(a, enc.enter, base, dash);
      segment(enc.enter, Math.min(enc.exit, b), '#fb923c', dash);
      segment(Math.min(enc.exit, b), b, faded, dash);
    } else segment(a, b, base, dash);
  };
  const planned = pred.nodeIndex >= 0 && f.node;
  if (planned) {
    if (pred.preEnd > 0) segment(0, pred.preEnd, '#5eead4');
    colored(pred.nodeIndex, pred.n - 1, '#f9a8d4', 'rgba(249,168,212,0.45)', true);
  } else colored(0, pred.n - 1, '#5eead4', 'rgba(94,234,212,0.45)', false);

  const mark = (i: number, text: string, color: string): void => {
    if (i < 0) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(xs[i]!, ys[i]!, 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, text, xs[i]! + 8, ys[i]! - 8, color);
  };
  const alt = (i: number, body = pred.ref): number => {
    const [cx, cy] = bodyState(body, pred.ts[i]!);
    return Math.hypot(pred.xs[i]! - cx, pred.ys[i]! - cy) - body.radius;
  };
  const when = (i: number): string => ` · in ${clockIn(pred.ts[i]! - t)}`;
  // Ap/Pe nur beschriften, wenn sie sich auf dem Bildschirm vom Körper abheben.
  const [rsx, rsy] = toScreen(v, rx0, ry0);
  const apart = (i: number): boolean =>
    Math.hypot(xs[i]! - rsx, ys[i]! - rsy) > pred.ref.radius * v.scale + 14;
  // Wie im Cockpit: auf einer fast runden Bahn keine Zeiten (Ap und Pe sind kaum bestimmt).
  const round =
    pred.high >= 0 &&
    pred.low >= 0 &&
    (alt(pred.high) - alt(pred.low)) / (alt(pred.high) + alt(pred.low) + 2 * pred.ref.radius) <
      CIRCULAR_E;
  const timeAt = (i: number): string => (round ? ' · Kreisbahn' : when(i));
  if (pred.high >= 0 && apart(pred.high))
    mark(pred.high, `Ap ${km(alt(pred.high))}${timeAt(pred.high)}`, '#fcd34d');
  // Endet die Bahn in der Luft, beschriftet der Wiedereintritt den tiefsten Punkt.
  const airEnd = (i: number): boolean => !!pred.reentry && i === pred.n - 1;
  if (pred.low >= 0 && apart(pred.low) && !round && !airEnd(pred.low))
    mark(pred.low, `Pe ${km(alt(pred.low))}${when(pred.low)}`, '#fcd34d');
  if (planned && pred.nodeRef) {
    const nr = pred.nodeRef;
    if (pred.planHigh >= 0)
      mark(pred.planHigh, `neuer Ap ${km(alt(pred.planHigh, nr))}`, '#f9a8d4');
    if (pred.planLow >= 0 && !airEnd(pred.planLow))
      mark(pred.planLow, `neuer Pe ${km(alt(pred.planLow, nr))}`, '#f9a8d4');
  }
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
  if (pred.reentry && !pred.impact) {
    const i = pred.n - 1;
    const b = pred.reentry;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(xs[i]!, ys[i]!, 6, 0, Math.PI * 2);
    ctx.stroke();
    label(
      ctx,
      `Wiedereintritt · tiefster Punkt ${km(alt(i, b))} · in ${clockIn(pred.ts[i]! - t)}`,
      xs[i]! + 10,
      ys[i]! + 12,
      '#fed7aa',
    );
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
      `${enc.body.name} bei Ankunft · ${km(enc.distance - enc.body.radius)} über dem Boden · in ${clockIn(enc.t - t)}`,
      sx + 10,
      sy + 16,
      '#fed7aa',
    );
  }
  // Wo die Bahn den Einflussbereich eines Körpers verlässt, springt die Darstellung ins Bild des
  // Mutterkörpers (wie in großen Raumfahrtspielen). Dort zeigt ein blasser Kreis, wo der Körper
  // dann stehen wird, und eine gepunktete Linie verbindet die beiden Stücke.
  for (let i = 1; i < pred.n; i++) {
    const a = path.frame[i - 1]!;
    const b = path.frame[i]!;
    if (a === b) continue;
    const from = path.frames[a]!;
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = 'rgba(200,210,230,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xs[i - 1]!, ys[i - 1]!);
    ctx.lineTo(xs[i]!, ys[i]!);
    ctx.stroke();
    if (from.at === null && from.body.parent === path.frames[b]!.body.id) {
      const [gx, gy] = bodyState(from.body, pred.ts[i]!);
      const [sx, sy] = toScreen(v, gx, gy);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(4, from.body.radius * v.scale), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `${from.body.name} beim Verlassen`, sx + 8, sy + 14, 'rgba(210,220,240,0.8)', 11);
    }
    ctx.setLineDash([]);
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
    label(
      ctx,
      `Nächste Annäherung ${km(pred.closest.distance)} · in ${clockIn(pred.closest.t - t)}`,
      sx + 10,
      sy - 12,
      '#e9d5ff',
    );
  } else if (
    pred.closest &&
    f.target &&
    f.target !== 'station' &&
    f.target !== pred.ref.id &&
    !enc
  ) {
    const i = pred.closest.index;
    mark(
      i,
      `Nächste Annäherung an ${bodyById(f.target).name}: ${km(pred.closest.distance)}`,
      '#e9d5ff',
    );
  }

  // Manöver mit Anfassern
  if (planned && pred.nodeIndex >= 0) {
    const i = pred.nodeIndex;
    const nx = xs[i]!;
    const ny = ys[i]!;
    hits.node = { x: nx, y: ny };
    let j = Math.min(pred.n - 1, i + 1);
    while (j < pred.n - 1 && Math.hypot(xs[j]! - nx, ys[j]! - ny) < 2) j++;
    let dx = xs[j]! - nx;
    let dy = ys[j]! - ny;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    // Radial nach außen: vom Körper am Manöver weg
    const nr = pred.nodeRef ?? pred.ref;
    const [nbx, nby] = bodyState(nr, pred.ts[i]!);
    const [pbx, pby] = bodyState(pred.ref, pred.ts[i]!);
    const [bsx, bsy] = toScreen(v, nbx + rx0 - pbx, nby + ry0 - pby);
    let ox = -dy;
    let oy = dx;
    if (ox * (nx - bsx) + oy * (ny - bsy) < 0) {
      ox = -ox;
      oy = -oy;
    }
    const R = 38;
    const handles: MapHits['handles'] = [
      { kind: 'pro', x: nx + dx * R, y: ny + dy * R, dx, dy },
      { kind: 'retro', x: nx - dx * R, y: ny - dy * R, dx: -dx, dy: -dy },
      { kind: 'out', x: nx + ox * R, y: ny + oy * R, dx: ox, dy: oy },
      { kind: 'in', x: nx - ox * R, y: ny - oy * R, dx: -ox, dy: -oy },
    ];
    hits.handles = handles;
    ctx.lineWidth = 2;
    for (const h of handles) {
      const color = h.kind === 'pro' || h.kind === 'retro' ? '#5ee39a' : '#67e8f9';
      const on = opts.active === h.kind;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(nx + h.dx * 10, ny + h.dy * 10);
      ctx.lineTo(h.x - h.dx * 9, h.y - h.dy * 9);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = on ? color : 'rgba(4,6,13,0.85)';
      ctx.beginPath();
      ctx.arc(h.x, h.y, on ? 10 : 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = on ? '#04060d' : color;
      ctx.beginPath();
      if (h.kind === 'retro' || h.kind === 'in') {
        ctx.moveTo(h.x - 4, h.y - 4);
        ctx.lineTo(h.x + 4, h.y + 4);
        ctx.moveTo(h.x + 4, h.y - 4);
        ctx.lineTo(h.x - 4, h.y + 4);
      } else {
        ctx.arc(h.x, h.y, 3, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#04060d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(nx, ny, opts.active === 'node' ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const n = f.node!;
    label(
      ctx,
      `Manöver ${Math.round(Math.hypot(n.prograde, n.radial))} m/s · in ${clockIn(n.t - t)}`,
      nx + 14,
      ny + 22,
      '#bfdbfe',
    );
  }
}
