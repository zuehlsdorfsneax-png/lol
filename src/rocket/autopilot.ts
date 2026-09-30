import type { Flight } from './flight';
import { part } from './parts';
import { EARTH, bodyById, tinyBody, type Body } from './world';

export type PilotPhase = 'ascent' | 'coast' | 'circularize' | 'done' | 'failed';

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
  /** Warum der Pilot aufgegeben hat (nur bei 'failed'). */
  message = '';

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

  /**
   * Grober Δv-Bedarf bis in die Bahn des Piloten. Auf der Erde der Wert aus Testflügen (wie in
   * der Werft), sonst Bahngeschwindigkeit plus Verluste durch Schwerkraft und Luft.
   */
  get needed(): number {
    const b = this.body;
    if (b === EARTH) return 3_900;
    const v = Math.sqrt(b.mu / (b.radius + this.apoapsis));
    return v * (b.atmosphere > 0 ? 1.5 : 1.15);
  }

  update(f: Flight): PilotPhase {
    if (f.status === 'crashed') return (this.phase = 'done');
    if (this.phase === 'done' || this.phase === 'failed') return this.phase;
    f.sas = 'off';
    const b = this.body;
    const rel = f.relative(b);
    const up = Math.atan2(rel.ry, rel.rx);
    const h = rel.altitude;
    const o = f.orbit(b);
    const safe = b === EARTH ? b.atmosphere : Math.max(b.atmosphere, this.apoapsis * 0.6);
    // Leere Stufe abwerfen, solange noch eine übrig ist.
    if (f.status === 'flying' && f.active.fuel <= 0 && f.segs.length > 1) f.stage();
    if (f.status === 'flying' && !f.infiniteFuel && f.deltaV() < 1) {
      // Kein Treibstoff mehr, die Bahn ist nicht erreicht: aufgeben und den Schirm scharf machen.
      f.throttle = 0;
      f.turn = 0;
      if (f.chute === 'stowed') f.deployChute();
      this.message =
        f.chute === 'armed'
          ? 'Hilfe-Pilot: Treibstoff leer, das Δv hat nicht für eine Umlaufbahn gereicht. Der Fallschirm ist scharf.'
          : 'Hilfe-Pilot: Treibstoff leer, das Δv hat nicht für eine Umlaufbahn gereicht.';
      return (this.phase = 'failed');
    }

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
      const needed = Math.max(0, Math.sqrt(b.mu / (b.radius + h)) - o.v);
      // Über die Stufen hinweg (eine fast leere Stufe mit starkem Triebwerk täuscht sonst).
      const burnTime = Math.min(f.burnTime(needed), 600);
      const timeToTop = radial / (b.mu / (b.radius + h) ** 2);
      // Schwache Triebwerke müssen früh zünden – aber erst in der oberen Hälfte des Anstiegs, sonst
      // wird die Bahn unnötig niedrig. Spätestens am höchsten Punkt geht es los.
      const high = h > (safe + this.apoapsis) / 2;
      if (h > safe && ((high && timeToTop < burnTime / 2 + 1) || timeToTop <= 0))
        this.phase = 'circularize';
    } else if (this.phase === 'circularize') {
      // Gelenkt wird entlang der fehlenden Geschwindigkeit zur Kreisbahn auf der jetzigen Höhe:
      // waagerecht auf Kreisbahntempo, senkrecht auf null. Ein schwaches Triebwerk, das lange vor
      // dem höchsten Punkt zünden muss, hebt so nicht den Gipfel immer weiter an, sondern die
      // ganze Bahn.
      const ux = rel.rx / rel.r;
      const uy = rel.ry / rel.r;
      const radial = rel.vx * ux + rel.vy * uy;
      const hx = rel.vx - radial * ux;
      const hy = rel.vy - radial * uy;
      const hv = Math.hypot(hx, hy) || 1;
      const vc = Math.sqrt(b.mu / rel.r);
      const deficit = vc - hv;
      const need = Math.hypot(deficit, radial);
      const { thrust } = f.engine();
      const amax = thrust > 0 ? thrust / f.mass : 1;
      // Senkrecht: Schwerkraft abzüglich Fliehkraft tragen und die Sinkrate in etwa 20 s abbauen
      // (höchstens 45° steil, sonst verpufft der Schub nach oben). Der Rest geht waagerecht.
      const gNet = b.mu / rel.r ** 2 - (hv * hv) / rel.r;
      const aUp = Math.max(-0.7 * amax, Math.min(0.7 * amax, gNet - radial / 20));
      const aSide = Math.sqrt(Math.max(0, amax * amax - aUp * aUp)) * (deficit >= 0 ? 1 : -1);
      const dirX = aUp * ux + (aSide * hx) / hv;
      const dirY = aUp * uy + (aSide * hy) / hv;
      const err = steerTo(f, Math.atan2(dirY, dirX));
      f.throttle = err < 0.3 ? Math.min(1, Math.max(0.05, need / (amax * 1.5))) : 0;
      const margin = b === EARTH ? 5_000 : 1_000;
      if (o.bound && (o.periapsis > safe + margin || (need < 1 && o.periapsis > safe))) {
        f.throttle = 0;
        f.turn = 0;
        this.phase = 'done';
      } else if (h < safe - 2_000 && radial < 0) {
        // Zurück in die Luft gefallen: wieder steigen, dann neu anlaufen.
        this.phase = 'ascent';
      }
    }
    if (this.phase === 'done') {
      f.throttle = 0;
      f.turn = 0;
    }
    return this.phase;
  }
}

