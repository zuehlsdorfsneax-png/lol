import { part } from './parts';
import type { Flight } from './flight';
import { EARTH, G0, type Body } from './world';

export type PilotPhase = 'ascent' | 'coast' | 'circularize' | 'done';

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Dreht die Rakete über die normale Steuerung auf den Zielwinkel. */
export function steerTo(f: Flight, target: number): number {
  const error = wrap(f.angle - target);
  // Im Zeitraffer dreht die Rakete pro Bild weiter – dann sanfter lenken.
  const gain = 2.5 / Math.max(1, f.warp);
  f.turn = Math.max(-1, Math.min(1, error * gain - f.angVel * 0.9));
  return Math.abs(error);
}

/**
 * Hilfe-Pilot „Umlaufbahn“: Senkrechtstart, dann eine Schwerkraftwende (die Rakete neigt sich mit
 * der Höhe immer weiter zur Seite), Triebwerk aus, sobald der höchste Bahnpunkt hoch genug ist,
 * und am höchsten Punkt waagerecht Gas geben, bis die Bahn rund ist. Auf der Erde geht es auf
 * 75 km, auf Körpern ohne Luft auf eine niedrige Bahn knapp über den Bergen.
 */
export class OrbitPilot {
  phase: PilotPhase = 'ascent';
  readonly body: Body;
  readonly apoapsis: number;
  private readonly turnStart: number;
  private readonly turnEnd: number;

  constructor(body: Body = EARTH) {
    this.body = body;
    if (body === EARTH) {
      this.apoapsis = 75_000;
      this.turnStart = 1_000;
      this.turnEnd = 55_000;
    } else if (body.atmosphere > 0) {
      this.apoapsis = body.atmosphere + 30_000;
      this.turnStart = 800;
      this.turnEnd = body.atmosphere * 1.3;
    } else {
      this.apoapsis = Math.max(12_000, body.radius * 0.08);
      this.turnStart = 300;
      this.turnEnd = this.apoapsis * 0.4;
    }
  }

  update(f: Flight): PilotPhase {
    if (f.status === 'crashed') return (this.phase = 'done');
    f.sas = 'off';
    const b = this.body;
    const rel = f.relative(b);
    const up = Math.atan2(rel.ry, rel.rx);
    const h = rel.altitude;
    const o = f.orbit(b);
    const safe = b === EARTH ? b.atmosphere : Math.max(b.atmosphere, this.apoapsis * 0.6);
    // Leere Stufe abwerfen, solange noch eine übrig ist.
    if (f.status === 'flying' && f.active.fuel <= 0 && f.segs.length > 1) f.stage();

    if (this.phase === 'ascent') {
      const pitch = Math.min(
        1.35,
        (Math.PI / 2) * Math.pow(Math.max(0, h - this.turnStart) / this.turnEnd, 0.55),
      );
      steerTo(f, up - pitch);
      f.throttle = 1;
      if (o.apoapsis >= this.apoapsis) {
        f.throttle = 0;
        this.phase = 'coast';
      }
    } else if (this.phase === 'coast') {
      f.throttle = 0;
      // In Flugrichtung, waagerecht ausrichten.
      steerTo(f, up - Math.PI / 2);
      // Nachregeln, falls der Luftwiderstand den höchsten Punkt gesenkt hat.
      if (h < b.atmosphere && o.apoapsis < this.apoapsis - 3_000) f.throttle = 1;
      const radial = (rel.rx * rel.vx + rel.ry * rel.vy) / rel.r;
      const { thrust } = f.engine();
      const accel = thrust > 0 ? thrust / f.mass : 1;
      const needed = Math.max(0, Math.sqrt(b.mu / (b.radius + h)) - o.v);
      const burnTime = needed / accel;
      const timeToTop = radial / (b.mu / (b.radius + h) ** 2);
      if (h > safe && timeToTop < burnTime / 2 + 1) this.phase = 'circularize';
    } else if (this.phase === 'circularize') {
      // Waagerecht, leicht gegen das Sinken angesteuert.
      const radial = (rel.rx * rel.vx + rel.ry * rel.vy) / rel.r;
      const lift = Math.max(-0.3, Math.min(0.3, -radial / 150));
      steerTo(f, up - Math.PI / 2 + lift);
      f.throttle = 1;
      if (o.bound && o.periapsis > safe + (b === EARTH ? 5_000 : 1_000)) {
        f.throttle = 0;
        f.turn = 0;
        this.phase = 'done';
      }
    }
    if (this.phase === 'done') {
      f.throttle = 0;
      f.turn = 0;
    }
    return this.phase;
  }
}

