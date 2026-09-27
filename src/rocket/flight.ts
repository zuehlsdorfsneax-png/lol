import { part, segments, type Design } from './parts';
import {
  BODIES,
  EARTH,
  G0,
  JUPITER,
  MARS,
  MOON,
  PHOBOS,
  STATION,
  SUN,
  VENUS,
  bodyState,
  densityAt,
  dominantBody,
  gravity,
  orbitAngle,
  orbitAround,
  stationPort,
  stationState,
  type Body,
  type BodyId,
  type Orbit,
} from './world';

/** Stufen der Zeitraffer-Anzeige. */
export const WARPS = [
  1, 2, 4, 10, 50, 100, 500, 1000, 5000, 10_000, 50_000, 200_000, 1_000_000, 5_000_000,
] as const;
/** Höchster Zeitraffer bei laufendem Triebwerk, in der Atmosphäre oder dicht über dem Boden. */
const WARP_LIMITED = 4;

export type GoalId =
  | 'lift'
  | 'km10'
  | 'space'
  | 'orbit'
  | 'high'
  | 'dock'
  | 'refuel'
  | 'soi'
  | 'flyby'
  | 'moonorbit'
  | 'moonland'
  | 'return'
  | 'soft'
  | 'escape'
  | 'venus'
  | 'venusland'
  | 'mars'
  | 'marsorbit'
  | 'marsland'
  | 'phobos'
  | 'jupiter'
  | 'sunclose';

export interface GoalDef {
  id: GoalId;
  title: string;
  text: string;
  points: number;
  group: 'Erde' | 'Station' | 'Mond' | 'Planeten' | 'Können';
}

export const GOALS: readonly GoalDef[] = [
  {
    id: 'lift',
    group: 'Erde',
    points: 5,
    title: 'Abheben',
    text: 'Die Rakete verlässt die Startrampe.',
  },
  {
    id: 'km10',
    group: 'Erde',
    points: 5,
    title: '10 km Höhe',
    text: 'Höher als jedes Verkehrsflugzeug.',
  },
  {
    id: 'space',
    group: 'Erde',
    points: 10,
    title: 'Weltraum',
    text: 'Über 40 km: Hier endet die Atmosphäre im Spiel.',
  },
  {
    id: 'orbit',
    group: 'Erde',
    points: 20,
    title: 'Umlaufbahn',
    text: 'Der tiefste Bahnpunkt liegt über der Atmosphäre – die Rakete fällt ständig um die Erde herum.',
  },
  {
    id: 'high',
    group: 'Erde',
    points: 15,
    title: 'Hohe Bahn',
    text: 'Eine geschlossene Erdbahn, deren höchster Punkt über 1.000 km liegt.',
  },
  {
    id: 'dock',
    group: 'Station',
    points: 30,
    title: 'Angedockt',
    text: 'An der Raumstation Kepler festgemacht – Rendezvous im Orbit geschafft.',
  },
  {
    id: 'refuel',
    group: 'Station',
    points: 10,
    title: 'Aufgetankt',
    text: 'Alle Tanks an der Station gefüllt. Mit vollen Tanks aus der Umlaufbahn reicht es weit.',
  },
  {
    id: 'soi',
    group: 'Mond',
    points: 15,
    title: 'Hill-Sphäre des Mondes',
    text: 'Ab hier zieht der Mond stärker an der Bahn als die Erde (Kapitel 5).',
  },
  {
    id: 'flyby',
    group: 'Mond',
    points: 15,
    title: 'Mondvorbeiflug',
    text: 'Durch die Hill-Sphäre des Mondes und wieder hinaus – der Mond lenkt die Bahn um wie ein Katapult.',
  },
  {
    id: 'moonorbit',
    group: 'Mond',
    points: 20,
    title: 'Mondumlaufbahn',
    text: 'Vom Mond eingefangen.',
  },
  {
    id: 'moonland',
    group: 'Mond',
    points: 40,
    title: 'Mondlandung',
    text: 'Sanft auf dem Mond aufgesetzt.',
  },
  {
    id: 'return',
    group: 'Mond',
    points: 50,
    title: 'Heimkehr',
    text: 'Vom Mond zurück und sicher auf der Erde gelandet.',
  },
  {
    id: 'escape',
    group: 'Planeten',
    points: 30,
    title: 'Flucht aus dem System',
    text: 'Raus aus der Hill-Sphäre der Erde – jetzt kreist die Rakete um die Sonne. Genau das passiert einem Mond mit zu viel Tempo (Problemfrage).',
  },
  {
    id: 'venus',
    group: 'Planeten',
    points: 40,
    title: 'Venus erreicht',
    text: 'In der Hill-Sphäre der Venus angekommen.',
  },
  {
    id: 'venusland',
    group: 'Planeten',
    points: 60,
    title: 'Venuslandung',
    text: 'Durch die dichte Venusatmosphäre bis zum Boden.',
  },
  {
    id: 'mars',
    group: 'Planeten',
    points: 40,
    title: 'Mars erreicht',
    text: 'In der Hill-Sphäre des Mars angekommen.',
  },
  {
    id: 'marsorbit',
    group: 'Planeten',
    points: 40,
    title: 'Marsumlaufbahn',
    text: 'Vom Mars eingefangen.',
  },
  {
    id: 'marsland',
    group: 'Planeten',
    points: 80,
    title: 'Marslandung',
    text: 'Fallschirm und Triebwerk zusammen – sicher auf dem roten Planeten.',
  },
  {
    id: 'phobos',
    group: 'Planeten',
    points: 60,
    title: 'Phobos-Landung',
    text: 'Auf dem winzigen Marsmond aufgesetzt – fast schwerelos.',
  },
  {
    id: 'jupiter',
    group: 'Planeten',
    points: 70,
    title: 'Jupiter-Vorbeiflug',
    text: 'In die Hill-Sphäre des Riesenplaneten eingedrungen.',
  },
  {
    id: 'sunclose',
    group: 'Planeten',
    points: 50,
    title: 'Sonnennah',
    text: 'Näher an der Sonne als die Venus.',
  },
  {
    id: 'soft',
    group: 'Können',
    points: 10,
    title: 'Butterweich',
    text: 'Eine Landung mit weniger als 2 m/s.',
  },
];

