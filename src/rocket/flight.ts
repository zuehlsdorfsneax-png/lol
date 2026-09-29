import { fmt } from './format';
import { goalById, type GoalId } from './goals';
import {
  CIRCULAR_E,
  elements,
  stateAt,
  timeToApoapsis,
  timeToPeriapsis,
  timeToRadius,
  type Elements,
} from './kepler';
import { part, segments, type Design, type PartDef } from './parts';
import {
  BODIES,
  EARTH,
  EUROPA,
  G0,
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
  forms,
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

export {
  GOALS,
  RANKS,
  careerPoints,
  goalPoints,
  rankFor,
  type GoalDef,
  type GoalId,
} from './goals';

/** Stufen der Zeitraffer-Anzeige. */
export const WARPS = [
  1, 2, 4, 10, 50, 100, 500, 1000, 5000, 10_000, 50_000, 200_000, 1_000_000, 5_000_000,
] as const;
/** Höchster Zeitraffer bei laufendem Triebwerk, in der Atmosphäre oder dicht über dem Boden. */
const WARP_LIMITED = 4;

export type FlightStatus = 'landed' | 'flying' | 'crashed' | 'docked';
export type ChuteState = 'none' | 'stowed' | 'armed' | 'open';
export type TargetId = 'station' | BodyId;

/**
 * Lageregelung (SAS): Die Rakete hält selbst eine Richtung – in Flugrichtung (prograd), dagegen
 * (retrograd), vom Körper weg oder zu ihm hin (radial), zum Ziel, auf das geplante Manöver oder
 * in eine angetippte Richtung.
 */
export type SasMode =
  | 'off'
  | 'prograde'
  | 'retrograde'
  | 'radialOut'
  | 'radialIn'
  | 'target'
  | 'antiTarget'
  | 'maneuver'
  | 'point';

/** Geplantes Manöver: ein Schub zu einer bestimmten Zeit, zerlegt in Flugrichtung und radial. */
export interface ManeuverNode {
  t: number;
  /** Δv in Flugrichtung und nach außen (m/s). */
  prograde: number;
  radial: number;
  /** Schubvektor zur Manöverzeit in Weltkoordinaten (für die Vorhersage). */
  dx: number;
  dy: number;
  /**
   * Schon erbrachtes Δv während des Brennens, in Flugrichtung und radial. Gezählt wird im
   * mitlaufenden Bezugssystem: Die Rakete folgt beim Brennen der Flugrichtung, so geht bei
   * langen Brennphasen keine Energie verloren.
   */
  doneP: number;
  doneR: number;
  /** Brennen hat begonnen: Das Manöver lässt sich nicht mehr ändern. */
  frozen: boolean;
  /**
   * Bahnenergie nach dem Manöver (J/kg relativ zu `ref`). Bei Schüben fast nur in Flugrichtung
   * wird gebrannt, bis sie erreicht ist – so gleicht der Computer Verluste langer Brennphasen aus.
   */
  energy: number | null;
  ref: BodyId;
  /** Zwischengespeicherter Zustand zur Manöverzeit (ohne Schub). */
  at: [number, number, number, number] | null;
}

/** Ein ausgesetzter Satellit auf seiner Kepler-Bahn. */
export interface Satellite {
  id: number;
  name: string;
  body: BodyId;
  el: Elements;
  /** Im Sandkasten ausgesetzt: zählt nicht für Ziele und erscheint nur im Sandkasten. */
  sandbox?: boolean;
}

/** Landeplatz auf einem Körper (Winkel mitdrehend wie die Oberfläche). */
export interface LandingSite {
  body: BodyId;
  angle: number;
  name: string;
}

export interface FlightStats {
  maxSpeed: number;
  maxG: number;
  dvUsed: number;
  distance: number;
  burnSeconds: number;
  /** Zeitpunkt des Abhebens (null = noch nicht gestartet). */
  liftoff: number | null;
  landings: number;
  /** Letzte Landung: Körper, Tempo beim Aufsetzen, Zeit. */
  lastLanding: { body: BodyId; speed: number; t: number } | null;
}

/** Gespeicherter Spielstand eines Flugs (Schnellspeichern). */
export interface FlightSnapshot {
  v: 1 | 2 | 3;
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
  sas?: SasMode;
  sasAngle?: number;
  node?: ManeuverNode | null;
  satellites?: Satellite[];
  stats?: FlightStats;
  maxHeat?: number;
  site?: LandingSite | null;
  /** Aus dem Sandkasten: bringt auch nach dem Laden keine Punkte. */
  sandbox?: boolean;
  /** Wann gespeichert wurde (ms seit 1970). */
  savedAt?: number;
  airbrakes?: boolean;
  // Ab Version 3: alles, was sonst beim Laden verloren ginge.
  heat?: number;
  angVel?: number;
  rcs?: boolean;
  fine?: boolean;
  visited?: BodyId[];
  hopHeight?: number;
  rules?: {
    infiniteFuel: boolean;
    indestructible: boolean;
    heatOn: boolean;
    dragOn: boolean;
    thrustScale: number;
  };
}

export interface FlightEvent {
  id: number;
  kind: 'goal' | 'info' | 'warn' | 'fail';
  /** Kurze Überschrift (bei Zielen: Titel und Punkte). */
  title?: string;
  text: string;
  /** Bei Zielen: welches Ziel. */
  goal?: GoalId;
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
  kind: 'smoke' | 'fire' | 'spark' | 'dust';
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
  /** Geschwindigkeiten (für Bahnelemente an jedem Punkt). */
  vxs: Float64Array;
  vys: Float64Array;
  ts: Float64Array;
  n: number;
  /** Bezugskörper für die Darstellung. */
  ref: Body;
  /** Endet die Bahn auf einer Oberfläche? */
  impact: Body | null;
  /** Erste Begegnung mit einem anderen Körper. */
  encounter: Encounter | null;
  /** Nächste Annäherung an das Ziel (Station: Abstand, Körper: Höhe über dem Boden). */
  closest: { t: number; distance: number; index: number } | null;
  /** Indizes von tiefstem und höchstem Punkt relativ zum Bezugskörper (-1 = keiner). */
  low: number;
  high: number;
  /**
   * Manöver: letzter Punkt vor dem Manöver und erster danach (dazwischen kann eine Lücke liegen,
   * wenn das Manöver weit in der Zukunft liegt). -1 = kein Manöver in der Vorhersage.
   */
  preEnd: number;
  nodeIndex: number;
  nodeRef: Body | null;
  /** Tiefster und höchster Punkt der geplanten Bahn nach dem Manöver. */
  planLow: number;
  planHigh: number;
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
/** Zusätzliche Bremsfläche (m²) je ausgefahrener Luftbremse. */
const AIRBRAKE_CDA = 30;
/** Schubverlust eines Vakuumtriebwerks auf Meereshöhe der Erde. */
const VACUUM_LOSS = 0.55;
/** Luftdichte, ab der ein Vakuumtriebwerk den vollen Verlust hat (kg/m³). */
const SEA_RHO = 1.2;
const DOCK_DISTANCE = 20;
/**
 * Hitze nach Sutton-Graves (∝ √ρ·v³). Kalibriert: Rückkehr vom Mond mit Pe um 20 km erreicht
 * etwa 55 %, ein senkrechter Sturz mit 4,5 km/s verglüht.
 */
const HEAT_SCALE = 4.2e10;
const HEAT_COOLING = 0.08;
/** Anteil der Hitze, der mit dem Hitzeschild voran noch ankommt. */
const SHIELD_FACTOR = 0.25;
const DOCK_SPEED = 2;
const YEAR = 2 * Math.PI * Math.sqrt(EARTH.distance ** 3 / SUN.mu);
/** Höchstens so viele Satelliten bleiben gespeichert. */
export const MAX_SATELLITES = 24;

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Monde drehen sich gebunden mit ihrer Bahn (zeigen dem Planeten immer dieselbe Seite). */
export function bodySpin(b: Body, t: number): number {
  return b.parent && b.parent !== 'sun' ? orbitAngle(b, t) : 0;
}

/** Ort eines Satelliten zur Zeit t (Weltkoordinaten). */
export function satelliteState(s: Satellite, t: number): [number, number, number, number] {
  const [bx, by, bvx, bvy] = bodyState(bodyById(s.body), t);
  const [x, y, vx, vy] = stateAt(s.el, t);
  return [bx + x, by + y, bvx + vx, bvy + vy];
}

/** Tiefster und höchster Abstand zum Mittelpunkt einer Kepler-Bahn. */
export function apsides(el: Elements): { peri: number; apo: number } {
  return { peri: el.p / (1 + el.e), apo: el.e < 1 ? el.p / (1 - el.e) : Infinity };
}

interface Coast {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

/** Schrittweite der Bahnvorhersage: Bruchteil der kürzesten Umlaufzeitskala. */
function coastDt(x: number, y: number, t: number): number {
  let tau = Infinity;
  for (const b of BODIES) {
    const [bx, by] = bodyState(b, t);
    tau = Math.min(tau, Math.sqrt(Math.hypot(x - bx, y - by) ** 3 / b.mu));
  }
  return Math.max(0.05, 0.02 * tau);
}

/** Ein Runge-Kutta-Schritt ohne Schub. */
function coastStep(s: Coast, dt: number): void {
  const { x, y, vx, vy, t } = s;
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
  s.x = x + (dt / 6) * (vx + 2 * v2x + 2 * v3x + v4x);
  s.y = y + (dt / 6) * (vy + 2 * v2y + 2 * v3y + v4y);
  s.vx = vx + (dt / 6) * (a1x + 2 * a2x + 2 * a3x + a4x);
  s.vy = vy + (dt / 6) * (a1y + 2 * a2y + 2 * a3y + a4y);
  s.t = t + dt;
}

/** Freier Flug bis `until` (ohne Schub). false, wenn die Schrittgrenze oder ein Körper stört. */
function coastTo(s: Coast, until: number, maxSteps: number): boolean {
  for (let i = 0; i < maxSteps && s.t < until - 1e-9; i++) {
    coastStep(s, Math.min(coastDt(s.x, s.y, s.t), until - s.t));
    for (const b of BODIES) {
      const [bx, by] = bodyState(b, s.t);
      if (Math.hypot(s.x - bx, s.y - by) < b.radius) return false;
    }
  }
  return s.t >= until - 1e-9;
}

/** Wie weit die Vorhersage von diesem Zustand aus reichen soll. */
function horizonFor(s: Coast): number {
  const ref = dominantBody(s.x, s.y, s.t);
  const [bx, by, bvx, bvy] = bodyState(ref, s.t);
  const o = orbitAround(ref, s.x - bx, s.y - by, s.vx - bvx, s.vy - bvy);
  if (o.bound) return Math.min(1.02 * o.period, 3 * YEAR);
  if (ref === SUN) return 3 * YEAR;
  // Auf Fluchtbahn: so weit rechnen, wie die neue Bahn um den Mutterkörper dauert.
  const parent = ref.parent ? bodyById(ref.parent) : SUN;
  const [px, py, pvx, pvy] = bodyState(parent, s.t);
  const po = orbitAround(parent, s.x - px, s.y - py, s.vx - pvx, s.vy - pvy);
  let h = po.bound ? Math.min(1.02 * po.period, 3 * YEAR) : YEAR;
  if (ref === EARTH || ref === MOON) h = Math.max(h, 12 * 86_400);
  return h;
}

/**
 * Wie stark andere Körper eine Bahn um `ref` mit höchstem Abstand `ra` stören: größte
 * Gezeitenbeschleunigung durch Monde und Mutterkörper im Verhältnis zur Schwerkraft von `ref`.
 */
function tidalRatio(ref: Body, ra: number): number {
  let tidal = 0;
  for (const b of BODIES) {
    if (b.parent !== ref.id) continue;
    const near = Math.max(b.distance - ra, b.radius);
    tidal += b.mu * (1 / (near * near) - 1 / (b.distance * b.distance));
  }
  if (ref.parent) tidal += (2 * bodyById(ref.parent).mu * ra) / ref.distance ** 3;
  return tidal / (ref.mu / (ra * ra));
}

/** Richtungen „prograd“ und „radial nach außen“ relativ zu einem Körper. */
export function nodeFrame(
  b: Body,
  x: number,
  y: number,
  vx: number,
  vy: number,
  t: number,
): [number, number, number, number] {
  const [bx, by, bvx, bvy] = bodyState(b, t);
  const rvx = vx - bvx;
  const rvy = vy - bvy;
  const sp = Math.hypot(rvx, rvy) || 1;
  const px = rvx / sp;
  const py = rvy / sp;
  let qx = -py;
  let qy = px;
  if (qx * (x - bx) + qy * (y - by) < 0) {
    qx = -qx;
    qy = -qy;
  }
  return [px, py, qx, qy];
}

let eventId = 1;
let satSeq = 0;

/** Eindeutige Nummer für einen neuen Satelliten (auch über mehrere Sitzungen hinweg). */
function newSatId(): number {
  satSeq = (satSeq + 1) % 1000;
  return Date.now() * 1000 + satSeq;
}

/** Schubvektor eines Manövers für einen Zustand zur Manöverzeit (verändert nichts). */
function nodeDelta(
  n: ManeuverNode,
  x: number,
  y: number,
  vx: number,
  vy: number,
): { dx: number; dy: number; body: Body } {
  const body = dominantBody(x, y, n.t);
  const [px, py, qx, qy] = nodeFrame(body, x, y, vx, vy, n.t);
  return { dx: n.prograde * px + n.radial * qx, dy: n.prograde * py + n.radial * qy, body };
}

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
  /** Feinsteuerung: langsamer drehen (für genaues Ausrichten). */
  fine = false;
  /** Lagekontrolldüsen an? Dann verschieben `translate` die Rakete sanft. */
  rcs = false;
  /** RCS-Eingabe: x = nach rechts, y = nach vorn (je −1 … 1). */
  translate = { x: 0, y: 0 };
  sas: SasMode = 'off';
  /** Richtung für SAS „Zeigen“ (Weltwinkel). */
  sasAngle = Math.PI / 2;
  node: ManeuverNode | null = null;
  /** Zeitsprung: bis zu diesem Zeitpunkt automatisch vorspulen. */
  warpTarget: number | null = null;
  target: TargetId | null = null;
  /** Landeplatz einer Herausforderung (wird auf Karte und Boden markiert). */
  site: LandingSite | null = null;
  /** Sandkasten: es gibt keine Punkte; die Regeln darunter lassen sich einzeln schalten. */
  sandbox = false;
  /** Treibstoff wird nicht verbraucht. */
  infiniteFuel = false;
  /** Keine Abstürze und kein Verglühen: jede Berührung ist eine Landung. */
  indestructible = false;
  /** Hitze beim Wiedereintritt. */
  heatOn = true;
  /** Luftwiderstand der Rakete (Fallschirme wirken immer). */
  dragOn = true;
  /** Schub aller Triebwerke mal diesem Faktor (der Verbrauch wächst mit). */
  thrustScale = 1;
  /** Luftbremsen ausgefahren? */
  airbrakes = false;
  /** Luftdichte beim letzten Schritt im Verhältnis zur Erde auf Meereshöhe (0…1). */
  private pressure = 0;
  /** Größte Höhe über dem nächsten Körper seit dem letzten Abheben (für „Butterweich“). */
  private hopHeight = 0;
  /** Zuletzt gemeldet, dass die Rakete an einer Gashülle abgeprallt ist (Sandkasten). */
  private bounceNote = -Infinity;
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
  /** Alle Satelliten (auch die aus früheren Flügen). */
  satellites: Satellite[] = [];
  readonly stats: FlightStats = {
    maxSpeed: 0,
    maxG: 0,
    dvUsed: 0,
    distance: 0,
    burnSeconds: 0,
    liftoff: null,
    landings: 0,
    lastLanding: null,
  };
  /** Momentane Belastung in g (ohne Schwerkraft: Schub, Luftwiderstand). */
  gForce = 0;
  /** Effekte für die Darstellung: Wackeln und Lichtblitz (0…1, klingen ab). */
  shake = 0;
  flash = 0;
  maxHeat = 0;
  maxAltitude = 0;
  /** Hitze durch Luftreibung: 0 = kalt, 1 = zerstört. */
  heat = 0;
  /** Schützt der Hitzeschild gerade? */
  shielded = false;
  crashReason = '';
  readonly design: Design;
  /** Welche Körper die Rakete besucht hat (Hill-Sphäre). */
  readonly visited = new Set<BodyId>();
  /** Winkel des Landeplatzes auf dem Körper (bei Monden relativ zur Drehung). */
  private landAngle = Math.PI / 2;
  private emptyWarned = false;
  private rng = 1;

  constructor(design: Design) {
    this.design = [...design];
    this.segs = segments(design).map((parts) => ({
      parts,
      fuel: parts.reduce((s, id) => s + part(id).fuel, 0),
    }));
    this.chute = design.some((id) => part(id).kind === 'chute') ? 'stowed' : 'none';
  }

  // ---------------------------------------------------------------- Spielstand

  snapshot(): FlightSnapshot | null {
    if (this.status === 'crashed') return null;
    return {
      v: 3,
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
      sas: this.sas,
      sasAngle: this.sasAngle,
      node: this.node ? { ...this.node, at: this.node.at ? [...this.node.at] : null } : null,
      satellites: this.satellites.map((s) => ({ ...s, el: { ...s.el } })),
      stats: { ...this.stats },
      maxHeat: this.maxHeat,
      site: this.site,
      sandbox: this.sandbox,
      airbrakes: this.airbrakes,
      heat: this.heat,
      angVel: this.angVel,
      rcs: this.rcs,
      fine: this.fine,
      visited: [...this.visited],
      hopHeight: this.hopHeight,
      rules: {
        infiniteFuel: this.infiniteFuel,
        indestructible: this.indestructible,
        heatOn: this.heatOn,
        dragOn: this.dragOn,
        thrustScale: this.thrustScale,
      },
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
      sas: s.sas ?? 'off',
      sasAngle: s.sasAngle ?? Math.PI / 2,
      node: s.node ? { ...s.node } : null,
      satellites: (s.satellites ?? []).map((q) => ({ ...q, el: { ...q.el } })),
      maxHeat: s.maxHeat ?? 0,
      site: s.site ?? null,
    });
    if (s.stats) Object.assign(f.stats, s.stats);
    f.segs = s.segs.map((q) => ({ parts: [...q.parts], fuel: q.fuel }));
    f.landedOn = s.landedOn ? bodyById(s.landedOn) : null;
    f.landAngle = s.landAngle;
    for (const g of s.goals) f.goals.add(g);
    f.sandbox = s.sandbox === true;
    f.airbrakes = s.airbrakes === true && f.hasAirbrakes;
    f.heat = Math.min(0.99, Math.max(0, s.heat ?? 0));
    f.angVel = Number.isFinite(s.angVel) ? s.angVel! : 0;
    f.rcs = s.rcs === true;
    f.fine = s.fine === true;
    for (const id of s.visited ?? []) f.visited.add(id);
    f.hopHeight = s.hopHeight ?? 0;
    if (s.rules && f.sandbox) {
      f.infiniteFuel = s.rules.infiniteFuel;
      f.indestructible = s.rules.indestructible;
      f.heatOn = s.rules.heatOn;
      f.dragOn = s.rules.dragOn;
      f.thrustScale = s.rules.thrustScale;
    }
    return f;
  }

  // ---------------------------------------------------------------- Startsituationen

  /** Auf eine Kreisbahn um einen Körper setzen (im Uhrzeigersinn, wie alle Körper). */
  placeInOrbit(body: Body, altitude: number, angle: number): void {
    const [bx, by, bvx, bvy] = bodyState(body, this.t);
    const r = body.radius + altitude;
    const v = Math.sqrt(body.mu / r);
    this.status = 'flying';
    this.landedOn = null;
    this.x = bx + r * Math.cos(angle);
    this.y = by + r * Math.sin(angle);
    this.vx = bvx + v * Math.sin(angle);
    this.vy = bvy - v * Math.cos(angle);
    this.angle = angle - Math.PI / 2;
    this.angVel = 0;
  }

  /** Auf einem Körper landen lassen (Winkel mitdrehend). */
  placeLanded(body: Body, angle: number): void {
    this.status = 'landed';
    this.landedOn = body;
    this.landAngle = angle;
    const [bx, by, bvx, bvy] = bodyState(body, this.t);
    const local = bodySpin(body, this.t) + angle;
    this.x = bx + body.radius * Math.cos(local);
    this.y = by + body.radius * Math.sin(local);
    this.vx = bvx;
    this.vy = bvy;
    this.angle = local;
    this.angVel = 0;
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

  /** Schub (N) und Massenstrom (kg/s) einer Stufe bei Vollgas im Vakuum. */
  private stageEngine(parts: readonly string[]): { thrust: number; flow: number } {
    let thrust = 0;
    let flow = 0;
    for (const id of parts) {
      const p = part(id);
      if (p.thrust > 0) {
        thrust += p.thrust * this.thrustScale;
        flow += (p.thrust * this.thrustScale) / (p.isp * G0);
      }
    }
    return { thrust, flow };
  }

  /**
   * Schub (N) und Massenstrom (kg/s) der aktiven Stufe bei Vollgas. Vakuumtriebwerke verlieren
   * in dichter Luft Schub (der Verbrauch bleibt).
   */
  engine(): { thrust: number; flow: number } {
    let thrust = 0;
    let flow = 0;
    for (const id of this.active.parts) {
      const p = part(id);
      if (p.thrust > 0) {
        const t = p.thrust * this.thrustScale;
        thrust += p.vacuum ? t * (1 - VACUUM_LOSS * this.pressure) : t;
        flow += t / (p.isp * G0);
      }
    }
    return { thrust, flow };
  }

  /** Alle Teile, die noch an der Rakete sind. */
  private allParts(): string[] {
    return this.segs.flatMap((s) => s.parts);
  }

  /** Bremsfläche der Fallschirme im Vergleich zu einem normalen Schirm. */
  get chuteArea(): number {
    return this.allParts().reduce(
      (s, id) => s + (part(id).kind === 'chute' ? (part(id).chuteArea ?? 1) : 0),
      0,
    );
  }

  /** Anzahl eines Bauteiltyps an der Rakete. */
  private count(kind: PartDef['kind']): number {
    return this.allParts().filter((id) => part(id).kind === kind).length;
  }

  get hasAirbrakes(): boolean {
    return this.count('airbrake') > 0;
  }

  /** Sitzt ein Nasenkegel ganz oben? */
  get streamlined(): boolean {
    const top = this.segs[0]?.parts[0];
    return top !== undefined && part(top).kind === 'nose';
  }

  /** Luftbremsen aus- oder einfahren. */
  toggleAirbrakes(): void {
    if (!this.hasAirbrakes) return;
    this.airbrakes = !this.airbrakes;
    this.emit('info', this.airbrakes ? 'Luftbremsen ausgefahren.' : 'Luftbremsen eingefahren.');
  }

  get fuelCapacity(): number {
    return this.active.parts.reduce((s, id) => s + part(id).fuel, 0);
  }

  get hasLegs(): boolean {
    return this.active.parts.includes('beine');
  }

  /** Sitzt der Hitzeschild ganz unten? */
  get shieldAtBottom(): boolean {
    const a = this.active.parts;
    return a[a.length - 1] === 'hitzeschild';
  }

  get satellitesOnBoard(): number {
    return this.segs.reduce((s, seg) => s + seg.parts.filter((id) => id === 'satellit').length, 0);
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
      const { thrust, flow } = this.stageEngine(seg.parts);
      if (thrust > 0 && seg.fuel > 0) dv += (thrust / flow) * Math.log(start / (start - seg.fuel));
      above = start;
    }
    return dv;
  }

  /** Brenndauer bei Vollgas für ein Δv, über die Stufen hinweg (∞ = reicht nicht). */
  burnTime(dv: number): number {
    if (this.infiniteFuel) {
      // Ohne Verbrauch bleibt die Masse gleich: Beschleunigung konstant.
      for (let i = this.segs.length - 1; i >= 0; i--) {
        const { thrust } = this.stageEngine(this.segs[i]!.parts);
        if (thrust > 0) return (dv * this.mass) / thrust;
      }
      return Infinity;
    }
    let time = 0;
    let left = dv;
    let mass = this.mass;
    for (let i = this.segs.length - 1; i >= 0 && left > 1e-6; i--) {
      const seg = this.segs[i]!;
      const dry = seg.parts.reduce((s, id) => s + part(id).dry, 0);
      const { thrust, flow } = this.stageEngine(seg.parts);
      if (thrust > 0 && (seg.fuel > 0 || this.infiniteFuel)) {
        const ve = thrust / flow;
        const stageDv = this.infiniteFuel ? Infinity : ve * Math.log(mass / (mass - seg.fuel));
        if (left <= stageDv) {
          time += (mass * (1 - Math.exp(-left / ve))) / flow;
          left = 0;
          break;
        }
        time += seg.fuel / flow;
        left -= stageDv;
      }
      mass -= dry + seg.fuel;
    }
    return left > 1e-6 ? Infinity : time;
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

  /**
   * Höchster und tiefster Punkt über dem Bezugskörper (Höhen) mit der Zeit bis dorthin. Nahe am
   * Körper aus der Kepler-Bahn; weit draußen, wo Mond, Planet oder Sonne kräftig mitziehen, aus der
   * Vorhersage – sonst widerspräche die Anzeige der Karte (etwa „im Boden“ statt 25 km beim
   * Heimflug vom Mond). Ohne Treffer in der Vorhersage bleibt es bei Kepler.
   */
  apsidesShown(pred: Prediction | null): {
    apoapsis: number;
    periapsis: number;
    tAp: number;
    tPe: number;
  } {
    const ref = this.refBody();
    const o = this.orbit(ref);
    const el = this.status === 'flying' && ref !== SUN ? this.elements(ref) : null;
    const round = !!el && el.e < CIRCULAR_E;
    const out = {
      apoapsis: o.apoapsis,
      periapsis: o.periapsis,
      tAp: el && !round ? timeToApoapsis(el, this.t) : Infinity,
      tPe: el && !round ? timeToPeriapsis(el, this.t) : Infinity,
    };
    const p = pred;
    if (
      !p ||
      p.ref !== ref ||
      this.status !== 'flying' ||
      ref === SUN ||
      (o.bound && o.apoapsis + ref.radius < 0.1 * ref.hill)
    )
      return out;
    const alt = (i: number): number => {
      const [bx, by] = bodyState(ref, p.ts[i]!);
      return Math.hypot(p.xs[i]! - bx, p.ys[i]! - by) - ref.radius;
    };
    if (p.low >= 0 && p.ts[p.low]! > this.t) {
      out.periapsis = alt(p.low);
      out.tPe = p.ts[p.low]! - this.t;
    } else if (p.impact === ref) {
      out.periapsis = Math.min(out.periapsis, -1);
      out.tPe = Infinity;
    }
    if (o.bound && p.high >= 0 && p.ts[p.high]! > this.t) {
      out.apoapsis = alt(p.high);
      out.tAp = p.ts[p.high]! - this.t;
    }
    return out;
  }

  /** Kepler-Bahnelemente relativ zum Bezugskörper (für Zeit bis Ap/Pe). */
  elements(body: Body = this.refBody()): Elements {
    const rel = this.relative(body);
    return elements(body.mu, rel.rx, rel.ry, rel.vx, rel.vy, this.t);
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

  /** Mitte der Rakete (für Zielrichtung und Kamera). */
  center(): [number, number] {
    const h = this.length * 0.5;
    return [this.x + Math.cos(this.angle) * h, this.y + Math.sin(this.angle) * h];
  }

  /** Ort und Geschwindigkeit des Ziels (Station: Andockstutzen). */
  targetState(): { x: number; y: number; vx: number; vy: number; surface: number } | null {
    if (!this.target) return null;
    if (this.target === 'station') {
      const [x, y] = stationPort(this.t);
      const [, , vx, vy] = stationState(this.t);
      return { x, y, vx, vy, surface: 0 };
    }
    const b = bodyById(this.target);
    const [x, y, vx, vy] = bodyState(b, this.t);
    return { x, y, vx, vy, surface: b.radius };
  }

  /** Abstand und Relativgeschwindigkeit zum gewählten Ziel. */
  targetInfo(): { name: string; distance: number; speed: number; closing: number } | null {
    const s = this.targetState();
    if (!s || !this.target) return null;
    const name = this.target === 'station' ? STATION.name : bodyById(this.target).name;
    const [cx, cy] = this.center();
    const dx = s.x - cx;
    const dy = s.y - cy;
    const d = Math.hypot(dx, dy);
    const rvx = this.vx - s.vx;
    const rvy = this.vy - s.vy;
    return {
      name,
      distance: d - s.surface,
      speed: Math.hypot(rvx, rvy),
      closing: d > 0 ? (rvx * dx + rvy * dy) / d : 0,
    };
  }

  /**
   * Geschwindigkeit für Anzeige und SAS: nahe der Station relativ zu ihr (wie beim echten
   * Andocken), sonst relativ zum Bezugskörper.
   */
  speedFrame(): { vx: number; vy: number; mode: 'orbit' | 'target' } {
    if (this.target === 'station') {
      const ti = this.targetInfo();
      if (ti && ti.distance < 20_000) {
        const [, , svx, svy] = stationState(this.t);
        return { vx: this.vx - svx, vy: this.vy - svy, mode: 'target' };
      }
    }
    const rel = this.relative();
    return { vx: rel.vx, vy: rel.vy, mode: 'orbit' };
  }

  /** Richtung, die das SAS gerade hält (Weltwinkel), oder null. */
  sasDirection(mode: SasMode = this.sas): number | null {
    switch (mode) {
      case 'off':
        return null;
      case 'point':
        return this.sasAngle;
      case 'maneuver': {
        const r = this.nodeRemaining();
        return r.mag > 0.01 ? Math.atan2(r.y, r.x) : null;
      }
      case 'target':
      case 'antiTarget': {
        const s = this.targetState();
        if (!s) return null;
        const [cx, cy] = this.center();
        const a = Math.atan2(s.y - cy, s.x - cx);
        return mode === 'target' ? a : wrap(a + Math.PI);
      }
      default: {
        const s = this.speedFrame();
        if (Math.hypot(s.vx, s.vy) < 0.05) return null;
        const pro = Math.atan2(s.vy, s.vx);
        if (mode === 'prograde') return pro;
        if (mode === 'retrograde') return wrap(pro + Math.PI);
        const rel = this.relative();
        let qx = -s.vy;
        let qy = s.vx;
        if (qx * rel.rx + qy * rel.ry < 0) {
          qx = -qx;
          qy = -qy;
        }
        const out = Math.atan2(qy, qx);
        return mode === 'radialOut' ? out : wrap(out + Math.PI);
      }
    }
  }

  /** Abstand zum Landeplatz einer Herausforderung entlang der Oberfläche. */
  siteInfo(): { distance: number; body: Body; name: string } | null {
    const s = this.site;
    if (!s) return null;
    const b = bodyById(s.body);
    const c = this.state(b);
    const local = Math.atan2(this.y - c.y, this.x - c.x) - bodySpin(b, this.t);
    return { distance: b.radius * Math.abs(wrap(local - s.angle)), body: b, name: s.name };
  }

  /** Zeitraffer bei laufendem Triebwerk: in Bodennähe 4×, im freien Raum mehr. */
  private burnWarpLimit(): number {
    if (this.rcs && (this.translate.x || this.translate.y)) return WARP_LIMITED;
    const { body, altitude } = this.nearest();
    if (altitude < Math.max(body.atmosphere, 30_000)) return WARP_LIMITED;
    const accel = (this.engine().thrust * this.throttle) / this.mass;
    return accel <= 2 ? 100 : 10;
  }

  /**
   * Endgeschwindigkeit im freien Fall bei Luftdichte `rho` und Schwerebeschleunigung `g` – mit oder
   * ohne offenen Fallschirm (∞ ohne Luft oder ohne Luftwiderstand).
   */
  terminalSpeed(g: number, rho: number, chute = false): number {
    if (!this.dragOn) return Infinity;
    const cda =
      ROCKET_CDA * (this.streamlined ? 0.5 : 1) +
      (this.airbrakes ? AIRBRAKE_CDA * this.count('airbrake') : 0) +
      (chute ? CHUTE_CDA * this.chuteArea : 0);
    return rho > 0 ? Math.sqrt((2 * this.mass * g) / (rho * cda)) : Infinity;
  }

  /** Größter erlaubter Zeitraffer in der momentanen Lage. */
  maxWarpIndex(): number {
    if (this.status === 'crashed') return 0;
    let limit: number = WARPS.length - 1;
    if (this.status === 'landed' || this.status === 'docked') {
      if (this.thrusting) return 0;
    } else {
      if (this.thrusting || (this.rcs && (this.translate.x || this.translate.y)))
        limit = WARPS.indexOf(this.burnWarpLimit() as (typeof WARPS)[number]);
      const { body, altitude } = this.nearest();
      if (altitude < 3_000) limit = Math.min(limit, WARPS.indexOf(10));
      else if (altitude < 30_000 || altitude < body.atmosphere)
        limit = Math.min(limit, WARPS.indexOf(50));
      // Nahe der Station nicht vorbeirasen.
      const ti = this.target === 'station' ? this.targetInfo() : null;
      if (ti && ti.distance < 5_000) limit = Math.min(limit, WARPS.indexOf(10));
    }
    // Pro Bild höchstens etwa 1500 Rechenschritte – sonst ruckelt es nahe großer Körper.
    // Auf Schienen (Kepler-Bahn) gibt es diese Grenze nicht.
    if (!this.railsBody()) {
      const step = this.stepEstimate();
      while (limit > 0 && WARPS[limit]! / 60 > step * 1500) limit--;
    }
    // Vor dem Brennen eines Manövers abbremsen.
    if (this.node && !this.node.frozen) {
      const left = this.nodeBurnStart() - this.t;
      while (limit > 0 && WARPS[limit]! / 60 > Math.max(left, 0) / 10) limit--;
    }
    // Vor einem Aufprall (oder dem Eintauchen in eine Atmosphäre), vor dem Eintritt in eine
    // Hill-Sphäre und vor dem tiefsten Punkt eines Vorbeiflugs automatisch abbremsen:
    // mindestens zehn Bilder bis dahin.
    if (this.status === 'flying') {
      const ttc = Math.min(this.timeToSurface(), this.timeToEvent());
      while (limit > 0 && WARPS[limit]! / 60 > ttc / 10) limit--;
    }
    return limit;
  }

  /**
   * Zeit bis zum Boden bzw. bis zur Atmosphäre des nächsten Körpers (∞ = kein Aufprall). Aus der
   * Kepler-Bahn: Eine Umlaufbahn über der Atmosphäre bremst den Zeitraffer also nicht.
   */
  timeToSurface(): number {
    let best = Infinity;
    for (const b of BODIES) {
      const c = this.state(b);
      const rx = this.x - c.x;
      const ry = this.y - c.y;
      const vx = this.vx - c.vx;
      const vy = this.vy - c.vy;
      const r = Math.hypot(rx, ry);
      const radial = (vx * rx + vy * ry) / r;
      const top = b.radius + (b.atmosphere > 0 && r - b.radius > b.atmosphere ? b.atmosphere : 0);
      if (r - top < 50) {
        // In der Luft: freier Fall mit g aus h = v·t + g/2·t²
        if (radial >= 0) continue;
        const g = b.mu / (r * r);
        const v = -radial;
        best = Math.min(best, (-v + Math.sqrt(v * v + 2 * g * Math.max(r - b.radius, 0))) / g);
        continue;
      }
      if (r > b.hill) continue;
      const el = elements(b.mu, rx, ry, vx, vy, this.t);
      if (el.p / (1 + el.e) > top) continue;
      best = Math.min(best, timeToRadius(el, this.t, top));
    }
    return best;
  }

  /**
   * Zeit bis zum nächsten Ereignis, bei dem man nicht vorbeirasen sollte: Eintritt in die
   * Hill-Sphäre eines anderen Körpers oder der tiefste Punkt eines Vorbeiflugs.
   */
  timeToEvent(): number {
    let best = Infinity;
    const ref = this.refBody();
    const o = ref === SUN ? null : this.orbit(ref);
    // Gebunden an den Bezugskörper: nur dessen Monde, und nur, wenn die Bahn so weit hinausreicht.
    const reach = o && o.bound ? o.apoapsis + ref.radius : Infinity;
    for (const b of BODIES) {
      if (b === SUN || b === ref) continue;
      if (Number.isFinite(reach) && (b.parent !== ref.id || reach < b.distance - b.hill)) continue;
      const c = this.state(b);
      const rx = this.x - c.x;
      const ry = this.y - c.y;
      const d = Math.hypot(rx, ry);
      if (d < b.hill) continue;
      const closing = -((this.vx - c.vx) * rx + (this.vy - c.vy) * ry) / d;
      if (closing > 0) best = Math.min(best, (d - b.hill) / closing);
    }
    if (ref !== SUN) {
      const el = this.elements(ref);
      if (el.e >= 1) best = Math.min(best, timeToPeriapsis(el, this.t));
    }
    return best;
  }

  /**
   * „Auf Schienen“: Bei hohem Zeitraffer fliegt eine stabile Umlaufbahn (weit innerhalb der
   * Hill-Sphäre, über der Atmosphäre) als exakte Kepler-Ellipse – wie in großen Raumfahrtspielen.
   * Die Störungen durch andere Körper sind dort winzig; dafür läuft die Zeit beliebig schnell.
   */
  private railsBody(): Body | null {
    if (this.status !== 'flying' || this.thrusting) return null;
    if (this.rcs && (this.translate.x || this.translate.y)) return null;
    const ref = this.refBody();
    if (ref === SUN) return null;
    const o = this.orbit(ref);
    if (!o.bound || o.apoapsis + ref.radius > 0.1 * ref.hill) return null;
    if (o.periapsis < Math.max(ref.atmosphere, 10_000)) return null;
    // Nur wo Monde und Mutterkörper kaum zerren (Gezeitenbeschleunigung unter 1/10 000 der
    // Schwerkraft am höchsten Punkt) – sonst liefe die Rakete auf Schienen sichtbar anders als
    // die Vorhersage, die alle Körper mitrechnet.
    if (tidalRatio(ref, o.apoapsis + ref.radius) > 1e-4) return null;
    return ref;
  }

  private rails(ref: Body, dt: number): void {
    const el = this.elements(ref);
    this.t += dt;
    const [x, y, vx, vy] = stateAt(el, this.t);
    const [bx, by, bvx, bvy] = bodyState(ref, this.t);
    this.x = bx + x;
    this.y = by + y;
    this.vx = bvx + vx;
    this.vy = bvy + vy;
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

  /** Zeitraffer von Hand wählen (beendet einen laufenden Zeitsprung). */
  setWarp(index: number): void {
    this.warpTarget = null;
    this.warpIndex = Math.max(0, Math.min(index, this.maxWarpIndex()));
  }

  /** Automatisch bis zu einem Zeitpunkt vorspulen und dort auf 1× abbremsen. */
  warpTo(t: number): boolean {
    if (!(t > this.t + 0.5) || this.status === 'crashed' || !Number.isFinite(t)) return false;
    this.warpTarget = t;
    return true;
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
    // Was mit der Stufe abfällt, ist weg: Fallschirm und Luftbremsen dort gelten nicht mehr.
    if (!this.allParts().some((id) => part(id).kind === 'chute')) {
      this.chute = 'none';
      this.chuteOpen = 0;
    }
    if (!this.hasAirbrakes) this.airbrakes = false;
    const ax = Math.cos(this.angle);
    const ay = Math.sin(this.angle);
    // Die Federn der Trennung drücken beide Teile mit 2 m/s auseinander – aufgeteilt nach Masse,
    // damit der Impuls erhalten bleibt (kein geschenktes Δv).
    const mDrop = dropped.fuel + dropped.parts.reduce((m, id) => m + part(id).dry, 0);
    const mRest = this.mass;
    const push = 2;
    const dvRest = (push * mDrop) / (mDrop + mRest);
    const dvDrop = push - dvRest;
    this.debris.push({
      x: this.x,
      y: this.y,
      vx: this.vx - ax * dvDrop,
      vy: this.vy - ay * dvDrop,
      angle: this.angle,
      spin: (this.random() - 0.5) * 0.6,
      parts: dropped.parts,
      age: 0,
    });
    this.x += ax * height;
    this.y += ay * height;
    this.vx += ax * dvRest;
    this.vy += ay * dvRest;
    this.emptyWarned = false;
    this.shake = Math.max(this.shake, 0.35);
    this.puff(this.x, this.y, 14);
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

  /** Taste P: verpackt → scharf → wieder entschärft; ein offener Schirm wird abgeworfen. */
  toggleChute(): void {
    if (this.chute === 'stowed') this.deployChute();
    else if (this.chute === 'armed') {
      this.chute = 'stowed';
      this.emit('info', 'Fallschirm entschärft – er bleibt verpackt.');
    } else if (this.chute === 'open') this.cutChute();
  }

  /** Offenen (oder scharfen) Fallschirm abwerfen – er ist danach weg. */
  cutChute(): void {
    if (this.chute !== 'open' && this.chute !== 'armed') return;
    const wasOpen = this.chute === 'open';
    const chuteId = this.allParts().find((id) => part(id).kind === 'chute') ?? 'fallschirm';
    this.dropChutes();
    if (wasOpen) {
      // Der Schirm fliegt als Trümmerteil davon.
      this.debris.push({
        x: this.x + Math.cos(this.angle) * this.length,
        y: this.y + Math.sin(this.angle) * this.length,
        vx: this.vx,
        vy: this.vy,
        angle: this.angle,
        spin: (this.random() - 0.5) * 2,
        parts: [chuteId],
        age: 0,
      });
    }
    this.emit('info', 'Fallschirm abgeworfen.');
  }

  /** Alle Fallschirme sind verbraucht: aus der Rakete entfernen. */
  private dropChutes(): void {
    for (const seg of this.segs) {
      const rest = seg.parts.filter((id) => part(id).kind !== 'chute');
      if (rest.length > 0) seg.parts = rest;
    }
    this.chute = 'none';
    this.chuteOpen = 0;
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

  /** Den obersten Satelliten aussetzen: Er fliegt danach allein auf seiner Kepler-Bahn weiter. */
  deploySatellite(): boolean {
    if (this.status !== 'flying') {
      this.emit('info', 'Satelliten lassen sich nur im Flug aussetzen.');
      return false;
    }
    const seg = this.segs.find((s) => s.parts.includes('satellit'));
    if (!seg) {
      this.emit('info', 'Kein Satellit an Bord.');
      return false;
    }
    const ax = Math.cos(this.angle);
    const ay = Math.sin(this.angle);
    const top = this.length;
    seg.parts.splice(seg.parts.indexOf('satellit'), 1);
    // Mit Federn sanft nach vorn abgestoßen.
    const sx = this.x + ax * (top + 0.5);
    const sy = this.y + ay * (top + 0.5);
    const svx = this.vx + ax * 0.6;
    const svy = this.vy + ay * 0.6;
    this.vx -= ax * 0.1;
    this.vy -= ay * 0.1;
    this.shake = Math.max(this.shake, 0.12);
    const ref = dominantBody(sx, sy, this.t);
    const [bx, by, bvx, bvy] = bodyState(ref, this.t);
    const el = elements(ref.mu, sx - bx, sy - by, svx - bvx, svy - bvy, this.t);
    const { peri, apo } = apsides(el);
    if (el.e >= 1) {
      this.emit(
        'warn',
        `Satellit ausgesetzt – aber auf einer Fluchtbahn. Er verlässt ${forms(ref).acc} für immer.`,
      );
      return true;
    }
    if (peri - ref.radius < Math.max(ref.atmosphere, 1_000)) {
      this.debris.push({
        x: sx,
        y: sy,
        vx: svx,
        vy: svy,
        angle: this.angle,
        spin: 0.2,
        parts: ['satellit'],
        age: 0,
      });
      this.emit(
        'warn',
        `Satellit ausgesetzt – doch seine Bahn führt in ${ref.atmosphere > 0 ? 'die Atmosphäre' : 'den Boden'}: Er stürzt ab. Erst eine stabile Umlaufbahn fliegen!`,
      );
      return true;
    }
    // Nächste freie Nummer – auch wenn früher ein Satellit abgeschaltet wurde.
    const n =
      Math.max(0, ...this.satellites.map((q) => Number(/(\d+)$/.exec(q.name)?.[1] ?? 0))) + 1;
    this.satellites.push({
      id: newSatId(),
      name: `Satellit ${n}`,
      body: ref.id,
      el,
      ...(this.sandbox ? { sandbox: true } : {}),
    });
    if (this.satellites.length > MAX_SATELLITES) this.satellites.shift();
    const km = (m: number): string =>
      `${Math.round((m - ref.radius) / 1000).toLocaleString('de-DE')} km`;
    this.emit(
      'info',
      `Satellit ${n} kreist jetzt um ${forms(ref).acc}: ${km(peri)} bis ${km(apo)} hoch.`,
    );
    this.satelliteGoals();
    return true;
  }

  private satelliteGoals(): void {
    // Nur echte Satelliten zählen – Sandkasten-Satelliten bringen keine Punkte.
    const real = this.satellites.filter((s) => !s.sandbox);
    const around = (b: BodyId): Satellite[] => real.filter((s) => s.body === b);
    const earth = around('earth');
    if (earth.length) this.goal('satellite');
    if (earth.some((s) => apsides(s.el).peri - EARTH.radius > 2_000_000)) this.goal('highsat');
    if (earth.length >= 3) this.goal('network');
    if (around('moon').length) this.goal('moonsat');
    if (real.some((s) => !['earth', 'moon', 'sun'].includes(s.body))) this.goal('planetsat');
  }

  // ---------------------------------------------------------------- Manöver

  /** Neues Manöver planen (ersetzt ein altes). */
  setNode(t: number, prograde = 0, radial = 0): void {
    this.node = {
      t: Math.max(t, this.t + 1),
      prograde,
      radial,
      dx: 0,
      dy: 0,
      doneP: 0,
      doneR: 0,
      frozen: false,
      energy: null,
      ref: this.refBody().id,
      at: null,
    };
    this.refreshNode();
  }

  /** Manöver ändern (nur solange noch nicht gebrannt wird). */
  editNode(change: { t?: number; prograde?: number; radial?: number }): void {
    const n = this.node;
    if (!n || n.frozen) return;
    if (change.prograde !== undefined) n.prograde = change.prograde;
    if (change.radial !== undefined) n.radial = change.radial;
    if (change.t !== undefined && change.t !== n.t) {
      n.t = Math.max(change.t, this.t + 1);
      n.at = null;
    }
    this.refreshNode();
  }

  clearNode(): void {
    this.node = null;
    if (this.sas === 'maneuver') this.sas = 'off';
  }

  /** Schubvektor des Manövers aus dem Zustand zur Manöverzeit berechnen. */
  refreshNode(): void {
    const n = this.node;
    if (!n || n.frozen) return;
    if (!n.at) {
      const s: Coast = { x: this.x, y: this.y, vx: this.vx, vy: this.vy, t: this.t };
      if (this.status === 'flying' && n.t > s.t && !coastTo(s, n.t, 200_000)) return;
      n.at = [s.x, s.y, s.vx, s.vy];
    }
    const [x, y, vx, vy] = n.at;
    const d = nodeDelta(n, x, y, vx, vy);
    n.dx = d.dx;
    n.dy = d.dy;
    n.ref = d.body.id;
  }

  /** Noch zu brennendes Δv des Manövers, als Richtung im jetzigen Bezugssystem (Welt). */
  nodeRemaining(): { x: number; y: number; mag: number; prograde: number; radial: number } {
    const n = this.node;
    if (!n) return { x: 0, y: 0, mag: 0, prograde: 0, radial: 0 };
    let p = n.prograde - n.doneP;
    const r = n.radial - n.doneR;
    const b = bodyById(n.ref);
    if (n.frozen && n.energy !== null) {
      // Fehlendes Δv aus der Energie, genau (nicht linear genähert – bei großen Schüben wäre das
      // bis zu einem Viertel zu viel): ½(v + p)² = E_Ziel + μ/r.
      const rel = this.relative(b);
      const v = Math.hypot(rel.vx, rel.vy);
      const e = (v * v) / 2 - b.mu / rel.r;
      const w = v * v + 2 * (n.energy - e);
      const exact = w >= 0 ? Math.sqrt(w) - v : NaN;
      if (Number.isFinite(exact) && Math.abs(exact) <= Math.abs(n.prograde) * 1.15 + 5) p = exact;
    }
    const [px, py, qx, qy] = nodeFrame(b, this.x, this.y, this.vx, this.vy, this.t);
    return {
      x: p * px + r * qx,
      y: p * py + r * qy,
      mag: Math.hypot(p, r),
      prograde: p,
      radial: r,
    };
  }

  /** Wann das Brennen beginnen sollte (Mitte des Brennens = Manöverzeit). */
  nodeBurnStart(): number {
    const n = this.node;
    if (!n) return Infinity;
    const bt = this.burnTime(Math.hypot(n.dx, n.dy));
    return n.t - (Number.isFinite(bt) ? bt / 2 : 0);
  }

  private updateNode(): void {
    const n = this.node;
    if (!n) return;
    if (!n.frozen && this.t >= this.nodeBurnStart() - 1) {
      // Kurz vor dem Brennen den Schubvektor aus dem jetzigen Zustand genau bestimmen.
      n.at = null;
      this.refreshNode();
      n.frozen = true;
      // (refreshNode hat `at` gerade neu gesetzt.)
      const at = n.at as ManeuverNode['at'];
      if (at && Math.abs(n.radial) < 0.25 * Math.abs(n.prograde)) {
        const b = bodyById(n.ref);
        const [x, y, vx, vy] = at;
        const [bx, by, bvx, bvy] = bodyState(b, n.t);
        const v2 = (vx + n.dx - bvx) ** 2 + (vy + n.dy - bvy) ** 2;
        n.energy = v2 / 2 - b.mu / Math.hypot(x - bx, y - by);
      }
    }
    if (!n.frozen) return;
    const left = this.nodeRemaining();
    const rp = left.prograde;
    const rr = left.radial;
    const rem = left.mag;
    const total = Math.hypot(n.prograde, n.radial);
    const over = rp * n.prograde + rr * n.radial < 0;
    // Kleine Kurskorrekturen brauchen viel mehr Genauigkeit als große Brennphasen.
    const tolerance = Math.min(0.2, Math.max(0.004, total * 0.002));
    if (total < 0.004 || rem < tolerance || over) {
      this.node = null;
      if (this.sas === 'maneuver') this.sas = 'off';
      this.emit(
        'info',
        rem <= 1
          ? `Manöver ausgeführt – auf ${rem.toLocaleString('de-DE', { maximumFractionDigits: rem < 0.1 ? 2 : 1 })} m/s genau.`
          : `Manöver beendet, ${Math.round(rem)} m/s daneben.`,
      );
      if (rem <= 1 && total >= 5) this.goal('node');
    }
  }

  // ---------------------------------------------------------------- Simulation

  /** Rechnet `realDt` Sekunden Echtzeit (mal Zeitraffer) weiter. */
  update(realDt: number): void {
    realDt = Math.min(realDt, 0.1);
    this.driveWarpTo(realDt);
    if (this.warpIndex > this.maxWarpIndex()) this.warpIndex = this.maxWarpIndex();
    if (this.status !== 'crashed') this.rotate(realDt);
    let remaining = realDt * this.warp;
    if (this.warpTarget !== null) remaining = Math.min(remaining, this.warpTarget - this.t);
    const railsRef = this.warp >= 1000 ? this.railsBody() : null;
    if (railsRef && remaining > 0) {
      this.rails(railsRef, remaining);
      remaining = 0;
    }
    let guard = 0;
    while (remaining > 1e-9 && this.status !== 'crashed' && guard++ < 4_000) {
      remaining -= this.substep(remaining);
    }
    // Falls die Schrittgrenze erreicht wurde, läuft die Zeit einfach etwas langsamer.
    if (this.warpTarget !== null && this.t >= this.warpTarget - 1e-6) {
      this.warpTarget = null;
      this.warpIndex = 0;
    }
    this.updateNode();
    this.updateDebris(realDt * this.warp);
    this.updateParticles(realDt);
    this.shake = Math.max(0, this.shake - realDt * 1.4);
    this.flash = Math.max(0, this.flash - realDt * 1.8);
    if (this.status !== 'crashed' && this.thrusting && this.warp <= 10) this.exhaust();
    if (this.status === 'flying' && this.warp <= 10) this.reentrySparks();
    this.checkGoals();
  }

  private driveWarpTo(realDt: number): void {
    if (this.warpTarget === null) return;
    if (this.thrusting || this.status === 'crashed') {
      this.warpTarget = null;
      return;
    }
    const left = this.warpTarget - this.t;
    if (left <= 1e-3) {
      this.warpTarget = null;
      this.warpIndex = 0;
      return;
    }
    let i = this.maxWarpIndex();
    // Kurz vor dem Ziel stufenweise abbremsen.
    while (i > 0 && WARPS[i]! * Math.max(realDt, 1 / 60) > left / 3) i--;
    this.warpIndex = i;
  }

  /** Drehen: von Hand oder durch das SAS, mit kurzer Trägheit. */
  private rotate(realDt: number): void {
    const flying = this.status === 'flying';
    // Im Physik-Zeitraffer dreht die Rakete mit, im schnellen Zeitraffer nicht.
    const limit = this.thrusting ? this.burnWarpLimit() : WARP_LIMITED;
    const rotates = flying && this.warp <= limit;
    let cmd = flying ? this.turn * (this.fine ? 0.3 : 1) : 0;
    if (flying && this.turn === 0 && this.sas !== 'off') {
      const dir = this.sasDirection();
      if (dir !== null) {
        if (rotates) {
          const err = wrap(this.angle - dir);
          cmd = clamp((err * 2.5) / Math.max(1, this.warp) - this.angVel * 0.9, -1, 1);
        } else {
          this.angle = dir;
          this.angVel = 0;
        }
      }
    }
    if (this.turn !== 0 && this.sas === 'point') this.sas = 'off';
    // Reaktionsräder: schneller drehen und schneller abbremsen (höchstens zwei zählen).
    const wheels = Math.min(2, this.count('wheel'));
    const target = rotates ? cmd * TURN_RATE * (1 + 0.45 * wheels) : 0;
    const dv = target - this.angVel;
    const maxStep = TURN_ACCEL * (1 + 0.75 * wheels) * realDt;
    this.angVel += clamp(dv, -maxStep, maxStep);
    if (rotates) this.angle = wrap(this.angle - this.angVel * realDt * this.warp);
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
        this.hopHeight = 0;
        if (this.stats.liftoff === null) this.stats.liftoff = this.t;
      } else {
        const dt = Math.min(maxDt, burning ? 0.02 : maxDt);
        if (burning) this.burn(flow * this.throttle * dt);
        this.t += dt;
        const local = bodySpin(body, this.t) + this.landAngle;
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
      // Jeder RCS-Block bringt dreimal die Kraft der eingebauten Düsen dazu.
      const rcs = RCS_ACCEL * (1 + 3 * Math.min(2, this.count('rcs')));
      tx += rcs * (this.translate.y * ax + this.translate.x * ay);
      ty += rcs * (this.translate.y * ay - this.translate.x * ax);
    }
    this.rk4(dt, tx, ty);
    const push = Math.hypot(tx, ty);
    if (push > 0) {
      this.stats.dvUsed += push * dt;
      const n = this.node;
      if (n?.frozen) {
        const [px, py, qx, qy] = nodeFrame(
          bodyById(n.ref),
          this.x,
          this.y,
          this.vx,
          this.vy,
          this.t,
        );
        n.doneP += (tx * px + ty * py) * dt;
        n.doneR += (tx * qx + ty * qy) * dt;
      }
    }
    if (burning) this.stats.burnSeconds += dt;

    // Luftwiderstand implizit (stabil auch bei offenem Fallschirm), relativ zur Luft des Körpers.
    const air = this.air();
    const bodyV = this.state(air.body);
    const rvx = this.vx - bodyV.vx;
    const rvy = this.vy - bodyV.vy;
    const rv = Math.hypot(rvx, rvy);
    this.stats.maxSpeed = Math.max(this.stats.maxSpeed, rv);
    this.stats.distance += rv * dt;
    if (
      this.chute === 'armed' &&
      air.rho > 0.002 &&
      air.altitude < air.body.atmosphere * 0.3 &&
      rv < CHUTE_MAX_SPEED
    ) {
      this.chute = 'open';
      this.shake = Math.max(this.shake, 0.25);
      this.emit('info', 'Fallschirm offen!');
    }
    if (this.chute === 'open') {
      this.chuteOpen = Math.min(1, this.chuteOpen + dt / 2.5);
      if (air.rho > 0 && rv > 2 * CHUTE_MAX_SPEED) {
        this.dropChutes();
        this.emit('warn', 'Der Fallschirm ist bei zu hohem Tempo gerissen!');
      }
    }
    // Hitze beim Wiedereintritt: wächst mit Luftdichte und Tempo³, kühlt langsam ab.
    // Mit dem Hitzeschild voran kommt nur ein Viertel an.
    this.shielded =
      this.shieldAtBottom && rv > 1 && -(ax * rvx + ay * rvy) / rv > 0.5 && air.rho > 0;
    const protect = this.allParts().reduce((m, id) => Math.min(m, part(id).heatProtect ?? 1), 1);
    const heating =
      air.rho > 0 && this.heatOn
        ? ((Math.sqrt(air.rho) * rv ** 3) / HEAT_SCALE) *
          (this.shielded ? SHIELD_FACTOR : 1) *
          protect
        : 0;
    this.heat = Math.max(0, this.heat + (heating - this.heat * HEAT_COOLING) * dt);
    if (this.indestructible) this.heat = Math.min(this.heat, 0.99);
    this.maxHeat = Math.max(this.maxHeat, this.heat);
    if (this.heat >= 1) {
      this.fail(
        this.shieldAtBottom
          ? 'Beim Wiedereintritt verglüht – der Hitzeschild zeigte nicht nach vorn. Mit SAS „retrograd“ fliegt er voran.'
          : 'Beim Wiedereintritt verglüht – zu schnell in zu dichte Luft. Flacher eintauchen (tiefster Punkt eher 30 km als 10 km) oder einen Hitzeschild einbauen.',
        bodyV,
      );
      return dt;
    }
    this.pressure = Math.min(1, air.rho / SEA_RHO);
    this.hopHeight = Math.max(this.hopHeight, air.altitude);
    let drag = 0;
    if (air.rho > 0) {
      // Nasenkegel halbiert den Widerstand, Luftbremsen und Fallschirme vergrößern ihn.
      const body = this.dragOn
        ? ROCKET_CDA * (this.streamlined ? 0.5 : 1) +
          (this.airbrakes ? AIRBRAKE_CDA * this.count('airbrake') : 0)
        : 0;
      const cda = body + (this.chute === 'open' ? CHUTE_CDA * this.chuteArea * this.chuteOpen : 0);
      const k = (0.5 * air.rho * cda) / mass;
      const f = 1 / (1 + k * rv * dt);
      this.vx = bodyV.vx + rvx * f;
      this.vy = bodyV.vy + rvy * f;
      drag = (rv * (1 - f)) / dt;
    }
    // Belastung in g: alles außer der Schwerkraft (die spürt man im freien Fall nicht).
    const g = (push + drag) / G0;
    this.gForce += (g - this.gForce) * Math.min(1, dt * 4);
    this.stats.maxG = Math.max(this.stats.maxG, this.gForce);
    if (burning) this.burn(flow * this.throttle * dt);

    this.checkContact();
    if (this.status === 'flying') this.checkDocking();
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
    if (this.infiniteFuel) return;
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
    if (this.indestructible && !body.solid) {
      // Unzerstörbar (Sandkasten): an Gashüllen und der Sonne abprallen statt „landen“.
      const rx = Math.cos(up);
      const ry = Math.sin(up);
      const rvx = this.vx - c.vx;
      const rvy = this.vy - c.vy;
      const inward = rvx * rx + rvy * ry;
      if (inward < 0) {
        this.vx -= inward * rx * 1.2;
        this.vy -= inward * ry * 1.2;
      }
      this.x = c.x + (body.radius + 1) * rx;
      this.y = c.y + (body.radius + 1) * ry;
      if (this.t - this.bounceNote > 30) {
        this.bounceNote = this.t;
        this.emit(
          'warn',
          `${body.name} hat keine feste Oberfläche – im Sandkasten prallt die Rakete an der Gashülle ab.`,
        );
      }
      return;
    }
    if ((body.solid && speed <= speedLimit && tilt <= tiltLimit) || this.indestructible) {
      this.status = 'landed';
      this.landedOn = body;
      this.landAngle = up - bodySpin(body, this.t);
      this.vx = c.vx;
      this.vy = c.vy;
      this.angle = up;
      this.angVel = 0;
      this.warpIndex = 0;
      this.warpTarget = null;
      this.heat = 0;
      this.stats.landings++;
      this.stats.lastLanding = { body: body.id, speed, t: this.t };
      this.puff(this.x, this.y, 20, 'dust');
      // Fallschirme sind Einmalteile: nach der Landung ist er verbraucht.
      if (this.chute === 'open') this.dropChutes();
      // „Butterweich“ zählt nur nach einem echten Flug, nicht nach einem Hüpfer auf der Rampe.
      if (speed < 2 && this.hopHeight > 100) this.goal('soft');
      if (this.maxHeat > 0.7) this.goal('fire');
      if (body === MOON) this.goal('moonland');
      else if (body === MARS) this.goal('marsland');
      else if (body === VENUS) this.goal('venusland');
      else if (body === PHOBOS) this.goal('phobos');
      else if (body === MERCURY) this.goal('mercuryland');
      else if (body === EUROPA) this.goal('europaland');
      else if (body === EARTH) {
        // Heimkehr zählt nur mit Crew an Bord (Kapsel), nicht für unbemannte Sonden.
        const crew = this.allParts().some((id) => part(id).kind === 'capsule');
        if (crew && this.goals.has('moonland')) this.goal('return');
        if (crew && this.goals.has('marsland')) this.goal('marsreturn');
        if (this.goals.has('orbit') && EARTH.radius * Math.abs(wrap(up - Math.PI / 2)) < 5_000)
          this.goal('pinpoint');
      }
      if (!this.events.length || this.events[this.events.length - 1]!.kind !== 'goal')
        this.emit('info', `Gelandet auf ${forms(body).dat} mit ${fmt(speed, 1)} m/s. Gut gemacht!`);
      return;
    }
    let reason: string;
    if (body === SUN) reason = 'In der Sonne verglüht – über 5.000 °C heiß.';
    else if (!body.solid)
      reason = `${body.name} hat keine feste Oberfläche – die Rakete ist in der Gashülle zerdrückt worden.`;
    else
      reason =
        speed > speedLimit
          ? `Aufprall mit ${Math.round(speed)} m/s – sicher sind höchstens ${speedLimit} m/s${legs ? '' : ' (mit Landebeinen 14 m/s)'}.`
          : `Zu schräg aufgesetzt (${Math.round((tilt * 180) / Math.PI)}°). Die Rakete ist umgekippt.`;
    this.fail(reason, c);
  }

  /** Flug scheitert: Explosion, Trümmer, Meldung, alles aus. */
  private fail(reason: string, c: { vx: number; vy: number }): void {
    this.status = 'crashed';
    this.warpIndex = 0;
    this.warpTarget = null;
    this.throttle = 0;
    this.crashReason = reason;
    this.shake = 1;
    this.flash = 1;
    // Die Teile fliegen auseinander.
    const { body } = this.nearest();
    const bc = this.state(body);
    const ux = (this.x - bc.x) / (Math.hypot(this.x - bc.x, this.y - bc.y) || 1);
    const uy = (this.y - bc.y) / (Math.hypot(this.x - bc.x, this.y - bc.y) || 1);
    const ax = Math.cos(this.angle);
    const ay = Math.sin(this.angle);
    let h = 0;
    const parts = this.segs.flatMap((s) => s.parts).reverse();
    for (const id of parts.slice(0, 14)) {
      const a = this.random() * Math.PI * 2;
      const s = 6 + this.random() * 22;
      this.debris.push({
        x: this.x + ax * h + ux * 1,
        y: this.y + ay * h + uy * 1,
        vx: c.vx + Math.cos(a) * s + ux * (6 + this.random() * 14),
        vy: c.vy + Math.sin(a) * s + uy * (6 + this.random() * 14),
        angle: this.angle + (this.random() - 0.5),
        spin: (this.random() - 0.5) * 5,
        parts: [id],
        age: 0,
      });
      h += part(id).height;
    }
    this.segs = [{ parts: [], fuel: 0 }];
    this.explode(this.x, this.y, c.vx, c.vy, 90);
    this.emit('fail', reason);
  }

  // ---------------------------------------------------------------- Station

  private checkDocking(): void {
    // Grobe Vorprüfung, damit nicht in jedem Schritt die genaue Rechnung nötig ist.
    const [sx, sy] = stationState(this.t);
    if (Math.abs(this.x - sx) > 200 || Math.abs(this.y - sy) > 200) return;
    // Kurz auf die Station umschalten, um Abstand und Tempo zu messen – das Ziel bleibt.
    const target = this.target;
    this.target = 'station';
    const ti = this.targetInfo();
    this.target = target;
    if (!ti || ti.distance > DOCK_DISTANCE || ti.speed > DOCK_SPEED) return;
    // Angedockt ist die Station das Ziel (für Anzeige und Abdocken).
    this.target = 'station';
    this.status = 'docked';
    this.throttle = 0;
    this.warpIndex = 0;
    this.warpTarget = null;
    this.translate = { x: 0, y: 0 };
    this.shake = Math.max(this.shake, 0.18);
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

  private emit(kind: FlightEvent['kind'], text: string, title?: string, goal?: GoalId): void {
    this.events.push({ id: eventId++, kind, text, title, goal });
    if (this.events.length > 30) this.events.shift();
  }

  private goal(id: GoalId): void {
    if (this.goals.has(id)) return;
    this.goals.add(id);
    const g = goalById(id);
    this.emit('goal', g.text, `★ ${g.title} · +${g.points} Punkte`, id);
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
    } else if (ref === MERCURY) {
      this.goal('mercury');
    } else if (ref === VENUS) {
      this.goal('venus');
    } else if (ref === MARS || ref === PHOBOS) {
      this.goal('mars');
      const o = this.orbit(MARS);
      if (o.bound && o.periapsis > MARS.atmosphere && o.apoapsis + MARS.radius < MARS.hill)
        this.goal('marsorbit');
    } else if (ref === JUPITER || ref === EUROPA) {
      this.goal('jupiter');
      if (ref === EUROPA) this.goal('europa');
      const o = this.orbit(JUPITER);
      if (o.bound && o.periapsis > JUPITER.atmosphere && o.apoapsis + JUPITER.radius < JUPITER.hill)
        this.goal('jupiterorbit');
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
    const air = this.air();
    const thick = air.rho > 0.01;
    const n = thick ? 3 : 1;
    const f = part([...this.active.parts].reverse().find((id) => part(id).thrust > 0) ?? 'falke');
    if (f.flame === 'ionen') return;
    for (let i = 0; i < n; i++) {
      const spread = (this.random() - 0.5) * 14;
      const speed = 40 + this.random() * 30;
      this.particles.push({
        x: this.x - ax * 2,
        y: this.y - ay * 2,
        vx: this.vx - ax * speed - ay * spread,
        vy: this.vy - ay * speed + ax * spread,
        life: 0,
        max: thick ? 3 + this.random() * 2.5 : 0.5,
        size: 2.5 + this.random() * 2,
        kind: thick ? 'smoke' : 'spark',
      });
    }
    // Der Strahl trifft auf den Boden: Staub und Rauch quellen zur Seite.
    if (air.altitude < 60 + this.length && air.body.solid) {
      const c = this.state(air.body);
      const r = Math.hypot(this.x - c.x, this.y - c.y) || 1;
      const ux = (this.x - c.x) / r;
      const uy = (this.y - c.y) / r;
      const gx = c.x + ux * air.body.radius;
      const gy = c.y + uy * air.body.radius;
      const k = this.throttle * (1 - air.altitude / (60 + this.length));
      for (let i = 0; i < 3; i++) {
        if (this.random() > k) continue;
        const side = this.random() < 0.5 ? -1 : 1;
        const s = 15 + this.random() * 55;
        this.particles.push({
          x: gx + uy * side * 3,
          y: gy - ux * side * 3,
          vx: c.vx + uy * side * s + ux * this.random() * 8,
          vy: c.vy - ux * side * s + uy * this.random() * 8,
          life: 0,
          max: 3 + this.random() * 3,
          size: 4 + this.random() * 4,
          kind: 'dust',
        });
      }
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  /** Glühende Funken beim Wiedereintritt, die nach hinten wegfliegen. */
  private reentrySparks(): void {
    const air = this.air();
    if (air.rho <= 0.001) return;
    const c = this.state(air.body);
    const rvx = this.vx - c.vx;
    const rvy = this.vy - c.vy;
    const rv = Math.hypot(rvx, rvy);
    const k = Math.min(1, (rv - 1300) / 1500) * Math.min(1, air.rho / 0.01);
    if (k <= 0.05) return;
    const n = this.random() < k * 3 - Math.floor(k * 3) ? Math.ceil(k * 3) : Math.floor(k * 3);
    const [cx, cy] = this.center();
    for (let i = 0; i < n; i++) {
      const s = 0.2 + this.random() * 0.4;
      const side = (this.random() - 0.5) * 30;
      this.particles.push({
        x: cx + (rvx / rv) * 3,
        y: cy + (rvy / rv) * 3,
        vx: c.vx + rvx * s - (rvy / rv) * side,
        vy: c.vy + rvy * s + (rvx / rv) * side,
        life: 0,
        max: 0.3 + this.random() * 0.5,
        size: 0.6 + this.random() * 1.2,
        kind: 'spark',
      });
    }
  }

  /** Kleine Wolke (Stufentrennung, Landung). */
  private puff(x: number, y: number, n: number, kind: Particle['kind'] = 'spark'): void {
    for (let i = 0; i < n; i++) {
      const a = this.random() * Math.PI * 2;
      const s = 2 + this.random() * 10;
      this.particles.push({
        x,
        y,
        vx: this.vx + Math.cos(a) * s,
        vy: this.vy + Math.sin(a) * s,
        life: 0,
        max: 0.6 + this.random() * 1.2,
        size: 1.5 + this.random() * 2.5,
        kind,
      });
    }
  }

  explode(x: number, y: number, vx: number, vy: number, n: number): void {
    // Ohne Luft gibt es keinen Rauch – nur Feuerball und Funken (und Staub vom Boden).
    const airless = this.air().rho <= 0;
    for (let i = 0; i < n; i++) {
      const a = this.random() * Math.PI * 2;
      const s = 5 + this.random() * 45;
      this.particles.push({
        x,
        y,
        vx: vx + Math.cos(a) * s,
        vy: vy + Math.sin(a) * s,
        life: 0,
        max: 0.8 + this.random() * 2.2,
        size: 2 + this.random() * 6,
        kind: i % 3 === 0 ? (airless ? 'dust' : 'smoke') : i % 7 === 0 ? 'spark' : 'fire',
      });
    }
  }

  private updateParticles(dt: number): void {
    // Rauch und Staub bremsen gegen die Luft des nächsten Körpers ab – so entsteht eine Spur.
    const near = this.air();
    const c = this.state(near.body);
    const thick = near.rho > 0.002;
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag =
        p.kind === 'smoke' ? 2.2 : p.kind === 'dust' ? 1.6 : p.kind === 'fire' ? 1.4 : 0.1;
      const k = Math.min(1, drag * dt * (thick || p.kind === 'dust' ? 1 : 0.15));
      p.vx += (c.vx - p.vx) * k;
      p.vy += (c.vy - p.vy) * k;
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
        // Luftwiderstand in der Lufthülle des nächsten Körpers (relativ zu dessen Luft).
        for (const b of BODIES) {
          if (b.atmosphere <= 0) continue;
          const [bx, by, bvx, bvy] = bodyState(b, t);
          const rho = densityAt(b, Math.hypot(d.x - bx, d.y - by) - b.radius);
          if (rho <= 0) continue;
          const rvx = d.vx - bvx;
          const rvy = d.vy - bvy;
          const f = 1 / (1 + ((0.5 * rho * 3) / 2000) * Math.hypot(rvx, rvy) * dt);
          d.vx = bvx + rvx * f;
          d.vy = bvy + rvy * f;
          break;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        t += dt;
        left -= dt;
        for (const b of BODIES) {
          const [bx, by] = bodyState(b, t);
          if (Math.hypot(d.x - bx, d.y - by) < b.radius) {
            const [, , bvx, bvy] = bodyState(b, t);
            if (simDt < 1) this.explode(d.x, d.y, bvx, bvy, 18);
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
   * Ein geplantes Manöver wird zu seiner Zeit angewendet; danach folgt die geplante Bahn.
   */
  predict(maxPoints = 3000, skipPre = false): Prediction {
    const xs = new Float64Array(maxPoints);
    const ys = new Float64Array(maxPoints);
    const vxs = new Float64Array(maxPoints);
    const vys = new Float64Array(maxPoints);
    const ts = new Float64Array(maxPoints);
    const ref = this.refBody();
    const s: Coast = { x: this.x, y: this.y, vx: this.vx, vy: this.vy, t: this.t };
    const t0 = s.t;
    let n = 0;
    const push = (): void => {
      xs[n] = s.x;
      ys[n] = s.y;
      vxs[n] = s.vx;
      vys[n] = s.vy;
      ts[n] = s.t;
      n++;
    };
    push();
    const result: Prediction = {
      xs,
      ys,
      vxs,
      vys,
      ts,
      n,
      ref,
      impact: null,
      encounter: null,
      closest: null,
      low: -1,
      high: -1,
      preEnd: -1,
      nodeIndex: -1,
      nodeRef: null,
      planLow: -1,
      planHigh: -1,
    };
    if (this.status !== 'flying') return result;

    const node = this.node;
    let pending = false;
    let postStart = t0;
    const applyNode = (): void => {
      const nd = node!;
      let dx: number;
      let dy: number;
      if (nd.frozen) {
        const r = this.nodeRemaining();
        dx = r.x;
        dy = r.y;
      } else {
        // Aus dem vorhergesagten Zustand rechnen, ohne das echte Manöver zu verändern.
        const d = nodeDelta(nd, s.x, s.y, s.vx, s.vy);
        dx = d.dx;
        dy = d.dy;
      }
      s.vx += dx;
      s.vy += dy;
      result.nodeRef = dominantBody(s.x, s.y, s.t);
    };
    if (node) {
      if (node.frozen || node.t <= s.t + 1e-6) {
        // Das Brennen läuft (oder ist fällig): den Rest sofort anwenden.
        applyNode();
        result.preEnd = 0;
        result.nodeIndex = 0;
      } else pending = true;
    }
    const preLimit = pending ? Math.min(node!.t - t0, horizonFor(s)) : 0;
    // Für den Bordcomputer zählt nur die Bahn nach dem Manöver.
    const preCap = skipPre ? 1 : Math.floor(maxPoints / 2);
    let postHorizon = pending ? 0 : horizonFor(s);

    const others = BODIES.filter((b) => b !== ref && b.id !== ref.parent && b !== SUN);
    const inside = new Map<Body, boolean>();
    for (const b of others) {
      const [bx, by] = bodyState(b, s.t);
      inside.set(b, Math.hypot(s.x - bx, s.y - by) < b.hill);
    }
    let minTarget = Infinity;
    const target = this.target;
    const targetBody = target && target !== 'station' ? bodyById(target) : null;

    for (;;) {
      if (pending) {
        if (n >= preCap || s.t - t0 >= preLimit) {
          // Bis zum Manöver ohne Speichern vorspulen.
          result.preEnd = n - 1;
          if (!coastTo(s, node!.t, 150_000)) break;
          push();
          applyNode();
          vxs[n - 1] = s.vx;
          vys[n - 1] = s.vy;
          result.nodeIndex = n - 1;
          pending = false;
          postStart = s.t;
          postHorizon = horizonFor(s);
          continue;
        }
      } else if (n >= maxPoints || s.t - postStart >= postHorizon) break;

      let dt = coastDt(s.x, s.y, s.t);
      let hitNode = false;
      if (pending && s.t + dt >= node!.t) {
        dt = node!.t - s.t;
        hitNode = true;
      }
      if (dt > 1e-9) coastStep(s, dt);
      push();
      const i = n - 1;
      for (const b of BODIES) {
        const [bx, by] = bodyState(b, s.t);
        if (Math.hypot(s.x - bx, s.y - by) < b.radius) result.impact = b;
      }
      if (result.impact) break;
      for (const b of others) {
        const [bx, by] = bodyState(b, s.t);
        const d = Math.hypot(s.x - bx, s.y - by);
        const was = inside.get(b)!;
        const now = d < b.hill;
        if (now && !was && !result.encounter)
          result.encounter = { body: b, t: s.t, distance: d, index: i, enter: i, exit: i };
        const enc = result.encounter;
        if (enc?.body === b && now) {
          enc.exit = i;
          if (d < enc.distance) {
            enc.distance = d;
            enc.t = s.t;
            enc.index = i;
          }
        }
        inside.set(b, now);
      }
      // Nächste Annäherung ans Ziel – mit Manöver erst auf der geplanten Bahn.
      if (target && (!node || !pending)) {
        let d: number;
        if (targetBody) {
          const [bx, by] = bodyState(targetBody, s.t);
          d = Math.hypot(s.x - bx, s.y - by) - targetBody.radius;
        } else {
          const [sx, sy] = stationState(s.t);
          d = Math.hypot(s.x - sx, s.y - sy);
        }
        if (d < minTarget) {
          minTarget = d;
          result.closest = { t: s.t, distance: d, index: i };
        }
      }
      if (hitNode) {
        applyNode();
        vxs[i] = s.vx;
        vys[i] = s.vy;
        result.preEnd = i;
        result.nodeIndex = i;
        pending = false;
        postStart = s.t;
        postHorizon = horizonFor(s);
      }
    }
    result.n = n;
    // Tiefster und höchster Punkt – vor dem Manöver relativ zum jetzigen Bezugskörper, danach
    // relativ zum Körper am Manöver.
    const extremes = (from: number, to: number, body: Body): [number, number] => {
      let low = -1;
      let high = -1;
      let lowD = Infinity;
      let highD = -Infinity;
      let last = to + 1;
      for (let i = from + 1; i <= to; i++) {
        const [cx, cy] = bodyState(body, ts[i]!);
        const d = Math.hypot(xs[i]! - cx, ys[i]! - cy);
        if (d > body.hill) {
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
      const endsInImpact = !!result.impact && to === n - 1;
      if (low >= last - 2 && !endsInImpact) low = -1;
      if (endsInImpact && low === n - 1) low = -1;
      if (high >= last - 2) high = -1;
      return [low, high];
    };
    if (result.nodeIndex >= 0 && result.nodeRef) {
      if (result.preEnd > 0) [result.low, result.high] = extremes(0, result.preEnd, ref);
      [result.planLow, result.planHigh] = extremes(result.nodeIndex, n - 1, result.nodeRef);
    } else [result.low, result.high] = extremes(0, n - 1, ref);
    return result;
  }
}
