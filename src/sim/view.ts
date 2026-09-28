import { AU, lagrangePoints, criticalMoonDistance } from '../physics';
import type { Simulation, TrackedBody } from './Simulation';
import { TRACKED } from './Simulation';

export type FrameId = 'inertial' | 'earth' | 'rotating';

export const FRAMES: readonly { value: FrameId; label: string; description: string }[] = [
  {
    value: 'earth',
    label: 'Erde fest',
    description: 'Die Erde steht im Mittelpunkt; man sieht die Mondbahn wie von der Erde aus.',
  },
  {
    value: 'rotating',
    label: 'Mitrotierend',
    description:
      'Die Linie Sonne–Erde bleibt fest (Sonne links). So stehen die Lagrange-Punkte still.',
  },
  {
    value: 'inertial',
    label: 'Ruhend (Sonne)',
    description: 'Das Schwerpunktsystem, in dem die Sonne fast ruht.',
  },
];

export interface Camera {
  /** Mittelpunkt in Bezugssystem-Koordinaten (m). */
  cx: number;
  cy: number;
  /** Pixel pro Meter. */
  scale: number;
}

export interface ViewOptions {
  frame: FrameId;
  follow: 'earth' | 'moon' | 'sun' | 'none';
  trails: boolean;
  /** Länge der Spuren in s (0 = alles). */
  trailSpan: number;
  vectors: boolean;
  limits: boolean;
  labels: boolean;
  /** Mindestgröße der Körper in Pixeln, damit sie sichtbar bleiben. */
  exaggerate: boolean;
}

export const DEFAULT_VIEW: ViewOptions = {
  frame: 'earth',
  follow: 'earth',
  trails: true,
  trailSpan: 0,
  vectors: false,
  limits: true,
  labels: true,
  exaggerate: true,
};

/** Farben der Weltraum-Darstellung (in beiden Themes gleich). */
export const SPACE = {
  bg: '#060a18',
  sun: '#ffc14d',
  earth: '#4c9aff',
  moon: '#d8dce6',
  intruder: '#ff6f9f',
  particle: '#8fe3ff',
  particleLost: '#56607e',
  hill: '#8f84ff',
  stability: '#8f84ff',
  roche: '#ff8a4c',
  lagrange: '#f2c46e',
  label: '#c5cce2',
  labelDim: '#7d88aa',
  velocity: '#f5f7ff',
  pullEarth: '#4c9aff',
  pullSun: '#ffc14d',
  tidal: '#ff6f9f',
};

const BODY_COLORS: Record<TrackedBody, string> = {
  sun: SPACE.sun,
  earth: SPACE.earth,
  moon: SPACE.moon,
  intruder: SPACE.intruder,
};

const MIN_PX: Record<TrackedBody, number> = { sun: 7, earth: 5, moon: 3.2, intruder: 4 };

const BODY_LABELS: Record<TrackedBody, string> = {
  sun: 'Sonne',
  earth: 'Erde',
  moon: 'Mond',
  intruder: 'Störkörper',
};

interface Transform {
  (x: number, y: number): [number, number];
  /** Drehung für Vektoren (ohne Verschiebung). */
  rotate: (vx: number, vy: number) => [number, number];
}

/** Transformation vom Inertialsystem ins gewählte Bezugssystem (für einen Zeitpunkt). */
export function makeTransform(
  frame: FrameId,
  earth: [number, number] | null,
  sun: [number, number] | null,
): Transform {
  if (frame === 'inertial' || !earth) {
    const t = ((x: number, y: number) => [x, y]) as Transform;
    t.rotate = (vx, vy) => [vx, vy];
    return t;
  }
  const [ex, ey] = earth;
  if (frame === 'earth' || !sun) {
    const t = ((x: number, y: number) => [x - ex, y - ey]) as Transform;
    t.rotate = (vx, vy) => [vx, vy];
    return t;
  }
  const th = Math.atan2(ey - sun[1], ex - sun[0]);
  const c = Math.cos(th);
  const s = Math.sin(th);
  const t = ((x: number, y: number) => {
    const rx = x - ex;
    const ry = y - ey;
    return [rx * c + ry * s, -rx * s + ry * c];
  }) as Transform;
  t.rotate = (vx, vy) => [vx * c + vy * s, -vx * s + vy * c];
  return t;
}