export const RANKS: readonly { points: number; title: string }[] = [
  { points: 0, title: 'Kadett' },
  { points: 50, title: 'Raketenbauer' },
  { points: 120, title: 'Pilot' },
  { points: 250, title: 'Astronaut' },
  { points: 450, title: 'Kommandant' },
  { points: 700, title: 'Raumfahrt-Legende' },
];

export function goalPoints(goals: Iterable<string>): number {
  let sum = 0;
  for (const id of goals) sum += GOALS.find((g) => g.id === id)?.points ?? 0;
  return sum;
}

export function rankFor(points: number): { title: string; next: number | null; index: number } {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (points >= r.points) index = i;
  });
  return { title: RANKS[index]!.title, next: RANKS[index + 1]?.points ?? null, index };
}

export type FlightStatus = 'landed' | 'flying' | 'crashed' | 'docked';
export type ChuteState = 'none' | 'stowed' | 'armed' | 'open';
export type TargetId = 'station' | BodyId;

/** Gespeicherter Spielstand eines Flugs (Schnellspeichern). */
export interface FlightSnapshot {
  v: 1;
  design: string[];
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  throttle: number;
  segs: { parts: string[]; fuel: number }[];
  status: Exclude<FlightStatus, 'crashed'>;
  landedOn: BodyId | null;
  landAngle: number;
  chute: ChuteState;
  chuteOpen: number;
  goals: GoalId[];
  target: TargetId | null;
  maxAltitude: number;
}

export interface FlightEvent {
  id: number;
  kind: 'goal' | 'info' | 'warn' | 'fail';
  text: string;
}

interface Segment {
  parts: string[];
  fuel: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  parts: string[];
  age: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: 'smoke' | 'fire' | 'spark';
}

export interface Encounter {
  body: Body;
  t: number;
  /** Kleinster Abstand zum Mittelpunkt. */
  distance: number;
  index: number;
  /** Erster und letzter Vorhersagepunkt in der Hill-Sphäre des Körpers. */
  enter: number;
  exit: number;
}

export interface Prediction {
  /** Positionen im Erdsystem und zugehörige Zeiten. */
  xs: Float64Array;
  ys: Float64Array;
  ts: Float64Array;
  n: number;
  /** Bezugskörper für die Darstellung. */
  ref: Body;
  /** Endet die Bahn auf einer Oberfläche? */
  impact: Body | null;
  /** Erste Begegnung mit einem anderen Körper. */
  encounter: Encounter | null;
  /** Nächste Annäherung an die Station (wenn sie das Ziel ist). */
  closest: { t: number; distance: number; index: number } | null;
  /** Indizes von tiefstem und höchstem Punkt relativ zum Bezugskörper (-1 = keiner). */
  low: number;
  high: number;
}

const TURN_RATE = 1.1;
const TURN_ACCEL = 3.5;
const ROCKET_CDA = 4;
const CHUTE_CDA = 900;
const CHUTE_MAX_SPEED = 300;
const LAND_SPEED = 8;
const LAND_SPEED_LEGS = 14;
const LAND_TILT = 0.4;
const LAND_TILT_LEGS = 0.65;
/** Beschleunigung der Lagekontrolldüsen (RCS) in m/s². */
const RCS_ACCEL = 0.6;
const DOCK_DISTANCE = 20;
const DOCK_SPEED = 2;

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Monde drehen sich gebunden mit ihrer Bahn (zeigen dem Planeten immer dieselbe Seite). */
function spin(b: Body, t: number): number {
  return b.parent && b.parent !== 'sun' ? orbitAngle(b, t) : 0;
}

let eventId = 1;

/**
 * Ein Raketenflug. Die Rakete ist ein Massenpunkt mit Ausrichtung; ihr Ort ist die Unterkante
 * (für die Landung). Gerechnet wird mit Runge-Kutta 4 in der Schwerkraft von Sonne, Planeten und
 * Monden, dazu Schub, Treibstoffverbrauch, Luftwiderstand und Lagekontrolldüsen.
 */
export class Flight {
  t = 0;
  x = 0;
  y = EARTH.radius;
  vx = 0;
  vy = 0;
  /** Richtung der Spitze (mathematischer Winkel). */
  angle = Math.PI / 2;
  angVel = 0;
  /** 0…1 */
  throttle = 0;
  /** Steuereingabe −1 (links) … 1 (rechts). */
  turn = 0;
  /** Lagekontrolldüsen an? Dann verschieben `translate` die Rakete sanft. */
  rcs = false;
  /** RCS-Eingabe: x = nach rechts, y = nach vorn (je −1 … 1). */
  translate = { x: 0, y: 0 };
  target: TargetId | null = null;
  segs: Segment[];
  status: FlightStatus = 'landed';
  landedOn: Body | null = EARTH;
  chute: ChuteState;
  chuteOpen = 0;
  warpIndex = 0;
  readonly goals = new Set<GoalId>();
  readonly events: FlightEvent[] = [];
  readonly debris: Debris[] = [];
  readonly particles: Particle[] = [];
  maxAltitude = 0;
  crashReason = '';
  readonly design: Design;
  /** Winkel des Landeplatzes auf dem Körper (bei Monden relativ zur Drehung). */
  private landAngle = Math.PI / 2;
  private emptyWarned = false;
  private rng = 1;
  private visited = new Set<BodyId>();

