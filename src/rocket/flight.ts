import { part, segments, type Design } from './parts';
import {
  EARTH,
  G0,
  MOON,
  MOON_DISTANCE,
  MOON_HILL,
  airDensity,
  gravity,
  moonAngle,
  moonPosition,
  moonVelocity,
  orbitAround,
  type Body,
  type Orbit,
} from './world';

/** Stufen der Zeitraffer-Anzeige. */
export const WARPS = [1, 2, 4, 10, 50, 100, 500, 1000, 5000, 10_000, 50_000] as const;
/** Höchster Zeitraffer bei laufendem Triebwerk, in der Atmosphäre oder dicht über dem Boden. */
const WARP_LIMITED = 4;

export type GoalId =
  | 'lift'
  | 'km10'
  | 'space'
  | 'orbit'
  | 'soi'
  | 'moonorbit'
  | 'moonland'
  | 'return'
  | 'high'
  | 'flyby'
  | 'soft'
  | 'escape';

export const GOALS: readonly { id: GoalId; title: string; text: string }[] = [
  { id: 'lift', title: 'Abheben', text: 'Die Rakete verlässt die Startrampe.' },
  { id: 'km10', title: '10 km Höhe', text: 'Höher als jedes Verkehrsflugzeug.' },
  { id: 'space', title: 'Weltraum', text: 'Über 40 km: Hier endet die Atmosphäre im Spiel.' },
  {
    id: 'orbit',
    title: 'Umlaufbahn',
    text: 'Der tiefste Bahnpunkt liegt über der Atmosphäre – die Rakete fällt ständig um die Erde herum.',
  },
  {
    id: 'soi',
    title: 'Hill-Sphäre des Mondes',
    text: 'Ab hier zieht der Mond stärker an der Bahn als die Erde (Kapitel 5).',
  },
  { id: 'moonorbit', title: 'Mondumlaufbahn', text: 'Vom Mond eingefangen.' },
  { id: 'moonland', title: 'Mondlandung', text: 'Sanft auf dem Mond aufgesetzt.' },
  { id: 'return', title: 'Heimkehr', text: 'Vom Mond zurück und sicher auf der Erde gelandet.' },
  {
    id: 'high',
    title: 'Hohe Bahn',
    text: 'Eine geschlossene Erdbahn, deren höchster Punkt über 1.000 km liegt.',
  },
  {
    id: 'flyby',
    title: 'Mondvorbeiflug',
    text: 'Durch die Hill-Sphäre des Mondes und wieder hinaus – der Mond lenkt die Bahn um wie ein Katapult.',
  },
  { id: 'soft', title: 'Butterweich', text: 'Eine Landung mit weniger als 2 m/s.' },
  {
    id: 'escape',
    title: 'Flucht aus dem System',
    text: 'Weit jenseits der Mondbahn und nicht mehr an die Erde gebunden – genau das, was einem Mond bei zu viel Tempo passiert (Problemfrage).',
  },
];

export type FlightStatus = 'landed' | 'flying' | 'crashed';
export type ChuteState = 'none' | 'stowed' | 'armed' | 'open';

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

export interface Prediction {
  /** Positionen im Erdsystem und zugehörige Zeiten. */
  xs: Float64Array;
  ys: Float64Array;
  ts: Float64Array;
  n: number;
  /** Bezugskörper für die Darstellung (Bahn relativ zur Erde oder zum Mond). */
  ref: 'earth' | 'moon';
  /** Endet die Bahn auf einer Oberfläche? */
  impact: Body | null;
  /** Nächste Annäherung an den Mond (nur beim Flug von der Erde aus). */
  encounter: { t: number; distance: number; index: number } | null;
  /** Indizes von tiefstem und höchstem Punkt relativ zum Bezugskörper (-1 = keiner). */
  low: number;
  high: number;
}

const TURN_RATE = 1.1;
const TURN_ACCEL = 3.5;
const ROCKET_CDA = 4;
const CHUTE_CDA = 900;
const CHUTE_MAX_SPEED = 300;
const CHUTE_ALTITUDE = 12_000;
const LAND_SPEED = 8;
const LAND_SPEED_LEGS = 14;
const LAND_TILT = 0.4;
const LAND_TILT_LEGS = 0.65;

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

let eventId = 1;