function currentTransform(sim: Simulation, frame: FrameId): Transform {
  const { sys, indices } = sim;
  const e = indices.earth;
  const s = indices.sun;
  const earth: [number, number] | null = sys.alive[e] ? [sys.x[e]!, sys.y[e]!] : null;
  const sun: [number, number] | null = s >= 0 && sys.alive[s] ? [sys.x[s]!, sys.y[s]!] : null;
  return makeTransform(frame, earth, sun);
}

/** Aktuelle Position eines Körpers im Bezugssystem. */
export function framePosition(
  sim: Simulation,
  frame: FrameId,
  body: TrackedBody,
): [number, number] | null {
  const i = sim.indices[body];
  if (i < 0 || !sim.sys.alive[i]) return null;
  return currentTransform(sim, frame)(sim.sys.x[i]!, sim.sys.y[i]!);
}

export function cameraFor(radius: number, width: number, height: number): Camera {
  return { cx: 0, cy: 0, scale: Math.min(width, height) / 2 / radius };
}

let starCache: { w: number; h: number; stars: Float32Array } | null = null;

function starfield(w: number, h: number): Float32Array {
  if (starCache && starCache.w === w && starCache.h === h) return starCache.stars;
  let seed = 12345;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const n = Math.round((w * h) / 2600);
  const stars = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    stars[3 * i] = rnd() * w;
    stars[3 * i + 1] = rnd() * h;
    stars[3 * i + 2] = rnd();
  }
  starCache = { w, h, stars };
  return stars;
}

function niceLength(target: number): number {
  const mag = 10 ** Math.floor(Math.log10(target));
  const n = target / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

function formatScale(m: number): string {
  if (m >= 0.05 * AU) return `${Number((m / AU).toPrecision(2)).toLocaleString('de-DE')} AE`;
  return `${(m / 1000).toLocaleString('de-DE')} km`;
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
): void {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(8, len * 0.4);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx - ux * head * 0.6, y + dy - uy * head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * head * 0.5, y + dy - uy * head + ux * head * 0.5);
  ctx.lineTo(x + dx - ux * head + uy * head * 0.5, y + dy - uy * head - ux * head * 0.5);
  ctx.closePath();
  ctx.fill();
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  dash: number[] = [],
  label?: string,
): void {
  if (!Number.isFinite(r) || r < 2 || r > 1e6) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.fillStyle = color;
    ctx.font = '11px Jost, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, y - r - 3);
  }
}

export interface RenderResult {
  /** Mittelpunkt der Kamera nach Verfolgen eines Körpers. */
  center: [number, number];
}

/**
 * Zeichnet den aktuellen Zustand: Hintergrund, Grenzen, Spuren, Körper, Vektoren, Maßstab.
 */