export type ExecPhase = 'align' | 'wait' | 'burn' | 'done' | 'failed';

/**
 * Führt das geplante Manöver aus: aufs Manöver ausrichten (SAS), per Zeitsprung bis kurz davor
 * vorspulen, zur richtigen Zeit zünden, gegen Ende sanft drosseln und leere Stufen abwerfen.
 */
export class NodeExecutor {
  phase: ExecPhase = 'align';
  message = '';
  /** Beginn des Brennens (Flugzeit) und wie lange es dauern dürfte – als Sicherung. */
  private burnStart: number | null = null;
  private burnBudget = 0;

  update(f: Flight): ExecPhase {
    const node = f.node;
    if (!node) {
      f.throttle = 0;
      return (this.phase = 'done');
    }
    if (node.frozen && this.burnStart === null) {
      this.burnStart = f.t;
      this.burnBudget = 3 * f.burnTime(Math.hypot(node.prograde, node.radial)) + 30;
    }
    if (
      this.burnStart !== null &&
      Number.isFinite(this.burnBudget) &&
      f.t - this.burnStart > this.burnBudget
    ) {
      // Viel länger als geplant: Rest verwerfen (kann bei winzigen Schüben passieren).
      f.throttle = 0;
      f.clearNode();
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
    // Lange Brennphasen im Zeitraffer (so weit die Physik es erlaubt) – aber nur, solange das
    // Triebwerk wirklich läuft; beim Ausrichten läuft die Zeit normal.
    const seconds = rem.mag / Math.max(accel, 1e-6);
    const want = !f.thrusting
      ? 0
      : seconds > 40
        ? f.maxWarpIndex()
        : seconds > 12
          ? Math.min(2, f.maxWarpIndex())
          : 0;
    if (f.warpIndex !== want) f.setWarp(want);
    return (this.phase = 'burn');
  }
}

/**
 * Nähert sich dem Andockstutzen der Station (oder einem winzigen Mond): zielt mit der Spitze aufs
 * Ziel, regelt das Tempo gegenüber dem Ziel (weit weg bis 12 m/s, zuletzt unter 1 m/s) mit den
 * Lagekontrolldüsen und – bei großen Abweichungen – mit dem Triebwerk.
 */
export class DockPilot {
  /** Höchstes Tempo gegenüber dem Ziel (m/s). */
  constructor(readonly maxSpeed = 12) {}

