/**
 * "Lunas Sternenreise" – ein kindgerechtes Schleuder-Spiel mit echter Gravitation.
 * Spielfeld in logischen Pixeln (800 × 560), Erde ruht in der Mitte.
 */

export const WIDTH = 800;
export const HEIGHT = 560;
export const EARTH = { x: 400, y: 280, r: 38 };
/** "Gravitationsparameter" der Erde in px³/s²: Kreisbahn bei r = 150 px mit ≈ 110 px/s. */
export const GM = 1.8e6;
export const LUNA_R = 12;
export const STAR_R = 16;
export const LOST_DISTANCE = 560;
export const MAX_LAUNCH = 320;
export const STEP = 1 / 240;

export interface Rock {
  x: number;
  y: number;
  r: number;
}

export interface Level {
  id: number;
  name: string;
  intro: string;
  fact: string;
  start: { x: number; y: number };
  /** Eine mögliche Lösung (Startgeschwindigkeit) – daraus werden die Sterne abgeleitet. */
  solution: { vx: number; vy: number };
  starCount: number;
  rocks: Rock[];
  /** Zweiter Mond, der auf einer Kreisbahn läuft und Luna leicht anzieht. */
  buddy?: { r: number; speed: number; phase: number; gm: number; size: number };
  /** Gezeitenwirkung der Sonne (Sonne links): a = k·(2x, −y) relativ zur Erde. */
  tide?: number;
  /** Anzahl der Vorschau-Schritte beim Zielen. */
  preview: number;
  maxLaps: number;
}

