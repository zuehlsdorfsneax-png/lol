import {
  DAY,
  G,
  INTEGRATORS,
  NBody,
  YEAR,
  buildScenario,
  dynamicalTimescale,
  integrate,
  jacobiCheck,
  orbitalElements,
  pullRatio,
  tidalRatio,
  ESCAPE_HILL_FACTOR,
  type BodyIndices,
  type IntegratorId,
  type JacobiCheck,
  type OrbitalElements,
  type ScenarioInfo,
  type ScenarioParams,
} from '../physics';
import { SeriesBuffer, TrailBuffer } from './buffers';

export interface SimSettings {
  integrator: IntegratorId;
  /** Schrittweite automatisch an enge Begegnungen anpassen. */
  adaptive: boolean;
  /** Genauigkeit der adaptiven Schrittweite (Anteil der kürzesten Zeitskala). */
  eta: number;
  /** Feste Schrittweite in s (nur ohne `adaptive`). */
  fixedDt: number;
  /** Obergrenze der Schrittweite in s. */
  maxDt: number;
  /** Unterschreiten der Roche-Grenze als Ereignis melden. */
  rocheEvents: boolean;
  /** Abstand der Spurpunkte in s. */
  trailInterval: number;
  trailCapacity: number;
}

export const DEFAULT_SETTINGS: SimSettings = {
  integrator: 'verlet',
  adaptive: true,
  eta: 0.01,
  fixedDt: 3600,
  maxDt: 2 * DAY,
  rocheEvents: true,
  trailInterval: DAY / 4,
  trailCapacity: 6000,
};

/** Testteilchen werden mit bis zu dreifach größeren Schritten gerechnet als der Mond. */
const PARTICLE_STEP_FACTOR = 3;

export type SimEventKind = 'crash' | 'roche' | 'escape' | 'sun' | 'collision';

export interface SimEvent {
  kind: SimEventKind;
  time: number;
  title: string;
  text: string;
}

export const SERIES_KEYS = [
  'distance',
  'eccentricity',
  'semiMajorAxis',
  'periapsis',
  'hillFraction',
  'energyError',
  'omega',
] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export interface LiveStats {
  time: number;
  steps: number;
  dt: number;
  moonAlive: boolean;
  distance: number;
  relativeSpeed: number;
  elements: OrbitalElements | null;
  hillRadius: number;
  hillFraction: number;
  escapeSpeed: number;
  pullRatio: number;
  tidalRatio: number;
  energyError: number;
  sunDistance: number;
  jacobi: JacobiCheck | null;
  particles: { total: number; alive: number; crashed: number; escaped: number };
}

/** Körper, deren Spur aufgezeichnet wird (Reihenfolge = Spalten im TrailBuffer). */
export type TrackedBody = 'sun' | 'earth' | 'moon' | 'intruder';
export const TRACKED: readonly TrackedBody[] = ['sun', 'earth', 'moon', 'intruder'];

/**
 * Laufende Simulation des Erde–Mond–Sonne-Systems mit Ereigniserkennung, Bahnspuren und
 * Messreihen. Die Zeitsteuerung (wie viel pro Bild gerechnet wird) übernimmt die Oberfläche.
 */
export class Simulation {
  readonly params: ScenarioParams;
  readonly info: ScenarioInfo;
  readonly indices: BodyIndices;
  readonly sys: NBody;
  settings: SimSettings;
  time = 0;
  steps = 0;
  lastDt = 0;
  /** Bezugswert für den Energiefehler (wird nach einem Schub neu gesetzt). */
  initialEnergy: number;
  readonly trail: TrailBuffer;
  readonly series: SeriesBuffer<SeriesKey>;
  readonly events: SimEvent[] = [];
  /** Ereignis, das bestätigt werden muss, bevor weitergerechnet wird. */
  pending: SimEvent | null = null;
  /** Kleinster und größter Abstand Erde–Mond seit dem Start. */
  minDistance = Infinity;
  maxDistance = 0;
  /** Kleinster Abstand Störkörper–Erde. */
  intruderClosest = Infinity;

  private nextTrail = 0;
  private rocheArmed = true;
  private escapeReported = false;
  private readonly particleEscaped: Uint8Array;
  private particleCrashed = 0;
  private particleEscapedCount = 0;
  private readonly trailCoords: Float64Array;