  constructor(design: Design) {
    this.design = [...design];
    this.segs = segments(design).map((parts) => ({
      parts,
      fuel: parts.reduce((s, id) => s + part(id).fuel, 0),
    }));
    this.chute = design.includes('fallschirm') ? 'stowed' : 'none';
  }

  // ---------------------------------------------------------------- Spielstand

  snapshot(): FlightSnapshot | null {
    if (this.status === 'crashed') return null;
    return {
      v: 1,
      design: [...this.design],
      t: this.t,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      angle: this.angle,
      throttle: 0,
      segs: this.segs.map((s) => ({ parts: [...s.parts], fuel: s.fuel })),
      status: this.status,
      landedOn: this.landedOn?.id ?? null,
      landAngle: this.landAngle,
      chute: this.chute,
      chuteOpen: this.chuteOpen,
      goals: [...this.goals],
      target: this.target,
      maxAltitude: this.maxAltitude,
    };
  }

  static restore(s: FlightSnapshot): Flight {
    const f = new Flight(s.design);
    Object.assign(f, {
      t: s.t,
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      angle: s.angle,
      throttle: 0,
      status: s.status,
      chute: s.chute,
      chuteOpen: s.chuteOpen,
      target: s.target,
      maxAltitude: s.maxAltitude,
    });
    f.segs = s.segs.map((q) => ({ parts: [...q.parts], fuel: q.fuel }));
    f.landedOn = s.landedOn ? BODIES.find((b) => b.id === s.landedOn)! : null;
    f.landAngle = s.landAngle;
    for (const g of s.goals) f.goals.add(g);
    return f;
  }

  // ---------------------------------------------------------------- Eigenschaften

  get warp(): number {
    return WARPS[this.warpIndex]!;
  }

  get mass(): number {
    return this.segs.reduce(
      (s, seg) => s + seg.fuel + seg.parts.reduce((d, id) => d + part(id).dry, 0),
      0,
    );
  }

  get active(): Segment {
    return this.segs[this.segs.length - 1]!;
  }

  /** Höhe der Rakete in Metern. */
  get length(): number {
    return this.segs.reduce((s, seg) => s + seg.parts.reduce((a, id) => a + part(id).height, 0), 0);
  }

  /** Schub (N) und Massenstrom (kg/s) der aktiven Stufe bei Vollgas. */
  engine(): { thrust: number; flow: number } {
    let thrust = 0;
    let flow = 0;
    for (const id of this.active.parts) {
      const p = part(id);
      if (p.thrust > 0) {
        thrust += p.thrust;
        flow += p.thrust / (p.isp * G0);
      }
    }
    return { thrust, flow };
  }

  get fuelCapacity(): number {
    return this.active.parts.reduce((s, id) => s + part(id).fuel, 0);
  }

  get hasLegs(): boolean {
    return this.active.parts.includes('beine');
  }

  get thrusting(): boolean {
    return this.throttle > 0 && this.active.fuel > 0 && this.engine().thrust > 0;
  }

  /** Verbleibendes Δv aller Stufen (Raketengleichung). */
  deltaV(): number {
    let above = 0;
    let dv = 0;
    for (const seg of this.segs) {
      const dry = seg.parts.reduce((s, id) => s + part(id).dry, 0);
      const start = above + dry + seg.fuel;
      let thrust = 0;
      let flow = 0;
      for (const id of seg.parts) {
        const p = part(id);
        if (p.thrust > 0) {
          thrust += p.thrust;
          flow += p.thrust / (p.isp * G0);
        }
      }
      if (thrust > 0 && seg.fuel > 0) dv += (thrust / flow) * Math.log(start / (start - seg.fuel));
      above = start;
    }
    return dv;
  }

  /** Ort und Geschwindigkeit eines Körpers jetzt. */
  state(b: Body): { x: number; y: number; vx: number; vy: number } {
    const [x, y, vx, vy] = bodyState(b, this.t);
    return { x, y, vx, vy };
  }

  moon(): { x: number; y: number; vx: number; vy: number } {
    return this.state(MOON);
  }

  /** Bezugskörper: der kleinste Körper, in dessen Hill-Sphäre die Rakete ist. */
  refBody(): Body {
    return dominantBody(this.x, this.y, this.t);
  }

  /** Lage relativ zu einem Körper: Ort, Geschwindigkeit, Höhe. */
  relative(body: Body = this.refBody()) {
    const c = this.state(body);
    const rx = this.x - c.x;
    const ry = this.y - c.y;
    const vx = this.vx - c.vx;
    const vy = this.vy - c.vy;
    const r = Math.hypot(rx, ry);
    return { body, cx: c.x, cy: c.y, rx, ry, vx, vy, r, altitude: r - body.radius };
  }

  orbit(body: Body = this.refBody()): Orbit {
    const rel = this.relative(body);
    return orbitAround(body, rel.rx, rel.ry, rel.vx, rel.vy);
  }

  get altitudeEarth(): number {
    return Math.hypot(this.x, this.y) - EARTH.radius;
  }

  /** Der Körper mit dem kleinsten Abstand zur Oberfläche. */
  nearest(): { body: Body; altitude: number } {
    let best = EARTH;
    let alt = Infinity;
    for (const b of BODIES) {
      const [bx, by] = bodyState(b, this.t);
      const h = Math.hypot(this.x - bx, this.y - by) - b.radius;
      if (h < alt) {
        alt = h;
        best = b;
      }
    }
    return { body: best, altitude: alt };
  }

  /** Luftdichte an der Rakete und der Körper, dem die Luft gehört. */
  air(): { rho: number; body: Body; altitude: number } {
    const { body, altitude } = this.nearest();
    return { rho: densityAt(body, altitude), body, altitude };
  }