export interface State {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

export function buddyPosition(level: Level, t: number): { x: number; y: number } | null {
  const b = level.buddy;
  if (!b) return null;
  const a = b.phase + (b.speed / b.r) * t;
  return { x: EARTH.x + b.r * Math.cos(a), y: EARTH.y - b.r * Math.sin(a) };
}

function accel(level: Level, x: number, y: number, t: number): [number, number] {
  const dx = EARTH.x - x;
  const dy = EARTH.y - y;
  const r2 = dx * dx + dy * dy;
  const r = Math.sqrt(r2);
  let ax = (GM * dx) / (r2 * r);
  let ay = (GM * dy) / (r2 * r);
  const b = buddyPosition(level, t);
  if (b && level.buddy) {
    const bx = b.x - x;
    const by = b.y - y;
    const d2 = bx * bx + by * by + 400;
    const d = Math.sqrt(d2);
    ax += (level.buddy.gm * bx) / (d2 * d);
    ay += (level.buddy.gm * by) / (d2 * d);
  }
  if (level.tide) {
    // Bildschirm-y zeigt nach unten; Sonne liegt links (−x).
    ax += level.tide * 2 * (x - EARTH.x);
    ay += level.tide * -(y - EARTH.y);
  }
  return [ax, ay];
}

/** Ein Zeitschritt (Velocity-Verlet). */
export function step(level: Level, s: State, dt = STEP): State {
  const [ax, ay] = accel(level, s.x, s.y, s.t);
  const vx = s.vx + ax * dt * 0.5;
  const vy = s.vy + ay * dt * 0.5;
  const x = s.x + vx * dt;
  const y = s.y + vy * dt;
  const [bx, by] = accel(level, x, y, s.t + dt);
  return { x, y, vx: vx + bx * dt * 0.5, vy: vy + by * dt * 0.5, t: s.t + dt };
}

export type Crash = 'earth' | 'rock' | 'buddy' | 'lost' | null;

export function collision(level: Level, s: State): Crash {
  const de = Math.hypot(s.x - EARTH.x, s.y - EARTH.y);
  if (de < EARTH.r + LUNA_R - 2) return 'earth';
  if (de > LOST_DISTANCE) return 'lost';
  for (const r of level.rocks)
    if (Math.hypot(s.x - r.x, s.y - r.y) < r.r + LUNA_R - 3) return 'rock';
  const b = buddyPosition(level, s.t);
  if (b && level.buddy && Math.hypot(s.x - b.x, s.y - b.y) < level.buddy.size + LUNA_R - 2)
    return 'buddy';
  return null;
}

/** Sterne entlang der Lösungsbahn (erste Umrundung), gleichmäßig in der Zeit verteilt. */
export function starsFor(level: Level): { x: number; y: number }[] {
  let s: State = { ...level.start, vx: level.solution.vx, vy: level.solution.vy, t: 0 };
  const path: State[] = [s];
  let angle = 0;
  let prev = Math.atan2(s.y - EARTH.y, s.x - EARTH.x);
  while (Math.abs(angle) < 2 * Math.PI && s.t < 60) {
    s = step(level, s);
    const a = Math.atan2(s.y - EARTH.y, s.x - EARTH.x);
    let d = a - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    angle += d;
    prev = a;
    path.push(s);
  }
  const stars: { x: number; y: number }[] = [];
  for (let k = 1; k <= level.starCount; k++) {
    const p = path[Math.floor((k / (level.starCount + 0.5)) * (path.length - 1))]!;
    stars.push({ x: p.x, y: p.y });
  }
  return stars;
}

export interface FlightResult {
  outcome: 'win' | Crash | 'timeout';
  collected: number;
  time: number;
}

/** Simuliert einen ganzen Flug (für Tests und die Lösbarkeitsprüfung). */
export function simulateFlight(level: Level, vx: number, vy: number): FlightResult {
  const stars = starsFor(level);
  const got = new Set<number>();
  let s: State = { ...level.start, vx, vy, t: 0 };
  let angle = 0;
  let prev = Math.atan2(s.y - EARTH.y, s.x - EARTH.x);
  while (s.t < 90) {
    s = step(level, s);
    stars.forEach((st, i) => {
      if (Math.hypot(s.x - st.x, s.y - st.y) < STAR_R + LUNA_R) got.add(i);
    });
    if (got.size === stars.length) return { outcome: 'win', collected: got.size, time: s.t };
    const c = collision(level, s);
    if (c) return { outcome: c, collected: got.size, time: s.t };
    const a = Math.atan2(s.y - EARTH.y, s.x - EARTH.x);
    let d = a - prev;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    angle += d;
    prev = a;
    if (Math.abs(angle) > level.maxLaps * 2 * Math.PI) break;
  }
  return { outcome: 'timeout', collected: got.size, time: s.t };
}

const START = { x: 400, y: 130 };

export const LEVELS: readonly Level[] = [
  {
    id: 1,
    name: 'Einmal rund um die Erde',
    intro:
      'Hallo, ich bin Luna! Zieh mich nach hinten und lass los – wie bei einer Steinschleuder. Sammle alle Sterne rund um die Erde!',
    fact: 'Der echte Mond braucht für eine Runde um die Erde gut 27 Tage. Dabei fällt er die ganze Zeit zur Erde – aber er ist so schnell, dass er immer an ihr vorbeifällt!',
    start: START,
    solution: { vx: -109.5, vy: 0 },
    starCount: 8,
    rocks: [],
    preview: 900,
    maxLaps: 3,
  },
  {
    id: 2,
    name: 'Die Ei-Bahn',
    intro:
      'Diesmal liegen die Sterne auf einer Ei-Form. Tipp: Nicht zu schnell losfliegen – dann fällst du näher an die Erde heran.',
    fact: 'Fast alle Umlaufbahnen sind ein bisschen eiförmig (Ellipsen). Das hat Johannes Kepler schon vor 400 Jahren herausgefunden.',
    start: START,
    solution: { vx: -88, vy: 0 },
    starCount: 8,
    rocks: [],
    preview: 500,
    maxLaps: 3,
  },
  {
    id: 3,
    name: 'Steinschlag!',
    intro: 'Vorsicht, Felsbrocken! Finde eine Bahn, die an allen Steinen vorbeiführt.',
    fact: 'Im All fliegen viele Gesteinsbrocken herum. Die Krater auf dem Mond stammen von solchen Einschlägen – weil der Mond keine Luft hat, bleiben sie Milliarden Jahre erhalten.',
    start: START,
    solution: { vx: -109.5, vy: 0 },
    starCount: 7,
    rocks: [
      { x: 400, y: 60, r: 22 },
      { x: 620, y: 270, r: 26 },
      { x: 250, y: 400, r: 20 },
      { x: 400, y: 380, r: 18 },
      { x: 170, y: 200, r: 24 },
    ],
    preview: 350,
    maxLaps: 3,
  },
  {
    id: 4,
    name: 'Schneller Flitzer',
    intro:
      'Jetzt musst du schneller sein! Die Sterne liegen weit draußen. Aber Achtung: Zu schnell – und du fliegst davon!',
    fact: 'Ab einer bestimmten Geschwindigkeit – der Fluchtgeschwindigkeit – kommt ein Körper nie mehr zurück. Von der Erdoberfläche aus sind das 11,2 Kilometer pro Sekunde!',
    start: START,
    solution: { vx: -128, vy: 0 },
    starCount: 8,
    rocks: [{ x: 400, y: 200, r: 16 }],
    preview: 250,
    maxLaps: 3,
  },
  {
    id: 5,
    name: 'Der kleine Bruder',
    intro:
      'Lunas kleiner Bruder Pip kreist auch um die Erde. Er zieht ein bisschen an dir – und zusammenstoßen solltet ihr nicht!',
    fact: 'Wenn drei Körper sich gegenseitig anziehen, kann niemand die Bahnen mit einer einfachen Formel ausrechnen. Das nennt man das Dreikörperproblem – Computer rechnen es in kleinen Schritten aus, genau wie hier im Spiel.',
    start: START,
    solution: { vx: -104, vy: 0 },
    starCount: 8,
    rocks: [],
    buddy: { r: 235, speed: 85, phase: Math.PI, gm: 60000, size: 10 },
    preview: 250,
    maxLaps: 3,
  },
  {
    id: 6,
    name: 'Die Sonne zerrt',
    intro:
      'Die Sonne ist weit weg (links), aber sie zieht ein bisschen an deiner Bahn – nach links und rechts auseinander. Schaffst du trotzdem alle Sterne?',
    fact: 'Die Sonne zieht den echten Mond sogar stärker an als die Erde! Weil sie aber die Erde fast genauso stark anzieht, bleibt der Mond trotzdem bei uns. Nur der kleine Unterschied verformt seine Bahn.',
    start: START,
    solution: { vx: -106, vy: 0 },
    starCount: 8,
    rocks: [{ x: 640, y: 120, r: 20 }],
    tide: 0.06,
    preview: 200,
    maxLaps: 3,
  },
];