/**
 * Ein Raketenflug. Die Rakete ist ein Massenpunkt mit Ausrichtung; ihr Ort ist die Unterkante
 * (für die Landung). Gerechnet wird mit Runge-Kutta 4 in der Schwerkraft von Erde und Mond,
 * dazu Schub, Treibstoffverbrauch und Luftwiderstand.
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
  /** Fester Winkel des Landeplatzes auf dem Mond (relativ zur Mondbahnposition). */
  private landAngle = Math.PI / 2;
  private emptyWarned = false;
  private rng = 1;

  constructor(design: Design) {
    this.design = [...design];
    this.segs = segments(design).map((parts) => ({
      parts,
      fuel: parts.reduce((s, id) => s + part(id).fuel, 0),
    }));
    this.chute = design.includes('fallschirm') ? 'stowed' : 'none';
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

  moon(): { x: number; y: number; vx: number; vy: number } {
    const [x, y] = moonPosition(this.t);
    const [vx, vy] = moonVelocity(this.t);
    return { x, y, vx, vy };
  }

  /** Bezugskörper: der Mond innerhalb seiner Hill-Sphäre, sonst die Erde. */
  refBody(): Body {
    const m = this.moon();
    return Math.hypot(this.x - m.x, this.y - m.y) < MOON_HILL ? MOON : EARTH;
  }

  /** Lage relativ zu einem Körper: Ort, Geschwindigkeit, Höhe. */
  relative(body: Body = this.refBody()) {
    const c = body === MOON ? this.moon() : { x: 0, y: 0, vx: 0, vy: 0 };
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

  /** Größter erlaubter Zeitraffer in der momentanen Lage. */
  maxWarpIndex(): number {
    if (this.status === 'crashed') return 0;
    if (this.status === 'landed') return this.thrusting ? 0 : WARPS.length - 1;
    const limited = WARPS.indexOf(WARP_LIMITED);
    if (this.thrusting) return limited;
    // Ohne Schub bleibt die Rechnung auch nahe am Boden genau (kleine Schritte), deshalb darf
    // die Zeit dort schneller laufen – etwa beim Sinken am Fallschirm.
    const rel = this.relative();
    if (rel.altitude < 3_000) return WARPS.indexOf(10);
    if (rel.altitude < 30_000 || (rel.body === EARTH && rel.altitude < EARTH.atmosphere))
      return WARPS.indexOf(50);
    return WARPS.length - 1;
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
        'Fallschirm scharf – er öffnet sich unter 12 km Höhe, sobald die Rakete langsamer als 300 m/s ist.',
      );
    }
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
    while (remaining > 1e-9 && this.status !== 'crashed' && guard++ < 20_000) {
      remaining -= this.substep(remaining);
    }
    this.updateDebris(realDt * this.warp);
    this.updateParticles(realDt);
    if (this.status !== 'crashed' && this.thrusting && this.warp <= WARP_LIMITED) this.exhaust();
    this.checkGoals();
  }

  private substep(maxDt: number): number {
    const { thrust, flow } = this.engine();
    const burning = this.throttle > 0 && this.active.fuel > 0 && thrust > 0;
    const m = this.moon();

    if (this.status === 'landed') {
      const body = this.landedOn!;
      const local = body === MOON ? this.moonAngleNow() + this.landAngle : this.landAngle;
      const g = body.mu / body.radius ** 2;
      const accel = burning ? (thrust * this.throttle) / this.mass : 0;
      if (accel > g * 1.02) {
        this.status = 'flying';
        this.landedOn = null;
      } else {
        const dt = Math.min(maxDt, burning ? 0.02 : maxDt);
        if (burning) this.burn(flow * this.throttle * dt);
        this.t += dt;
        const c = body === MOON ? this.moon() : { x: 0, y: 0, vx: 0, vy: 0 };
        this.x = c.x + body.radius * Math.cos(local);
        this.y = c.y + body.radius * Math.sin(local);
        this.vx = c.vx;
        this.vy = c.vy;
        this.angle = local;
        return dt;
      }
    }

    const r = Math.hypot(this.x, this.y);
    const dMoon = Math.hypot(this.x - m.x, this.y - m.y);
    const hEarth = r - EARTH.radius;
    const hMoon = dMoon - MOON.radius;
    const speed = Math.hypot(this.vx, this.vy);
    const relSpeedMoon = Math.hypot(this.vx - m.vx, this.vy - m.vy);
    let dt = 0.01 * Math.min(Math.sqrt(r ** 3 / EARTH.mu), Math.sqrt(dMoon ** 3 / MOON.mu));
    if (burning || hEarth < EARTH.atmosphere) dt = Math.min(dt, 0.02);
    // Nahe einer Oberfläche kleine Schritte, damit keine Landung übersprungen wird.
    dt = Math.min(dt, Math.max(0.02, hEarth / (3 * speed + 1e-9)));
    dt = Math.min(dt, Math.max(0.02, hMoon / (3 * relSpeedMoon + 1e-9)));
    dt = Math.min(dt, maxDt);

    const mass = this.mass;
    const ta = burning ? (thrust * this.throttle) / mass : 0;
    const tx = ta * Math.cos(this.angle);
    const ty = ta * Math.sin(this.angle);
    this.rk4(dt, tx, ty);

    // Luftwiderstand implizit (stabil auch bei offenem Fallschirm).
    const h = Math.hypot(this.x, this.y) - EARTH.radius;
    const rho = airDensity(h);
    if (
      this.chute === 'armed' &&
      h < CHUTE_ALTITUDE &&
      Math.hypot(this.vx, this.vy) < CHUTE_MAX_SPEED
    ) {
      this.chute = 'open';
      this.emit('info', 'Fallschirm offen!');
    }
    if (this.chute === 'open') this.chuteOpen = Math.min(1, this.chuteOpen + dt / 2.5);
    if (rho > 0) {
      const cda = ROCKET_CDA + (this.chute === 'open' ? CHUTE_CDA * this.chuteOpen : 0);
      const k = (0.5 * rho * cda) / mass;
      const v = Math.hypot(this.vx, this.vy);
      const f = 1 / (1 + k * v * dt);
      this.vx *= f;
      this.vy *= f;
    }
    if (burning) this.burn(flow * this.throttle * dt);

    this.checkContact();
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

  private moonAngleNow(): number {
    return moonAngle(this.t);
  }

  private checkContact(): void {
    if (this.altitudeEarth < 0) {
      this.touchdown(EARTH, { x: 0, y: 0, vx: 0, vy: 0 });
      return;
    }
    const m = this.moon();
    if (Math.hypot(this.x - m.x, this.y - m.y) < MOON.radius) this.touchdown(MOON, m);
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
    if (speed <= speedLimit && tilt <= tiltLimit) {
      this.status = 'landed';
      this.landedOn = body;
      this.landAngle = body === MOON ? up - this.moonAngleNow() : up;
      this.vx = c.vx;
      this.vy = c.vy;
      this.angle = up;
      this.angVel = 0;
      this.warpIndex = 0;
      if (speed < 2) this.goal('soft');
      if (body === MOON) {
        this.goal('moonland');
      } else if (this.goals.has('moonland')) {
        this.goal('return');
      } else {
        this.emit('info', `Gelandet mit ${speed.toFixed(1)} m/s. Gut gemacht!`);
      }
      return;
    }
    this.status = 'crashed';
    this.warpIndex = 0;
    this.throttle = 0;
    this.crashReason =
      speed > speedLimit
        ? `Aufprall mit ${Math.round(speed)} m/s – sicher sind höchstens ${speedLimit} m/s${legs ? '' : ' (mit Landebeinen 14 m/s)'}.`
        : `Zu schräg aufgesetzt (${Math.round((tilt * 180) / Math.PI)}°). Die Rakete ist umgekippt.`;
    this.explode(this.x, this.y, c.vx, c.vy, 70);
    this.emit('fail', this.crashReason);
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
    this.emit('goal', `${g.title}! ${g.text}`);
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
    if (ref === MOON) {
      this.goal('soi');
      const o = this.orbit(MOON);
      if (o.bound && o.periapsis > 2_000 && o.apoapsis + MOON.radius < MOON_HILL)
        this.goal('moonorbit');
    } else {
      const o = this.orbit(EARTH);
      if (o.bound && o.periapsis > EARTH.atmosphere) this.goal('orbit');
      if (o.bound && o.apoapsis > 1_000_000 && o.periapsis > EARTH.atmosphere) this.goal('high');
      if (this.goals.has('soi') && !this.goals.has('moonland')) this.goal('flyby');
      if (!o.bound && Math.hypot(this.x, this.y) > 2 * MOON_DISTANCE) this.goal('escape');
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
    const air = airDensity(this.altitudeEarth);
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
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.kind === 'smoke' ? 1.2 : 0.4;
      // Teilchen gleichen sich langsam der Rakete bzw. dem Boden an.
      const bx = this.status === 'crashed' ? 0 : this.vx;
      const by = this.status === 'crashed' ? 0 : this.vy;
      p.vx += (bx - p.vx) * Math.min(1, drag * dt * 0.3);
      p.vy += (by - p.vy) * Math.min(1, drag * dt * 0.3);
    }
    for (let i = this.particles.length - 1; i >= 0; i--)
      if (this.particles[i]!.life > this.particles[i]!.max) this.particles.splice(i, 1);
  }

  private updateDebris(simDt: number): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]!;
      let left = simDt;
      let t = this.t - simDt;
      let gone = false;
      while (left > 1e-9) {
        const r = Math.hypot(d.x, d.y);
        const dt = Math.min(left, Math.max(0.02, 0.02 * Math.sqrt(r ** 3 / EARTH.mu)), 5);
        const [ax, ay] = gravity(d.x, d.y, t);
        d.vx += ax * dt;
        d.vy += ay * dt;
        const rho = airDensity(r - EARTH.radius);
        if (rho > 0) {
          const f = 1 / (1 + ((0.5 * rho * 3) / 2000) * Math.hypot(d.vx, d.vy) * dt);
          d.vx *= f;
          d.vy *= f;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        t += dt;
        left -= dt;
        const [mx, my] = moonPosition(t);
        if (Math.hypot(d.x, d.y) < EARTH.radius || Math.hypot(d.x - mx, d.y - my) < MOON.radius) {
          if (simDt < 1) this.explode(d.x, d.y, 0, 0, 25);
          gone = true;
          break;
        }
      }
      d.angle += d.spin * Math.min(simDt, 1);
      d.age += simDt;
      if (gone || d.age > 86_400 || Math.hypot(d.x, d.y) > 3 * MOON_DISTANCE)
        this.debris.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- Bahnvorhersage

  /**
   * Sagt die Bahn ohne Schub voraus – mit Erde und Mond, also als echte Drei-Körper-Bahn.
   * Nahe dem Mond kann sie deshalb von einer Ellipse abweichen.
   */
  predict(maxPoints = 2400): Prediction {
    const xs = new Float64Array(maxPoints);
    const ys = new Float64Array(maxPoints);
    const ts = new Float64Array(maxPoints);
    const refBody = this.refBody();
    const ref = refBody === MOON ? 'moon' : 'earth';
    const o = this.orbit(refBody);
    let horizon = 12 * 86_400;
    if (o.bound) horizon = Math.min(horizon, 1.02 * o.period);
    let { x, y, vx, vy, t } = this;
    const t0 = t;
    let n = 0;
    let impact: Body | null = null;
    let encounter: Prediction['encounter'] = null;
    const push = (): void => {
      xs[n] = x;
      ys[n] = y;
      ts[n] = t;
      n++;
    };
    push();
    if (this.status === 'landed') {
      return { xs, ys, ts, n, ref, impact: null, encounter: null, low: -1, high: -1 };
    }
    let minMoon = Infinity;
    while (n < maxPoints && t - t0 < horizon) {
      const r = Math.hypot(x, y);
      const [mx, my] = moonPosition(t);
      const dm = Math.hypot(x - mx, y - my);
      let dt = 0.02 * Math.min(Math.sqrt(r ** 3 / EARTH.mu), Math.sqrt(dm ** 3 / MOON.mu));
      dt = Math.max(0.05, dt);
      // RK4
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
      if (Math.hypot(x, y) < EARTH.radius) {
        impact = EARTH;
        break;
      }
      const [nx, ny] = moonPosition(t);
      const d = Math.hypot(x - nx, y - ny);
      if (d < MOON.radius) {
        impact = MOON;
        break;
      }
      if (ref === 'earth' && d < minMoon) {
        minMoon = d;
        if (d < MOON_HILL) encounter = { t, distance: d, index: n - 1 };
      }
    }
    // Tiefster und höchster Punkt relativ zum Bezugskörper.
    let low = -1;
    let high = -1;
    let lowD = Infinity;
    let highD = -Infinity;
    for (let i = 1; i < n; i++) {
      let cx = 0;
      let cy = 0;
      if (ref === 'moon') [cx, cy] = moonPosition(ts[i]!);
      const d = Math.hypot(xs[i]! - cx, ys[i]! - cy);
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
    if (low >= n - 2 && !impact) low = -1;
    if (impact && low === n - 1) low = -1;
    if (high >= n - 2) high = -1;
    return { xs, ys, ts, n, ref, impact, encounter, low, high };
  }
}