  /** Abstand und Relativgeschwindigkeit zum gewählten Ziel. */
  targetInfo(): { name: string; distance: number; speed: number; closing: number } | null {
    if (!this.target) return null;
    let x: number;
    let y: number;
    let vx: number;
    let vy: number;
    let name: string;
    let surface = 0;
    if (this.target === 'station') {
      [x, y] = stationPort(this.t);
      [, , vx, vy] = stationState(this.t);
      name = STATION.name;
    } else {
      const b = BODIES.find((q) => q.id === this.target)!;
      [x, y, vx, vy] = bodyState(b, this.t);
      name = b.name;
      surface = b.radius;
    }
    const cx = this.x + Math.cos(this.angle) * this.length * 0.5;
    const cy = this.y + Math.sin(this.angle) * this.length * 0.5;
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    const rvx = this.vx - vx;
    const rvy = this.vy - vy;
    return {
      name,
      distance: d - surface,
      speed: Math.hypot(rvx, rvy),
      closing: d > 0 ? (rvx * dx + rvy * dy) / d : 0,
    };
  }

  /** Größter erlaubter Zeitraffer in der momentanen Lage. */
  maxWarpIndex(): number {
    if (this.status === 'crashed') return 0;
    let limit: number = WARPS.length - 1;
    if (this.status === 'landed' || this.status === 'docked') {
      if (this.thrusting) return 0;
    } else {
      const limited = WARPS.indexOf(WARP_LIMITED);
      if (this.thrusting || (this.rcs && (this.translate.x || this.translate.y))) return limited;
      const { body, altitude } = this.nearest();
      if (altitude < 3_000) limit = WARPS.indexOf(10);
      else if (altitude < 30_000 || altitude < body.atmosphere) limit = WARPS.indexOf(50);
      // Nahe der Station nicht vorbeirasen.
      const ti = this.target === 'station' ? this.targetInfo() : null;
      if (ti && ti.distance < 5_000) limit = Math.min(limit, WARPS.indexOf(10));
    }
    // Pro Bild höchstens etwa 1500 Rechenschritte – sonst ruckelt es nahe großer Körper.
    const step = this.stepEstimate();
    while (limit > 0 && WARPS[limit]! / 60 > step * 1500) limit--;
    // Vor einem Aufprall (oder dem Eintauchen in eine Atmosphäre) automatisch abbremsen:
    // mindestens zehn Bilder bis dahin.
    if (this.status === 'flying') {
      const ttc = this.timeToSurface();
      while (limit > 0 && WARPS[limit]! / 60 > ttc / 10) limit--;
    }
    return limit;
  }

  /** Geschätzte Zeit bis zum Boden bzw. bis zur Atmosphäre des nächsten Körpers (∞ = steigt). */
  timeToSurface(): number {
    let best = Infinity;
    for (const b of BODIES) {
      const c = this.state(b);
      const rx = this.x - c.x;
      const ry = this.y - c.y;
      const r = Math.hypot(rx, ry);
      const radial = ((this.vx - c.vx) * rx + (this.vy - c.vy) * ry) / r;
      if (radial >= 0) continue;
      const h = r - b.radius - (b.atmosphere > 0 && r - b.radius > b.atmosphere ? b.atmosphere : 0);
      // Freier Fall beschleunigt: t aus h = v·t + g/2·t²
      const g = b.mu / (r * r);
      const v = -radial;
      const t = (-v + Math.sqrt(v * v + 2 * g * Math.max(h, 0))) / g;
      best = Math.min(best, t);
    }
    return best;
  }

  private stepEstimate(): number {
    let tau = Infinity;
    for (const b of BODIES) {
      const [bx, by] = bodyState(b, this.t);
      const d = Math.hypot(this.x - bx, this.y - by);
      tau = Math.min(tau, Math.sqrt(d ** 3 / b.mu));
    }
    return Math.max(0.02, 0.01 * tau);
  }

  setWarp(index: number): void {
    this.warpIndex = Math.max(0, Math.min(index, this.maxWarpIndex()));
  }

  // ---------------------------------------------------------------- Steuerung

  /** Nächste Stufe zünden: die unterste Stufe wird abgeworfen. */
  stage(): boolean {
    if (this.status !== 'flying') {
      if (this.status === 'landed' && this.segs.length > 1)
        this.emit('info', 'Stufen lassen sich erst im Flug abtrennen.');
      return false;
    }
    if (this.segs.length <= 1) {
      if (this.chute === 'stowed') this.deployChute();
      return false;
    }
    const dropped = this.segs.pop()!;
    const height = dropped.parts.reduce((s, id) => s + part(id).height, 0);
    const ax = Math.cos(this.angle);
    const ay = Math.sin(this.angle);
    this.debris.push({
      x: this.x,
      y: this.y,
      vx: this.vx - ax * 2,
      vy: this.vy - ay * 2,
      angle: this.angle,
      spin: (this.random() - 0.5) * 0.6,
      parts: dropped.parts,
      age: 0,
    });
    this.x += ax * height;
    this.y += ay * height;
    this.vx += ax * 2;
    this.vy += ay * 2;
    this.emptyWarned = false;
    this.emit(
      'info',
      `Stufe abgetrennt – noch ${this.segs.length} Stufe${this.segs.length > 1 ? 'n' : ''}.`,
    );
    return true;
  }

  deployChute(): void {
    if (this.chute === 'stowed') {
      this.chute = 'armed';
      this.emit(
        'info',
        'Fallschirm scharf – er öffnet sich in der unteren Atmosphäre, sobald die Rakete langsamer als 300 m/s ist.',
      );
    }
  }

  /** An der Station alle Tanks füllen. */
  refuel(): boolean {
    if (this.status !== 'docked') return false;
    for (const seg of this.segs) seg.fuel = seg.parts.reduce((s, id) => s + part(id).fuel, 0);
    this.emptyWarned = false;
    this.goal('refuel');
    return true;
  }