/** Mittlerer spezifischer Impuls der aktiven Stufe (für Brenndauern). */
export function activeIsp(f: Flight): number {
  let thrust = 0;
  let flow = 0;
  for (const id of f.active.parts) {
    const p = part(id);
    if (p.thrust > 0) {
      thrust += p.thrust;
      flow += p.thrust / (p.isp * G0);
    }
  }
  return flow > 0 ? thrust / (flow * G0) : 0;
}

export type ExecPhase = 'align' | 'wait' | 'burn' | 'done' | 'failed';

/**
 * Führt das geplante Manöver aus: aufs Manöver ausrichten (SAS), per Zeitsprung bis kurz davor
 * vorspulen, zur richtigen Zeit zünden, gegen Ende sanft drosseln und leere Stufen abwerfen.
 */
export class NodeExecutor {
  phase: ExecPhase = 'align';
  message = '';

  update(f: Flight): ExecPhase {
    const node = f.node;
    if (!node) {
      f.throttle = 0;
      return (this.phase = 'done');
    }
    if (f.status !== 'flying') {
      f.throttle = 0;
      this.message = 'Nur im Flug möglich.';
      return (this.phase = 'failed');
    }
    f.sas = 'maneuver';
    f.turn = 0;
    const rem = f.nodeRemaining();
    const dir = Math.atan2(rem.y, rem.x);
    const err = Math.abs(wrap(f.angle - dir));
    const start = f.nodeBurnStart();
    if (f.active.fuel <= 0 && f.segs.length > 1 && f.throttle > 0) f.stage();
    if (!node.frozen && f.t < start - 1) {
      f.throttle = 0;
      const aligned = err < 0.05 && Math.abs(f.angVel) < 0.05;
      if (aligned && f.warpTarget === null && start - f.t > 25) f.warpTo(start - 12);
      return (this.phase = aligned ? 'wait' : 'align');
    }
    if (f.deltaV() <= 0.01 && !f.infiniteFuel) {
      if (f.segs.length > 1) f.stage();
      else {
        f.throttle = 0;
        this.message = 'Kein Treibstoff mehr – das Manöver lässt sich nicht beenden.';
        return (this.phase = 'failed');
      }
    }
    const { thrust } = f.engine();
    const accel = thrust / f.mass;
    if (accel <= 0) {
      f.throttle = 0;
      if (f.segs.length > 1) f.stage();
      return (this.phase = 'burn');
    }
    // Zu Beginn erst ausrichten, am Ende sanft auslaufen lassen.
    f.throttle = err < 0.12 ? Math.max(0.005, Math.min(1, rem.mag / (accel * 1.2))) : 0;
    // Lange Brennphasen im Zeitraffer (so weit die Physik es erlaubt).
    const seconds = rem.mag / Math.max(accel, 1e-6);
    const want = seconds > 40 ? f.maxWarpIndex() : seconds > 12 ? Math.min(2, f.maxWarpIndex()) : 0;
    if (f.warpIndex !== want) f.setWarp(want);
    return (this.phase = 'burn');
  }
}

export type LandPhase = 'aero' | 'chute' | 'brake' | 'fall' | 'suicide' | 'done' | 'failed';

/**
 * Lande-Autopilot: In einer Atmosphäre erst mit dem Hitzeschild voran abbremsen lassen und den
 * Fallschirm nutzen; ohne Luft die Bahngeschwindigkeit abbauen. Dann im freien Fall warten und im
 * letzten Moment mit vollem Schub abbremsen („Suicide Burn“), die letzten Meter sanft aufsetzen.
 */
export class LandingPilot {
  phase: LandPhase = 'brake';
  message = '';