  constructor(params: ScenarioParams, settings: Partial<SimSettings> = {}) {
    this.params = params;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    const scenario = buildScenario(params);
    this.info = scenario.info;
    this.indices = scenario.indices;
    this.sys = new NBody(scenario.bodies);
    this.initialEnergy = this.sys.energy();
    this.trail = new TrailBuffer(this.settings.trailCapacity, TRACKED.length);
    this.trailCoords = new Float64Array(TRACKED.length * 2);
    this.series = new SeriesBuffer(SERIES_KEYS, 8192, DAY / 2);
    this.particleEscaped = new Uint8Array(this.sys.n);
    this.record();
  }

  get particleCount(): number {
    return this.indices.firstParticle < 0 ? 0 : this.sys.n - this.indices.firstParticle;
  }

  get moonAlive(): boolean {
    return this.sys.alive[this.indices.moon] === 1 && this.sys.alive[this.indices.earth] === 1;
  }

  indexOf(body: TrackedBody): number {
    return this.indices[body];
  }

  /** Rechnet bis zu `duration` Sekunden weiter, höchstens `maxSteps` Schritte. */
  advance(duration: number, maxSteps = Infinity): { steps: number; completed: boolean } {
    const target = this.time + duration;
    let steps = 0;
    while (this.time < target && steps < maxSteps && !this.pending) {
      this.step(target - this.time);
      steps++;
    }
    return { steps, completed: this.time >= target || this.pending !== null };
  }

  /** Ein einzelner Integrationsschritt (höchstens `limit` Sekunden). */
  step(limit = Infinity): void {
    const { settings, sys } = this;
    let dt = settings.adaptive
      ? Math.min(settings.eta * dynamicalTimescale(sys, PARTICLE_STEP_FACTOR), settings.maxDt)
      : settings.fixedDt;
    dt = Math.min(dt, limit);
    if (!(dt > 0)) return;
    integrate(sys, settings.integrator, dt);
    this.time += dt;
    this.steps++;
    this.lastDt = dt;
    this.checkEvents();
    this.record();
  }

  acknowledge(): void {
    this.pending = null;
  }

  /**
   * Schub für den Mond (wie ein Raketentriebwerk): Die Geschwindigkeit relativ zur Erde wird
   * mit `factor` multipliziert. Energie ist danach eine andere – der Bezugswert wird neu gesetzt.
   */
  kickMoon(factor: number): void {
    if (!this.moonAlive) return;
    const { sys } = this;
    const { earth, moon } = this.indices;
    const dvx = sys.vx[moon]! - sys.vx[earth]!;
    const dvy = sys.vy[moon]! - sys.vy[earth]!;
    sys.vx[moon] = sys.vx[earth]! + dvx * factor;
    sys.vy[moon] = sys.vy[earth]! + dvy * factor;
    this.initialEnergy = sys.energy();
    this.escapeReported = false;
    this.rocheArmed = true;
  }

  /** Bahnelemente des Mondes relativ zur Erde (null, wenn es keinen Mond mehr gibt). */
  moonElements(): OrbitalElements | null {
    if (!this.moonAlive) return null;
    const { sys } = this;
    const { earth, moon } = this.indices;
    return orbitalElements(
      G * (sys.mass[earth]! + sys.mass[moon]!),
      sys.x[moon]! - sys.x[earth]!,
      sys.y[moon]! - sys.y[earth]!,
      sys.vx[moon]! - sys.vx[earth]!,
      sys.vy[moon]! - sys.vy[earth]!,
    );
  }

  /** Aktueller Hill-Radius der Erde (mit dem momentanen Abstand zur Sonne). */
  hillRadius(): number {
    const { sun, earth, moon } = this.indices;
    const { sys } = this;
    if (sun < 0 || !sys.alive[sun] || !sys.alive[earth]) return Infinity;
    const m = sys.mass[earth]! + (sys.alive[moon] ? sys.mass[moon]! : 0);
    return sys.distance(sun, earth) * Math.cbrt(m / (3 * sys.mass[sun]!));
  }

  energyError(): number {
    return Math.abs((this.sys.energy() - this.initialEnergy) / this.initialEnergy);
  }