  /** Von der Station ablegen (sanfter Stoß nach hinten). */
  undock(): void {
    if (this.status !== 'docked') return;
    this.status = 'flying';
    this.vx -= Math.cos(this.angle) * 0.8;
    this.vy -= Math.sin(this.angle) * 0.8;
    this.x -= Math.cos(this.angle) * 3;
    this.y -= Math.sin(this.angle) * 3;
    this.emit('info', 'Abgelegt. Gute Reise!');
  }

  // ---------------------------------------------------------------- Simulation

  /** Rechnet `realDt` Sekunden Echtzeit (mal Zeitraffer) weiter. */
  update(realDt: number): void {
    realDt = Math.min(realDt, 0.1);
    if (this.warpIndex > this.maxWarpIndex()) this.setWarp(this.maxWarpIndex());
    if (this.status !== 'crashed') {
      // Drehen: direkt gesteuert, mit kurzer Trägheit.
      // Im Physik-Zeitraffer (bis 4×) dreht die Rakete mit, im schnellen Zeitraffer nicht.
      const physics = this.warp <= WARP_LIMITED;
      const target = this.status === 'flying' && physics ? this.turn * TURN_RATE : 0;
      const dv = target - this.angVel;
      const maxStep = TURN_ACCEL * realDt;
      this.angVel += Math.max(-maxStep, Math.min(maxStep, dv));
      if (this.status === 'flying' && physics)
        this.angle = wrap(this.angle - this.angVel * realDt * this.warp);
    }
    let remaining = realDt * this.warp;
    let guard = 0;
    while (remaining > 1e-9 && this.status !== 'crashed' && guard++ < 4_000) {
      remaining -= this.substep(remaining);
    }
    // Falls die Schrittgrenze erreicht wurde, läuft die Zeit einfach etwas langsamer.
    this.updateDebris(realDt * this.warp);
    this.updateParticles(realDt);
    if (this.status !== 'crashed' && this.thrusting && this.warp <= WARP_LIMITED) this.exhaust();
    this.checkGoals();
  }

  private substep(maxDt: number): number {
    const { thrust, flow } = this.engine();
    const burning = this.throttle > 0 && this.active.fuel > 0 && thrust > 0;

    if (this.status === 'docked') {
      const dt = maxDt;
      this.t += dt;
      this.attachToStation();
      return dt;
    }

    if (this.status === 'landed') {
      const body = this.landedOn!;
      const g = body.mu / body.radius ** 2;
      const accel = burning ? (thrust * this.throttle) / this.mass : 0;
      if (accel > g * 1.02) {
        this.status = 'flying';
        this.landedOn = null;
      } else {
        const dt = Math.min(maxDt, burning ? 0.02 : maxDt);
        if (burning) this.burn(flow * this.throttle * dt);
        this.t += dt;
        const local = spin(body, this.t) + this.landAngle;
        const c = this.state(body);
        this.x = c.x + body.radius * Math.cos(local);
        this.y = c.y + body.radius * Math.sin(local);
        this.vx = c.vx;
        this.vy = c.vy;
        this.angle = local;
        return dt;
      }
    }

    // Schrittweite: Bruchteil der kürzesten Umlaufzeitskala, nahe Oberflächen noch kleiner.
    let dt = Infinity;
    let atmosphere = false;
    for (const b of BODIES) {
      const [bx, by, bvx, bvy] = bodyState(b, this.t);
      const d = Math.hypot(this.x - bx, this.y - by);
      const h = d - b.radius;
      const rel = Math.hypot(this.vx - bvx, this.vy - bvy);
      dt = Math.min(dt, 0.01 * Math.sqrt(d ** 3 / b.mu), Math.max(0.02, h / (3 * rel + 1e-9)));
      if (h < b.atmosphere) atmosphere = true;
    }
    const rcsOn = this.rcs && (this.translate.x !== 0 || this.translate.y !== 0);
    if (burning || atmosphere || rcsOn) dt = Math.min(dt, 0.02);
    dt = Math.max(0.005, Math.min(dt, maxDt));

    const mass = this.mass;
    const ta = burning ? (thrust * this.throttle) / mass : 0;
    const ax = Math.cos(this.angle);
    const ay = Math.sin(this.angle);
    let tx = ta * ax;
    let ty = ta * ay;
    if (rcsOn) {
      // Vorwärts entlang der Achse, seitlich rechtwinklig dazu (rechts = im Uhrzeigersinn).
      tx += RCS_ACCEL * (this.translate.y * ax + this.translate.x * ay);
      ty += RCS_ACCEL * (this.translate.y * ay - this.translate.x * ax);
    }
    this.rk4(dt, tx, ty);

    // Luftwiderstand implizit (stabil auch bei offenem Fallschirm), relativ zur Luft des Körpers.
    const air = this.air();
    const bodyV = this.state(air.body);
    const rvx = this.vx - bodyV.vx;
    const rvy = this.vy - bodyV.vy;
    const rv = Math.hypot(rvx, rvy);
    if (
      this.chute === 'armed' &&
      air.rho > 0.002 &&
      air.altitude < air.body.atmosphere * 0.3 &&
      rv < CHUTE_MAX_SPEED
    ) {
      this.chute = 'open';
      this.emit('info', 'Fallschirm offen!');
    }
    if (this.chute === 'open') this.chuteOpen = Math.min(1, this.chuteOpen + dt / 2.5);
    if (air.rho > 0) {
      const cda = ROCKET_CDA + (this.chute === 'open' ? CHUTE_CDA * this.chuteOpen : 0);
      const k = (0.5 * air.rho * cda) / mass;
      const f = 1 / (1 + k * rv * dt);
      this.vx = bodyV.vx + rvx * f;
      this.vy = bodyV.vy + rvy * f;
    }
    if (burning) this.burn(flow * this.throttle * dt);

    this.checkContact();
    if (this.status === 'flying' && this.target === 'station') this.checkDocking();
    return dt;
  }