  update(f: Flight): LandPhase {
    if (f.status === 'landed') {
      f.throttle = 0;
      return (this.phase = 'done');
    }
    if (f.status !== 'flying') {
      f.throttle = 0;
      return (this.phase = 'failed');
    }
    f.sas = 'off';
    // Gelandet wird auf dem Bezugskörper (nicht auf einem kleinen Mond, der gerade näher ist).
    const body = f.refBody();
    if (!body.solid) {
      this.message = `${body.name} hat keine feste Oberfläche.`;
      f.throttle = 0;
      return (this.phase = 'failed');
    }
    if (f.active.fuel <= 0 && f.segs.length > 1 && f.engine().thrust > 0) f.stage();
    const r = f.relative(body);
    const ux = r.rx / r.r;
    const uy = r.ry / r.r;
    const radial = r.vx * ux + r.vy * uy;
    const hx = r.vx - radial * ux;
    const hy = r.vy - radial * uy;
    const speed = Math.hypot(r.vx, r.vy);
    const g = body.mu / r.r ** 2;
    const amax = f.active.fuel > 0 || f.infiniteFuel ? f.engine().thrust / f.mass : 0;
    const horizontal = Math.hypot(hx, hy);

    // Mit Luft: Fallschirm scharf, bis zum Eintauchen treiben lassen. In dichter Luft (Erde,
    // Venus) bremst die Luft fast alles ab; in dünner Luft (Mars) muss das Triebwerk ran.
    if (body.atmosphere > 0) {
      if (f.chute === 'stowed') f.deployChute();
      const o = f.orbit(body);
      const terminal = Math.sqrt((2 * f.mass * g) / (body.density0 * 4));
      const thick = terminal < 250;
      const coasting = r.altitude > body.atmosphere && o.periapsis < body.atmosphere;
      if (coasting || (thick && speed > 150 && r.altitude > 2_000)) {
        f.throttle = 0;
        steerTo(f, Math.atan2(-r.vy, -r.vx));
        if (coasting && r.altitude > body.atmosphere * 1.2 && f.warpIndex < f.maxWarpIndex())
          f.setWarp(f.maxWarpIndex());
        return (this.phase = 'aero');
      }
      if (thick && amax <= g * 1.05) {
        // Kein Triebwerk (Kapsel): nur der Fallschirm bremst.
        f.throttle = 0;
        steerTo(f, Math.atan2(-r.vy, -r.vx));
        if (f.chute === 'none' && -radial > 14)
          this.message = 'Kein Fallschirm mehr – das wird hart.';
        return (this.phase = 'chute');
      }
    }
    if (amax <= g * 1.05) {
      this.message = 'Das Triebwerk ist zu schwach, um hier zu landen.';
      f.throttle = 0;
      return (this.phase = 'failed');
    }
    // Große Bahngeschwindigkeit zuerst waagerecht abbauen.
    if (horizontal > 30 || (horizontal > 3 && this.phase === 'brake')) {
      this.phase = 'brake';
      f.throttle = steerTo(f, Math.atan2(-hy, -hx)) < 0.15 ? Math.min(1, horizontal / amax) : 0;
      if (f.warpIndex) f.setWarp(0);
      return this.phase;
    }
    // Nötige Bremsbeschleunigung, um bei 2 m/s knapp über dem Boden anzukommen.
    const need = (radial * radial - 4) / (2 * Math.max(r.altitude, 1)) + g;
    const falling = radial < 0;
    // Gewünschte Richtung: nach oben bremsen und dabei die Restgeschwindigkeit zur Seite
    // wegregeln; kurz vor dem Boden fast senkrecht (sonst kippt die Rakete beim Aufsetzen).
    const tiltMax = r.altitude < 60 ? 0.12 : 0.35;
    const side = Math.min(tiltMax, horizontal * 0.08);
    const ax = horizontal > 1e-6 ? -hx / horizontal : 0;
    const ay = horizontal > 1e-6 ? -hy / horizontal : 0;
    const upright =
      steerTo(f, Math.atan2(uy + ay * Math.tan(side), ux + ax * Math.tan(side))) < 0.1;
    const start = this.phase === 'suicide' ? 0.5 : 0.72;
    if (falling && (need > start * amax || r.altitude < 60)) {
      this.phase = 'suicide';
      if (f.warpIndex) f.setWarp(0);
      f.throttle = Math.min(1, Math.max(0, need / (amax * Math.cos(side))));
      if (r.altitude < 60 && -radial < 3) f.throttle = Math.min(1, (g * 0.95) / amax);
    } else {
      this.phase = 'fall';
      f.throttle = 0;
      // Im freien Fall darf die Zeit schneller laufen (der Zeitraffer bremst selbst vor dem Boden).
      if (r.altitude > 5_000 && upright && f.warpIndex < 3)
        f.setWarp(Math.min(f.maxWarpIndex(), 3));
    }
    return this.phase;
  }
}