  update(f: Flight): 'running' | 'done' {
    if (f.status === 'docked') {
      f.rcs = false;
      f.translate = { x: 0, y: 0 };
      f.throttle = 0;
      return 'done';
    }
    const s = f.targetState();
    if (!s) return 'running';
    const [cx, cy] = f.center();
    const dx = s.x - cx;
    const dy = s.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const wx = f.vx - s.vx;
    const wy = f.vy - s.vy;
    // Bei einem Mond zählt der Abstand zur Oberfläche – und dort wird langsamer angeflogen.
    const gap = Math.max(0, d - s.surface);
    const want = Math.max(
      0.4,
      Math.min(this.maxSpeed, (s.surface > 0 ? 0.008 : 0.018) * gap + 0.3),
    );
    const ex = (dx / d) * want - wx;
    const ey = (dy / d) * want - wy;
    const err = Math.hypot(ex, ey);
    f.sas = 'off';
    if (err > 4 && d > 150) {
      // Große Abweichung: mit dem Triebwerk nachregeln.
      f.rcs = false;
      f.translate = { x: 0, y: 0 };
      const aligned = steerTo(f, Math.atan2(ey, ex)) < 0.15;
      const a = f.engine().thrust / Math.max(f.mass, 1);
      f.throttle = aligned && a > 0 ? Math.min(1, err / (a * 2)) : 0;
      return 'running';
    }
    f.throttle = 0;
    f.rcs = true;
    steerTo(f, Math.atan2(dy, dx));
    // Beschleunigung in Rakete-Koordinaten: vorwärts entlang der Spitze, seitlich rechts davon.
    const ax = Math.cos(f.angle);
    const ay = Math.sin(f.angle);
    const fwd = ex * ax + ey * ay;
    const side = ex * ay - ey * ax;
    const dead = 0.05;
    f.translate = {
      x: Math.abs(side) > dead ? Math.max(-1, Math.min(1, side * 2)) : 0,
      y: Math.abs(fwd) > dead ? Math.max(-1, Math.min(1, fwd * 2)) : 0,
    };
    return 'running';
  }
}

export type LandPhase =
  'approach' | 'aero' | 'chute' | 'brake' | 'fall' | 'suicide' | 'done' | 'failed';

/**
 * Lande-Autopilot: In einer Atmosphäre erst mit dem Hitzeschild voran abbremsen lassen und den
 * Fallschirm nutzen; ohne Luft die Bahngeschwindigkeit abbauen. Dann im freien Fall warten und im
 * letzten Moment mit vollem Schub abbremsen („Suicide Burn“), die letzten Meter sanft aufsetzen.
 */
export class LandingPilot {
  phase: LandPhase = 'brake';
  message = '';
  /**
   * @param saveChute Fallschirm nicht benutzen (er ist ein Einmalteil) – etwa auf dem Mars, wenn
   * er für die Heimkehr zur Erde gebraucht wird. Dann bremst allein das Triebwerk.
   */
  constructor(readonly saveChute = false) {}
  private dock: DockPilot | null = null;