  jacobi(): JacobiCheck | null {
    const { sun, earth, moon } = this.indices;
    const { sys } = this;
    if (sun < 0 || !sys.alive[sun] || !this.moonAlive) return null;
    const body = (i: number) => ({ x: sys.x[i]!, y: sys.y[i]!, vx: sys.vx[i]!, vy: sys.vy[i]! });
    const ms = sys.mass[sun]!;
    const me = sys.mass[earth]!;
    return jacobiCheck(G * (ms + me), me / (ms + me), body(sun), body(earth), body(moon));
  }

  stats(): LiveStats {
    const { sys } = this;
    const { sun, earth, moon } = this.indices;
    const el = this.moonElements();
    const hill = this.hillRadius();
    const sunDistance = sun >= 0 && sys.alive[sun] ? sys.distance(sun, earth) : Infinity;
    const d = el?.r ?? NaN;
    const mEarth = sys.mass[earth]!;
    const mu = G * (mEarth + (el ? sys.mass[moon]! : 0));
    let alive = 0;
    for (let i = Math.max(this.indices.firstParticle, 0); i < sys.n && this.indices.firstParticle >= 0; i++) {
      if (sys.alive[i] && !this.particleEscaped[i]) alive++;
    }
    return {
      time: this.time,
      steps: this.steps,
      dt: this.lastDt,
      moonAlive: this.moonAlive,
      distance: d,
      relativeSpeed: el?.v ?? NaN,
      elements: el,
      hillRadius: hill,
      hillFraction: d / hill,
      escapeSpeed: Math.sqrt((2 * mu) / d),
      pullRatio: sun >= 0 && el ? pullRatio(sys.mass[sun]!, sys.distance(sun, moon), mEarth, d) : 0,
      tidalRatio: sun >= 0 && el ? tidalRatio(sys.mass[sun]!, sunDistance, mEarth, d) : 0,
      energyError: this.energyError(),
      sunDistance,
      jacobi: this.jacobi(),
      particles: {
        total: this.particleCount,
        alive,
        crashed: this.particleCrashed,
        escaped: this.particleEscapedCount,
      },
    };
  }

  private raise(kind: SimEventKind, title: string, text: string): void {
    const event: SimEvent = { kind, time: this.time, title, text };
    this.events.push(event);
    this.pending = event;
  }