export function renderSpace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sim: Simulation,
  cam: Camera,
  view: ViewOptions,
): void {
  const { sys, indices } = sim;
  ctx.fillStyle = SPACE.bg;
  ctx.fillRect(0, 0, width, height);

  // Sterne (nur Dekoration, unabhängig von der Kamera).
  const stars = starfield(Math.round(width), Math.round(height));
  for (let i = 0; i < stars.length; i += 3) {
    const b = stars[i + 2]!;
    ctx.fillStyle = `rgba(210, 220, 255, ${0.15 + b * 0.35})`;
    const s = b > 0.92 ? 1.6 : 1;
    ctx.fillRect(stars[i]!, stars[i + 1]!, s, s);
  }

  const frame = view.frame;
  const T = currentTransform(sim, frame);
  let cx = cam.cx;
  let cy = cam.cy;
  if (frame === 'inertial' && view.follow !== 'none') {
    const p = framePosition(sim, frame, view.follow);
    if (p) {
      cx += p[0];
      cy += p[1];
    }
  }
  const k = cam.scale;
  const sx = (x: number): number => width / 2 + (x - cx) * k;
  const sy = (y: number): number => height / 2 - (y - cy) * k;

  const earthPos = framePosition(sim, frame, 'earth');

  // Grenzen um die Erde: Hill-Sphäre, Stabilitätsgrenze, Roche-Grenze, L1/L2.
  if (view.limits && earthPos) {
    const ex = sx(earthPos[0]);
    const ey = sy(earthPos[1]);
    const hill = sim.hillRadius();
    const el = sim.moonElements();
    const retro = el ? el.h < 0 : sim.params.moonRetrograde;
    if (Number.isFinite(hill)) {
      circle(ctx, ex, ey, hill * k, SPACE.hill, [5, 5], 'Hill-Sphäre');
      const crit =
        criticalMoonDistance(retro, sim.params.earthEccentricity, 0) * sim.info.hillRadius;
      ctx.globalAlpha = 0.7;
      circle(
        ctx,
        ex,
        ey,
        crit * k,
        SPACE.stability,
        [1.5, 4],
        retro ? 'Grenze retrograd' : 'Stabilitätsgrenze',
      );
      ctx.globalAlpha = 1;
    }
    circle(
      ctx,
      ex,
      ey,
      sim.info.rocheFluid * k,
      SPACE.roche,
      [3, 3],
      sim.info.rocheFluid * k > 30 ? 'Roche-Grenze' : undefined,
    );

    const s = indices.sun;
    if (s >= 0 && sys.alive[s]) {
      const d = sys.distance(s, indices.earth);
      const mE = sys.mass[indices.earth]!;
      const mu = mE / (mE + sys.mass[s]!);
      const pts = lagrangePoints(mu);
      const ux = (sys.x[indices.earth]! - sys.x[s]!) / d;
      const uy = (sys.y[indices.earth]! - sys.y[s]!) / d;
      for (const p of pts) {
        if (p.name === 'L3' || p.name === 'L4' || p.name === 'L5') {
          if (frame === 'earth') continue;
        }
        // Position relativ zur Erde im Inertialsystem.
        const rx = (p.x - (1 - mu)) * d;
        const ry = p.y * d;
        const ix = sys.x[indices.earth]! + rx * ux - ry * uy;
        const iy = sys.y[indices.earth]! + rx * uy + ry * ux;
        const [fx, fy] = T(ix, iy);
        const px = sx(fx);
        const py = sy(fy);
        if (px < -20 || px > width + 20 || py < -20 || py > height + 20) continue;
        ctx.strokeStyle = SPACE.lagrange;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px - 4, py - 4);
        ctx.lineTo(px + 4, py + 4);
        ctx.moveTo(px + 4, py - 4);
        ctx.lineTo(px - 4, py + 4);
        ctx.stroke();
        ctx.fillStyle = SPACE.lagrange;
        ctx.font = '11px Jost, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name, px + 7, py);
      }
    }
  }

  // Spuren: gespeichert im Inertialsystem, für jeden Zeitpunkt ins Bezugssystem umgerechnet.
  if (view.trails) {
    const tr = sim.trail;
    const n = tr.length;
    const eCol = TRACKED.indexOf('earth');
    const sCol = TRACKED.indexOf('sun');
    const minTime = view.trailSpan > 0 ? sim.time - view.trailSpan : -Infinity;
    let first = 0;
    while (first < n && tr.time(first) < minTime) first++;
    const count = n - first;
    const step = Math.max(1, Math.floor(count / 3000));
    const samples: number[] = [];
    for (let i = first; i < n; i += step) samples.push(i);
    if (n > 0 && samples[samples.length - 1] !== n - 1) samples.push(n - 1);

    // Bezugssystem je Zeitpunkt: Erdposition und Drehwinkel der Linie Sonne–Erde.
    const m = samples.length;
    const ox = new Float64Array(m);
    const oy = new Float64Array(m);
    const cs = new Float64Array(m).fill(1);
    const sn = new Float64Array(m);
    if (frame !== 'inertial') {
      samples.forEach((i, j) => {
        const ex = tr.x(i, eCol);
        const ey = tr.y(i, eCol);
        ox[j] = Number.isFinite(ex) ? ex : 0;
        oy[j] = Number.isFinite(ey) ? ey : 0;
        const sx0 = tr.x(i, sCol);
        if (frame === 'rotating' && Number.isFinite(sx0) && Number.isFinite(ex)) {
          const th = Math.atan2(ey - tr.y(i, sCol), ex - sx0);
          cs[j] = Math.cos(th);
          sn[j] = Math.sin(th);
        }
      });
    }

    TRACKED.forEach((body, col) => {
      const bi = indices[body];
      if (bi < 0) return;
      if (frame !== 'inertial' && body === 'earth') return;
      // Bildschirmpunkte der Spur, zuletzt die aktuelle Position – die Spur endet am Körper.
      const xs = new Float64Array(m + 1);
      const ys = new Float64Array(m + 1);
      for (let j = 0; j < m; j++) {
        const i = samples[j]!;
        const x = tr.x(i, col);
        const y = tr.y(i, col);
        if (!Number.isFinite(x)) {
          xs[j] = NaN;
          ys[j] = NaN;
          continue;
        }
        const rx = x - ox[j]!;
        const ry = y - oy[j]!;
        xs[j] = sx(rx * cs[j]! + ry * sn[j]!);
        ys[j] = sy(-rx * sn[j]! + ry * cs[j]!);
      }
      let total = m;
      if (sys.alive[bi] && m > 0) {
        const [fx, fy] = T(sys.x[bi]!, sys.y[bi]!);
        xs[m] = sx(fx);
        ys[m] = sy(fy);
        total = m + 1;
      }
      const segments = 6;
      ctx.lineWidth = body === 'moon' ? 1.6 : 1.3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = BODY_COLORS[body];
      for (let seg = 0; seg < segments; seg++) {
        const a = Math.floor((seg * (total - 1)) / segments);
        const b = Math.floor(((seg + 1) * (total - 1)) / segments);
        if (b <= a) continue;
        ctx.globalAlpha = 0.12 + (0.75 * (seg + 1)) / segments;
        ctx.beginPath();
        smoothPath(ctx, xs, ys, a, b, total);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
  }

  // Testteilchen.
  const first = indices.firstParticle;
  if (first >= 0) {
    for (let p = first; p < sys.n; p++) {
      if (!sys.alive[p]) continue;
      const [fx, fy] = T(sys.x[p]!, sys.y[p]!);
      const px = sx(fx);
      const py = sy(fy);
      if (px < -2 || px > width + 2 || py < -2 || py > height + 2) continue;
      ctx.fillStyle = SPACE.particle;
      ctx.fillRect(px - 1, py - 1, 2.2, 2.2);
    }
  }

  // Körper.
  const drawn: { body: TrackedBody; px: number; py: number; r: number }[] = [];
  for (const body of TRACKED) {
    const i = indices[body];
    if (i < 0 || !sys.alive[i]) continue;
    const [fx, fy] = T(sys.x[i]!, sys.y[i]!);
    const px = sx(fx);
    const py = sy(fy);
    const trueR = sys.radius[i]! * k;
    const r = view.exaggerate ? Math.max(trueR, MIN_PX[body]) : Math.max(trueR, 1.2);
    if (px < -r - 50 || px > width + r + 50 || py < -r - 50 || py > height + r + 50) continue;
    const color = BODY_COLORS[body];
    if (body === 'sun') {
      const g = ctx.createRadialGradient(px, py, r * 0.3, px, py, r * 3);
      g.addColorStop(0, 'rgba(255, 193, 77, 0.45)');
      g.addColorStop(1, 'rgba(255, 193, 77, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (body === 'earth' && r > 6) {
      // Tag-/Nachtseite andeuten.
      ctx.fillStyle = 'rgba(6, 10, 24, 0.35)';
      ctx.beginPath();
      ctx.arc(px, py, r, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.fill();
    }
    drawn.push({ body, px, py, r });
  }

  // Kraft- und Geschwindigkeitsvektoren am Mond.
  if (view.vectors && sim.moonAlive) {
    const m = indices.moon;
    const e = indices.earth;
    const s = indices.sun;
    const [mx, my] = T(sys.x[m]!, sys.y[m]!);
    const px = sx(mx);
    const py = sy(my);
    const G = 6.6743e-11;
    const acc = (src: number): [number, number] => {
      const dx = sys.x[src]! - sys.x[m]!;
      const dy = sys.y[src]! - sys.y[m]!;
      const r = Math.hypot(dx, dy);
      const a = (G * sys.mass[src]!) / (r * r);
      return [(a * dx) / r, (a * dy) / r];
    };
    const aE = acc(e);
    const aEmag = Math.hypot(aE[0], aE[1]);
    const unit = 55 / aEmag;
    const toScreen = (v: [number, number], f: number): [number, number] => {
      const [rx, ry] = T.rotate(v[0], v[1]);
      return [rx * f, -ry * f];
    };
    const [ex, ey] = toScreen(aE, unit);
    arrow(ctx, px, py, ex, ey, SPACE.pullEarth);
    if (s >= 0 && sys.alive[s]) {
      const aS = acc(s);
      const [ax, ay] = toScreen(aS, unit);
      arrow(ctx, px, py, ax, ay, SPACE.pullSun);
      // Gezeitenbeschleunigung = Zug der Sonne auf den Mond minus Zug der Sonne auf die Erde.
      const dxE = sys.x[s]! - sys.x[e]!;
      const dyE = sys.y[s]! - sys.y[e]!;
      const rE = Math.hypot(dxE, dyE);
      const aSE = (G * sys.mass[s]!) / (rE * rE);
      const tidal: [number, number] = [aS[0] - (aSE * dxE) / rE, aS[1] - (aSE * dyE) / rE];
      const [tx, ty] = toScreen(tidal, unit * 20);
      arrow(ctx, px, py, tx, ty, SPACE.tidal);
    }
    // Geschwindigkeit relativ zur Erde (bzw. absolut im ruhenden System).
    const vx = sys.vx[m]! - (frame === 'inertial' ? 0 : sys.vx[e]!);
    const vy = sys.vy[m]! - (frame === 'inertial' ? 0 : sys.vy[e]!);
    const v = Math.hypot(vx, vy);
    if (v > 0) {
      const [rx, ry] = T.rotate(vx, vy);
      arrow(ctx, px, py, (rx / v) * 45, (-ry / v) * 45, SPACE.velocity);
    }
  }

  // Beschriftungen.
  if (view.labels) {
    ctx.font = '12px Jost, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Liegen zwei Körper fast übereinander (weit herausgezoomt), nur den ersten beschriften.
    const placed: [number, number][] = [];
    for (const d of drawn) {
      if (placed.some(([x, y]) => Math.hypot(x - d.px, y - d.py) < 18)) continue;
      placed.push([d.px, d.py]);
      ctx.fillStyle = SPACE.label;
      ctx.fillText(BODY_LABELS[d.body], d.px + d.r + 5, d.py - d.r - 4);
    }
  }

  // Maßstab.
  const target = niceLength(120 / k);
  const barPx = target * k;
  const bx = 16;
  const by = height - 18;
  ctx.strokeStyle = SPACE.label;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx, by - 4);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + barPx, by);
  ctx.lineTo(bx + barPx, by - 4);
  ctx.stroke();
  ctx.fillStyle = SPACE.label;
  ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(formatScale(target), bx, by - 6);
}

/** Wandelt eine Bildschirmposition in Bezugssystem-Koordinaten um. */
export function screenToFrame(
  cam: Camera,
  width: number,
  height: number,
  px: number,
  py: number,
): [number, number] {
  return [cam.cx + (px - width / 2) / cam.scale, cam.cy - (py - height / 2) / cam.scale];
}

/**
 * Zeichnet die Punkte a…b als glatte Kurve: Quadratische Bézierstücke laufen durch die
 * Mittelpunkte benachbarter Punkte, die Punkte selbst sind Kontrollpunkte. Stücke, die an
 * derselben Stelle enden und beginnen, fügen sich nahtlos aneinander. NaN trennt die Kurve.
 */
export function smoothPath(
  ctx: CanvasRenderingContext2D,
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  a: number,
  b: number,
  n = xs.length,
): void {
  const ok = (i: number) => i >= 0 && i < n && Number.isFinite(xs[i]!) && Number.isFinite(ys[i]!);
  const anchor = (i: number): [number, number] =>
    ok(i - 1) && ok(i + 1)
      ? [(xs[i]! + xs[i + 1]!) / 2, (ys[i]! + ys[i + 1]!) / 2]
      : [xs[i]!, ys[i]!];
  let pen = false;
  for (let i = a; i <= b; i++) {
    if (!ok(i)) {
      pen = false;
      continue;
    }
    if (!pen || !ok(i - 1)) {
      const [x, y] = i === a ? anchor(i) : [xs[i]!, ys[i]!];
      ctx.moveTo(x, y);
      pen = true;
    } else if (!ok(i + 1)) {
      ctx.lineTo(xs[i]!, ys[i]!);
    } else {
      const [x, y] = anchor(i);
      ctx.quadraticCurveTo(xs[i]!, ys[i]!, x, y);
    }
  }
}
