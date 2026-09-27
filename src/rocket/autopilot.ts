import { part } from './parts';
import type { Flight } from './flight';
import { EARTH, G0 } from './world';

export type PilotPhase = 'ascent' | 'coast' | 'circularize' | 'done';

const TARGET_APOAPSIS = 75_000;
const TURN_END = 55_000;

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
 * der Höhe immer weiter zur Seite), Triebwerk aus, sobald der höchste Bahnpunkt 75 km erreicht,
 * und am höchsten Punkt waagerecht Gas geben, bis die Bahn rund ist.
 */
export class OrbitPilot {
  phase: PilotPhase = 'ascent';

  update(f: Flight): PilotPhase {
    if (f.status === 'crashed') return (this.phase = 'done');
    const up = Math.atan2(f.y, f.x);
    const h = f.altitudeEarth;
    const o = f.orbit(EARTH);
    // Leere Stufe abwerfen, solange noch eine übrig ist.
    if (f.status === 'flying' && f.active.fuel <= 0 && f.segs.length > 1) f.stage();

    if (this.phase === 'ascent') {
      const pitch = Math.min(
        1.35,
        (Math.PI / 2) * Math.pow(Math.max(0, h - 1_000) / TURN_END, 0.55),
      );
      steerTo(f, up - pitch);
      f.throttle = 1;
      if (o.apoapsis >= TARGET_APOAPSIS) {
        f.throttle = 0;
        this.phase = 'coast';
      }
    } else if (this.phase === 'coast') {
      f.throttle = 0;
      // In Flugrichtung, waagerecht ausrichten.
      steerTo(f, up - Math.PI / 2);
      // Nachregeln, falls der Luftwiderstand den höchsten Punkt gesenkt hat.
      if (h < EARTH.atmosphere && o.apoapsis < TARGET_APOAPSIS - 3_000) f.throttle = 1;
      const radial = (f.x * f.vx + f.y * f.vy) / Math.hypot(f.x, f.y);
      const { thrust, flow } = f.engine();
      const accel = thrust > 0 ? thrust / f.mass : 1;
      const needed = Math.max(0, Math.sqrt(EARTH.mu / (EARTH.radius + h)) - o.v);
      const burnTime = needed / accel;
      const timeToTop = radial / (EARTH.mu / (EARTH.radius + h) ** 2);
      if (h > EARTH.atmosphere && timeToTop < burnTime / 2 + 1) this.phase = 'circularize';
      void flow;
    } else if (this.phase === 'circularize') {
      // Waagerecht, leicht gegen das Sinken angesteuert.
      const radial = (f.x * f.vx + f.y * f.vy) / Math.hypot(f.x, f.y);
      const lift = Math.max(-0.3, Math.min(0.3, -radial / 150));
      steerTo(f, up - Math.PI / 2 + lift);
      f.throttle = 1;
      if (o.bound && o.periapsis > EARTH.atmosphere + 5_000) {
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