  private rk4(dt: number, tx: number, ty: number): void {
    const t = this.t;
    const { x, y, vx, vy } = this;
    const [a1x, a1y] = gravity(x, y, t);
    const [a2x, a2y] = gravity(x + (vx * dt) / 2, y + (vy * dt) / 2, t + dt / 2);
    const v2x = vx + ((a1x + tx) * dt) / 2;
    const v2y = vy + ((a1y + ty) * dt) / 2;
    const [a3x, a3y] = gravity(x + (v2x * dt) / 2, y + (v2y * dt) / 2, t + dt / 2);
    const v3x = vx + ((a2x + tx) * dt) / 2;
    const v3y = vy + ((a2y + ty) * dt) / 2;
    const [a4x, a4y] = gravity(x + v3x * dt, y + v3y * dt, t + dt);
    const v4x = vx + (a3x + tx) * dt;
    const v4y = vy + (a3y + ty) * dt;
    this.x = x + (dt / 6) * (vx + 2 * v2x + 2 * v3x + v4x);
    this.y = y + (dt / 6) * (vy + 2 * v2y + 2 * v3y + v4y);
    this.vx = vx + (dt / 6) * (a1x + 2 * a2x + 2 * a3x + a4x + 6 * tx);
    this.vy = vy + (dt / 6) * (a1y + 2 * a2y + 2 * a3y + a4y + 6 * ty);
    this.t = t + dt;
  }

  private burn(amount: number): void {
    const seg = this.active;
    seg.fuel = Math.max(0, seg.fuel - amount);
    if (seg.fuel === 0 && !this.emptyWarned) {
      this.emptyWarned = true;
      this.emit(
        'warn',
        this.segs.length > 1
          ? 'Tank leer! Nächste Stufe zünden (Leertaste).'
          : 'Kein Treibstoff mehr.',
      );
    }
  }

  private checkContact(): void {
    for (const b of BODIES) {
      const c = this.state(b);
      if (Math.hypot(this.x - c.x, this.y - c.y) < b.radius) {
        this.touchdown(b, c);
        return;
      }
    }
  }

  private touchdown(body: Body, c: { x: number; y: number; vx: number; vy: number }): void {
    const speed = Math.hypot(this.vx - c.vx, this.vy - c.vy);
    const up = Math.atan2(this.y - c.y, this.x - c.x);
    const tilt = Math.abs(wrap(this.angle - up));
    const legs = this.hasLegs;
    const speedLimit = legs ? LAND_SPEED_LEGS : LAND_SPEED;
    const tiltLimit = legs ? LAND_TILT_LEGS : LAND_TILT;
    // Auf die Oberfläche setzen.
    this.x = c.x + body.radius * Math.cos(up);
    this.y = c.y + body.radius * Math.sin(up);
    if (body.solid && speed <= speedLimit && tilt <= tiltLimit) {
      this.status = 'landed';
      this.landedOn = body;
      this.landAngle = up - spin(body, this.t);
      this.vx = c.vx;
      this.vy = c.vy;
      this.angle = up;
      this.angVel = 0;
      this.warpIndex = 0;
      if (speed < 2) this.goal('soft');
      if (body === MOON) this.goal('moonland');
      else if (body === MARS) this.goal('marsland');
      else if (body === VENUS) this.goal('venusland');
      else if (body === PHOBOS) this.goal('phobos');
      else if (body === EARTH && this.goals.has('moonland')) this.goal('return');
      if (!this.events.length || this.events[this.events.length - 1]!.kind !== 'goal')
        this.emit('info', `Gelandet auf: ${body.name}, mit ${speed.toFixed(1)} m/s. Gut gemacht!`);
      return;
    }
    this.status = 'crashed';
    this.warpIndex = 0;
    this.throttle = 0;
    if (body === SUN) this.crashReason = 'In der Sonne verglüht – über 5.000 °C heiß.';
    else if (!body.solid)
      this.crashReason = `${body.name} hat keine feste Oberfläche – die Rakete ist in der Gashülle zerdrückt worden.`;
    else
      this.crashReason =
        speed > speedLimit
          ? `Aufprall mit ${Math.round(speed)} m/s – sicher sind höchstens ${speedLimit} m/s${legs ? '' : ' (mit Landebeinen 14 m/s)'}.`
          : `Zu schräg aufgesetzt (${Math.round((tilt * 180) / Math.PI)}°). Die Rakete ist umgekippt.`;
    this.explode(this.x, this.y, c.vx, c.vy, 70);
    this.emit('fail', this.crashReason);
  }

  // ---------------------------------------------------------------- Station

  private checkDocking(): void {
    const ti = this.targetInfo();
    if (!ti || ti.distance > DOCK_DISTANCE || ti.speed > DOCK_SPEED) return;
    this.status = 'docked';
    this.throttle = 0;
    this.warpIndex = 0;
    this.translate = { x: 0, y: 0 };
    this.attachToStation();
    this.goal('dock');
  }

  /** Rakete mit der Spitze am Andockstutzen festhalten. */
  private attachToStation(): void {
    const [px, py] = stationPort(this.t);
    const [sx, sy, vx, vy] = stationState(this.t);
    // Spitze zeigt zur Station (entgegen der Flugrichtung des Stutzens).
    const out = Math.atan2(py - sy, px - sx);
    this.angle = out + Math.PI;
    const len = this.length;
    this.x = px + Math.cos(out) * len;
    this.y = py + Math.sin(out) * len;
    this.vx = vx;
    this.vy = vy;
  }