  private checkEvents(): void {
    const { sys, indices, info } = this;
    const { sun, earth, moon, intruder } = indices;
    const sources = sys.sources;

    // Zusammenstöße massereicher Körper.
    for (let a = 0; a < sources.length; a++) {
      for (let b = a + 1; b < sources.length; b++) {
        const i = sources[a]!;
        const j = sources[b]!;
        if (sys.distance(i, j) >= sys.radius[i]! + sys.radius[j]!) continue;
        const pair = new Set([i, j]);
        const heavy = sys.mass[i]! >= sys.mass[j]! ? i : j;
        const light = heavy === i ? j : i;
        const speed = Math.hypot(sys.vx[i]! - sys.vx[j]!, sys.vy[i]! - sys.vy[j]!) / 1000;
        sys.merge(heavy, light);
        if (pair.has(earth) && pair.has(moon)) {
          this.raise(
            'crash',
            'Der Mond ist auf die Erde gestürzt',
            `Aufprall mit ${speed.toFixed(1)} km/s nach ${formatDuration(this.time)}. Die Bahn führte näher an die Erde heran, als Erd- und Mondradius zusammen (${Math.round((info.earthRadius + info.moonRadius) / 1000).toLocaleString('de-DE')} km). In Wirklichkeit hätten die Gezeitenkräfte den Mond schon an der Roche-Grenze zerrissen.`,
          );
        } else if (pair.has(sun)) {
          this.raise(
            'sun',
            `${sys.meta[light]!.name} ist in die Sonne gestürzt`,
            `Nach ${formatDuration(this.time)} hat ${sys.meta[light]!.name} die Sonnenoberfläche erreicht.`,
          );
        } else {
          this.raise(
            'collision',
            `Zusammenstoß: ${sys.meta[heavy]!.name} und ${sys.meta[light]!.name}`,
            `Nach ${formatDuration(this.time)} mit ${speed.toFixed(1)} km/s. Die Körper wurden zu einem vereinigt (Impulserhaltung).`,
          );
        }
        return;
      }
    }

    if (intruder >= 0 && sys.alive[intruder] && sys.alive[earth]) {
      this.intruderClosest = Math.min(this.intruderClosest, sys.distance(intruder, earth));
    }

    if (this.moonAlive) {
      const d = sys.distance(earth, moon);
      this.minDistance = Math.min(this.minDistance, d);
      this.maxDistance = Math.max(this.maxDistance, d);
      if (this.settings.rocheEvents && this.rocheArmed && d < info.rocheFluid) {
        this.rocheArmed = false;
        this.raise(
          'roche',
          'Roche-Grenze unterschritten',
          `Der Mond ist der Erde bis auf ${Math.round(d / 1000).toLocaleString('de-DE')} km nahegekommen. Innerhalb von ${Math.round(info.rocheFluid / 1000).toLocaleString('de-DE')} km übersteigen die Gezeitenkräfte der Erde die Eigengravitation des Mondes – er würde zu einem Ring zerrissen, wie ihn Saturn hat. Die Simulation behandelt ihn weiter als Punktmasse.`,
        );
      } else if (d > 1.3 * info.rocheFluid) {
        this.rocheArmed = true;
      }
      if (!this.escapeReported && this.moonEscaped(d)) {
        this.escapeReported = true;
        const hill = this.hillRadius();
        this.raise(
          'escape',
          'Der Mond hat die Erde verlassen',
          Number.isFinite(hill)
            ? `Nach ${formatDuration(this.time)} ist der Mond ${(d / hill).toFixed(1)} Hill-Radien entfernt. Dort überwiegt die Anziehung der Sonne – er umkreist jetzt die Sonne statt der Erde.`
            : `Nach ${formatDuration(this.time)}: Der Mond ist schneller als die Fluchtgeschwindigkeit und entfernt sich für immer.`,
        );
      }
    }

    // Testteilchen: Absturz und Flucht zählen.
    const first = indices.firstParticle;
    if (first >= 0) {
      const hill = this.hillRadius();
      const escapeLimit = Number.isFinite(hill) ? ESCAPE_HILL_FACTOR * hill : 50 * info.moonDistance;
      for (let p = first; p < sys.n; p++) {
        if (!sys.alive[p]) continue;
        for (const s of sources) {
          if (sys.distance(p, s) < sys.radius[s]!) {
            sys.alive[p] = 0;
            this.particleCrashed++;
            break;
          }
        }
        if (sys.alive[p] && !this.particleEscaped[p] && sys.distance(p, earth) > escapeLimit) {
          this.particleEscaped[p] = 1;
          this.particleEscapedCount++;
        }
      }
    }
  }

  private moonEscaped(d: number): boolean {
    const hill = this.hillRadius();
    if (Number.isFinite(hill)) return d > ESCAPE_HILL_FACTOR * hill;
    const el = this.moonElements();
    return el !== null && !el.bound && d > 5 * this.info.moonDistance;
  }

  private record(): void {
    const { sys } = this;
    if (this.time >= this.nextTrail) {
      TRACKED.forEach((name, k) => {
        const i = this.indices[name];
        const alive = i >= 0 && sys.alive[i] === 1;
        this.trailCoords[2 * k] = alive ? sys.x[i]! : NaN;
        this.trailCoords[2 * k + 1] = alive ? sys.y[i]! : NaN;
      });
      this.trail.push(this.time, this.trailCoords);
      this.nextTrail = this.time + this.settings.trailInterval;
    }
    if (this.series.due(this.time)) {
      const el = this.moonElements();
      const hill = this.hillRadius();
      this.series.push(this.time, {
        distance: el?.r ?? NaN,
        eccentricity: el?.e ?? NaN,
        semiMajorAxis: el?.bound ? el.a : NaN,
        periapsis: el?.periapsis ?? NaN,
        hillFraction: el ? el.r / hill : NaN,
        energyError: this.energyError(),
        omega: el?.omega ?? NaN,
      });
    }
  }
}

export function integratorName(id: IntegratorId): string {
  return INTEGRATORS[id].name;
}

/** Menschenlesbare Dauer: Stunden, Tage oder Jahre. */
export function formatDuration(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < DAY) return `${(seconds / 3600).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden`;
  if (abs < 2 * YEAR) return `${(seconds / DAY).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tagen`;
  return `${(seconds / YEAR).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Jahren`;
}