  update(f: Flight): LandPhase {
    if (f.status === 'landed') {
      f.throttle = 0;
      return (this.phase = 'done');
    }
    if (f.status !== 'flying') {
      f.throttle = 0;
      return (this.phase = 'failed');
    }
    // Ein winziger Mond als nahes Ziel (Phobos): erst bis dicht über den Boden heranfliegen. Sein
    // Einflussbereich misst nur ein paar Kilometer, an dessen Rand zieht noch der Planet – sonst
    // landete der Pilot auf dem Planeten statt auf dem Mond.
    const tb = f.target && f.target !== 'station' ? bodyById(f.target) : null;
    const ti = tb && tinyBody(tb) ? f.targetInfo() : null;
    if (tb && ti && ti.distance < 30_000) {
      const far = f.refBody() !== tb || ti.distance > (this.dock ? 300 : 1_500);
      if (far) {
        this.dock ??= new DockPilot(6);
        if (f.warpIndex) f.setWarp(0);
        this.dock.update(f);
        return (this.phase = 'approach');
      }
      if (this.dock) {
        this.dock = null;
        f.rcs = false;
        f.translate = { x: 0, y: 0 };
        this.phase = 'brake';
      }
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

    // Stufen, die beim Landen nur stören, vorher abwerfen (antriebslos, nie mitten im Bremsen):
    // – mit Fallschirm in der Luft: solange der Schirm die ganze Rakete nicht sanft genug trägt,
    // – ohne: wenn die unterste Stufe allein nicht zum Abbremsen reicht, die nächste aber schon.
    if (f.segs.length > 1 && !f.thrusting && this.phase !== 'suicide') {
      const upper = f.segs.slice(0, -1);
      const chuteAbove = upper.some((sg) => sg.parts.some((id) => part(id).kind === 'chute'));
      const need = speed * 1.2 + Math.sqrt(2 * g * Math.max(r.altitude, 0)) * 0.5 + 30;
      if (
        // Nur in dichter Luft (Erde, Venus) – in der dünnen Marsluft braucht es das Triebwerk.
        body.density0 >= 0.5 * EARTH.density0 &&
        chuteAbove &&
        f.chute !== 'none' &&
        f.chuteLandingSpeed(body) > f.safeLandingSpeed &&
        r.altitude < body.atmosphere * 1.2
      ) {
        f.stage();
        return this.phase;
      }
      if (
        (body.atmosphere === 0 || r.altitude < body.atmosphere) &&
        f.activeStageDeltaV() < need &&
        f.deltaV() - f.activeStageDeltaV() > need &&
        f.nextStageAccel() > g * 1.3
      ) {
        f.stage();
        return this.phase;
      }
    }

    // Mit Luft: Fallschirm scharf, bis zum Eintauchen treiben lassen. In dichter Luft (Erde,
    // Venus) bremst die Luft fast alles ab; in dünner Luft (Mars) muss das Triebwerk ran.
    if (body.atmosphere > 0) {
      if (f.chute === 'stowed' && !this.saveChute) f.deployChute();
      const o = f.orbit(body);
      // Dichte Luft: Sie bremst die Rakete am Boden unter das Tempo, bei dem sich der Fallschirm
      // öffnet (oder ganz ohne Schirm auf ein Tempo, das das Triebwerk leicht abfängt).
      const chute = f.chute === 'armed' || f.chuteDeployed;
      // Mit etwas Spielraum, damit der Pilot beim Sinken (g wächst) nicht zwischen Gleiten und
      // Bremsen hin- und herspringt.
      const limit =
        (chute ? 250 : 150) * (this.phase === 'aero' || this.phase === 'chute' ? 1 : 0.85);
      const thick = f.terminalSpeed(g, body.density0) < limit;
      const coasting = r.altitude > body.atmosphere && o.periapsis < body.atmosphere;
      if (coasting || (thick && speed > 150 && r.altitude > 2_000)) {
        f.throttle = 0;
        steerTo(f, Math.atan2(-r.vy, -r.vx));
        if (coasting && r.altitude > body.atmosphere * 1.2 && f.warpIndex < f.maxWarpIndex())
          f.setWarp(f.maxWarpIndex());
        return (this.phase = 'aero');
      }
      if (thick && amax <= g * 1.05) {
        // Kein (starkes) Triebwerk: nur Luft und Fallschirm bremsen.
        f.throttle = 0;
        steerTo(f, Math.atan2(-r.vy, -r.vx));
        if (f.chute === 'none' && -radial > 14)
          this.message = 'Kein Fallschirm mehr – das wird hart.';
        return (this.phase = 'chute');
      }
    }
    if (amax <= g * 1.05 && f.segs.length > 1 && f.engine().thrust > 0) {
      // Zu schwer (etwa noch mit der Transferstufe): die unterste Stufe abwerfen und mit der
      // Landestufe weiter.
      f.throttle = 0;
      f.stage();
      return this.phase;
    }
    if (amax <= g * 1.05) {
      this.message =
        body.atmosphere > 0 && f.segs.length > 1
          ? 'Zu schwer für Fallschirm und Triebwerk – untere Stufen abwerfen (Leertaste), dann den Lande-Autopiloten neu starten.'
          : 'Das Triebwerk ist zu schwach, um hier zu landen.';
      f.throttle = 0;
      return (this.phase = 'failed');
    }
    // Schnell und schon dicht über dem Boden: gegen die ganze Bewegung bremsen (retrograd) statt
    // erst waagerecht – sonst schlägt die Rakete auf, bevor sie senkrecht abfangen kann.
    const stopDist = radial < 0 ? (radial * radial) / (2 * Math.max(0.1, amax - g)) : 0;
    if (horizontal > 3 && stopDist > 0.6 * r.altitude) {
      this.phase = 'suicide';
      if (f.warpIndex) f.setWarp(0);
      f.throttle = steerTo(f, Math.atan2(-r.vy, -r.vx)) < 0.3 ? 1 : 0;
      return this.phase;
    }
    // Große Bahngeschwindigkeit zuerst waagerecht abbauen.
    if (horizontal > 30 || (horizontal > 3 && this.phase === 'brake')) {
      this.phase = 'brake';
      f.throttle = steerTo(f, Math.atan2(-hy, -hx)) < 0.15 ? Math.min(1, horizontal / amax) : 0;
      if (f.warpIndex) f.setWarp(0);
      return this.phase;
    }
    // Nötige Verzögerung (zusätzlich zur Schwerkraft), um bei 2 m/s knapp über dem Boden
    // anzukommen – verglichen mit dem, was das Triebwerk über die Schwerkraft hinaus schafft. (Früher
    // stand hier die Schwerkraft mit drin: Eine Kapsel mit schwachem Triebwerk schwebte dann unter
    // dem Fallschirm in 8 km Höhe, bis der Tank leer war.)
    const brake = Math.max(0, (radial * radial - 4) / (2 * Math.max(r.altitude, 1)));
    const net = amax - g;
    const falling = radial < 0;
    // Gewünschte Richtung: nach oben bremsen und dabei die Restgeschwindigkeit zur Seite
    // wegregeln; kurz vor dem Boden fast senkrecht (sonst kippt die Rakete beim Aufsetzen).
    const tiltMax = r.altitude < 60 ? 0.12 : 0.35;
    const side = Math.min(tiltMax, horizontal * 0.08);
    const ax = horizontal > 1e-6 ? -hx / horizontal : 0;
    const ay = horizontal > 1e-6 ? -hy / horizontal : 0;
    const upright =
      steerTo(f, Math.atan2(uy + ay * Math.tan(side), ux + ax * Math.tan(side))) < 0.1;
    const start = this.phase === 'suicide' ? 0.35 : 0.8;
    if (falling && (brake > start * net || r.altitude < 60)) {
      this.phase = 'suicide';
      if (f.warpIndex) f.setWarp(0);
      f.throttle = Math.min(1, Math.max(0, (brake + g) / (amax * Math.cos(side))));
      if (r.altitude < 60) {
        // Die letzten Meter: auf ein sanftes Sinktempo regeln (bremst der Fallschirm mit, gibt das
        // Triebwerk entsprechend weniger – statt lange knapp über dem Boden zu schweben).
        const sink = Math.max(2.5, Math.min(8, r.altitude / 6));
        const a = g + 1.5 * (-radial - sink);
        f.throttle = Math.min(1, Math.max(0, a / (amax * Math.cos(side))));
      }
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