  // ---------------------------------------------------------------- Ziele und Ereignisse

  private emit(kind: FlightEvent['kind'], text: string): void {
    this.events.push({ id: eventId++, kind, text });
    if (this.events.length > 30) this.events.shift();
  }

  private goal(id: GoalId): void {
    if (this.goals.has(id)) return;
    this.goals.add(id);
    const g = GOALS.find((x) => x.id === id)!;
    this.emit('goal', `${g.title}! ${g.text} (+${g.points} Punkte)`);
  }

  private checkGoals(): void {
    if (this.status === 'crashed') return;
    const h = this.altitudeEarth;
    this.maxAltitude = Math.max(this.maxAltitude, h);
    if (this.status === 'flying' && h > 20) this.goal('lift');
    if (h > 10_000) this.goal('km10');
    if (h > EARTH.atmosphere) this.goal('space');
    if (this.status !== 'flying') return;
    const ref = this.refBody();
    this.visited.add(ref.id);
    if (ref === MOON) {
      this.goal('soi');
      const o = this.orbit(MOON);
      if (o.bound && o.periapsis > 2_000 && o.apoapsis + MOON.radius < MOON.hill)
        this.goal('moonorbit');
    } else if (ref === EARTH) {
      const o = this.orbit(EARTH);
      if (o.bound && o.periapsis > EARTH.atmosphere) this.goal('orbit');
      if (o.bound && o.apoapsis > 1_000_000 && o.periapsis > EARTH.atmosphere) this.goal('high');
      if (this.goals.has('soi') && !this.goals.has('moonland')) this.goal('flyby');
    } else if (ref === SUN) {
      this.goal('escape');
      const [sx, sy] = bodyState(SUN, this.t);
      if (Math.hypot(this.x - sx, this.y - sy) < VENUS.distance) this.goal('sunclose');
    } else if (ref === VENUS) {
      this.goal('venus');
    } else if (ref === MARS || ref === PHOBOS) {
      this.goal('mars');
      const o = this.orbit(MARS);
      if (o.bound && o.periapsis > MARS.atmosphere && o.apoapsis + MARS.radius < MARS.hill)
        this.goal('marsorbit');
    } else if (ref === JUPITER) {
      this.goal('jupiter');
    }
  }

  /** Neue Ereignisse seit der Kennung `after`. */
  eventsAfter(after: number): FlightEvent[] {
    return this.events.filter((e) => e.id > after);
  }

  // ---------------------------------------------------------------- Trümmer und Teilchen

  private random(): number {
    this.rng = (this.rng * 16807) % 2147483647;
    return this.rng / 2147483647;
  }

  private exhaust(): void {
    const ax = Math.cos(this.angle);
    const ay = Math.sin(this.angle);
    const air = this.air().rho;
    const n = air > 0.01 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const spread = (this.random() - 0.5) * 14;
      this.particles.push({
        x: this.x - ax * 2,
        y: this.y - ay * 2,
        vx: this.vx - ax * 30 - ay * spread,
        vy: this.vy - ay * 30 + ax * spread,
        life: 0,
        max: air > 0.01 ? 2.5 + this.random() * 1.5 : 0.5,
        size: 2.5 + this.random() * 2,
        kind: air > 0.01 ? 'smoke' : 'spark',
      });
    }
    if (this.particles.length > 700) this.particles.splice(0, this.particles.length - 700);
  }

  explode(x: number, y: number, vx: number, vy: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.random() * Math.PI * 2;
      const s = 5 + this.random() * 40;
      this.particles.push({
        x,
        y,
        vx: vx + Math.cos(a) * s,
        vy: vy + Math.sin(a) * s,
        life: 0,
        max: 0.8 + this.random() * 1.8,
        size: 2 + this.random() * 5,
        kind: i % 3 === 0 ? 'smoke' : 'fire',
      });
    }
  }

  private updateParticles(dt: number): void {
    const bx = this.status === 'crashed' ? 0 : this.vx;
    const by = this.status === 'crashed' ? 0 : this.vy;
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.kind === 'smoke' ? 1.2 : 0.4;
      // Teilchen gleichen sich langsam der Rakete bzw. dem Boden an.
      p.vx += (bx - p.vx) * Math.min(1, drag * dt * 0.3);
      p.vy += (by - p.vy) * Math.min(1, drag * dt * 0.3);
    }
    for (let i = this.particles.length - 1; i >= 0; i--)
      if (this.particles[i]!.life > this.particles[i]!.max) this.particles.splice(i, 1);
  }

  private updateDebris(simDt: number): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]!;
      // Trümmer sind nur Kulisse: im schnellen Zeitraffer oder nach einer Stunde verschwinden sie.
      if (simDt > 120 || d.age > 3_600) {
        this.debris.splice(i, 1);
        continue;
      }
      let left = simDt;
      let t = this.t - simDt;
      let gone = false;
      while (left > 1e-9) {
        const dt = Math.min(left, 0.25);
        const [ax, ay] = gravity(d.x, d.y, t);
        d.vx += ax * dt;
        d.vy += ay * dt;
        const rho = airDensity(Math.hypot(d.x, d.y) - EARTH.radius);
        if (rho > 0) {
          const f = 1 / (1 + ((0.5 * rho * 3) / 2000) * Math.hypot(d.vx, d.vy) * dt);
          d.vx *= f;
          d.vy *= f;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        t += dt;
        left -= dt;
        for (const b of BODIES) {
          const [bx, by] = bodyState(b, t);
          if (Math.hypot(d.x - bx, d.y - by) < b.radius) {
            if (simDt < 1) this.explode(d.x, d.y, 0, 0, 25);
            gone = true;
            break;
          }
        }
        if (gone) break;
      }
      d.angle += d.spin * Math.min(simDt, 1);
      d.age += simDt;
      if (gone) this.debris.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- Bahnvorhersage

  /**
   * Sagt die Bahn ohne Schub voraus – mit allen Körpern, also als echte Mehrkörperbahn.
   * Nahe anderer Körper weicht sie deshalb von einer Ellipse ab (Vorbeiflug, Einfang).
   */
  predict(maxPoints = 3000): Prediction {
    const xs = new Float64Array(maxPoints);
    const ys = new Float64Array(maxPoints);
    const ts = new Float64Array(maxPoints);
    const ref = this.refBody();
    const o = this.orbit(ref);
    const YEAR = 2 * Math.PI * Math.sqrt(EARTH.distance ** 3 / SUN.mu);
    let horizon: number;
    if (o.bound) horizon = Math.min(1.02 * o.period, 3 * YEAR);
    else if (ref !== SUN) {
      // Auf Fluchtbahn: so weit rechnen, wie die neue Bahn um die Sonne (bzw. den Planeten) dauert.
      const parent = ref.parent ? BODIES.find((b) => b.id === ref.parent)! : SUN;
      const po = this.orbit(parent);
      horizon = po.bound ? Math.min(1.02 * po.period, 3 * YEAR) : YEAR;
      if (ref === EARTH || ref === MOON) horizon = Math.max(horizon, 12 * 86_400);
    } else horizon = 3 * YEAR;
    let { x, y, vx, vy, t } = this;
    const t0 = t;
    let n = 0;
    let impact: Body | null = null;
    let encounter: Encounter | null = null;
    let closest: Prediction['closest'] = null;
    const push = (): void => {
      xs[n] = x;
      ys[n] = y;
      ts[n] = t;
      n++;
    };
    push();
    if (this.status !== 'flying') {
      return {
        xs,
        ys,
        ts,
        n,
        ref,
        impact: null,
        encounter: null,
        closest: null,
        low: -1,
        high: -1,
      };
    }
    const others = BODIES.filter((b) => b !== ref && b.id !== ref.parent && b !== SUN);
    const inside = new Map<Body, boolean>();
    for (const b of others) {
      const [bx, by] = bodyState(b, t);
      inside.set(b, Math.hypot(x - bx, y - by) < b.hill);
    }
    let minStation = Infinity;
    while (n < maxPoints && t - t0 < horizon) {
      let tau = Infinity;
      for (const b of BODIES) {
        const [bx, by] = bodyState(b, t);
        tau = Math.min(tau, Math.sqrt(Math.hypot(x - bx, y - by) ** 3 / b.mu));
      }
      const dt = Math.max(0.05, 0.02 * tau);
      const [a1x, a1y] = gravity(x, y, t);
      const [a2x, a2y] = gravity(x + (vx * dt) / 2, y + (vy * dt) / 2, t + dt / 2);
      const v2x = vx + (a1x * dt) / 2;
      const v2y = vy + (a1y * dt) / 2;
      const [a3x, a3y] = gravity(x + (v2x * dt) / 2, y + (v2y * dt) / 2, t + dt / 2);
      const v3x = vx + (a2x * dt) / 2;
      const v3y = vy + (a2y * dt) / 2;
      const [a4x, a4y] = gravity(x + v3x * dt, y + v3y * dt, t + dt);
      const v4x = vx + a3x * dt;
      const v4y = vy + a3y * dt;
      x += (dt / 6) * (vx + 2 * v2x + 2 * v3x + v4x);
      y += (dt / 6) * (vy + 2 * v2y + 2 * v3y + v4y);
      vx += (dt / 6) * (a1x + 2 * a2x + 2 * a3x + a4x);
      vy += (dt / 6) * (a1y + 2 * a2y + 2 * a3y + a4y);
      t += dt;
      push();
      for (const b of BODIES) {
        const [bx, by] = bodyState(b, t);
        if (Math.hypot(x - bx, y - by) < b.radius) impact = b;
      }
      if (impact) break;
      for (const b of others) {
        const [bx, by] = bodyState(b, t);
        const d = Math.hypot(x - bx, y - by);
        const was = inside.get(b)!;
        const now = d < b.hill;
        if (now && !was && !encounter)
          encounter = { body: b, t, distance: d, index: n - 1, enter: n - 1, exit: n - 1 };
        if (encounter?.body === b && now) {
          encounter.exit = n - 1;
          if (d < encounter.distance) {
            encounter.distance = d;
            encounter.t = t;
            encounter.index = n - 1;
          }
        }
        inside.set(b, now);
      }
      if (this.target === 'station') {
        const [sx, sy] = stationState(t);
        const d = Math.hypot(x - sx, y - sy);
        if (d < minStation) {
          minStation = d;
          closest = { t, distance: d, index: n - 1 };
        }
      }
    }
    // Tiefster und höchster Punkt relativ zum Bezugskörper, solange die Bahn in seiner Hill-Sphäre bleibt.
    let low = -1;
    let high = -1;
    let lowD = Infinity;
    let highD = -Infinity;
    let last = n;
    for (let i = 1; i < n; i++) {
      const [cx, cy] = bodyState(ref, ts[i]!);
      const d = Math.hypot(xs[i]! - cx, ys[i]! - cy);
      if (d > ref.hill) {
        last = i;
        break;
      }
      if (d < lowD) {
        lowD = d;
        low = i;
      }
      if (d > highD) {
        highD = d;
        high = i;
      }
    }
    // Nur echte Extrempunkte (nicht Anfang oder Ende der Vorhersage) markieren.
    if (low >= last - 2 && !impact) low = -1;
    if (impact && low === n - 1) low = -1;
    if (high >= last - 2) high = -1;
    return { xs, ys, ts, n, ref, impact, encounter, closest, low, high };
  }
}

function airDensity(altitude: number): number {
  return densityAt(EARTH, altitude);
}
