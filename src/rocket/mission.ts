/**
 * Missions-Autopilot: fliegt eine ganze Mission selbst – Start, Umlaufbahn, Startfenster abwarten,
 * Transfer, Kurskorrekturen, Einschwenken, Landung, Rückflug und Landung auf der Erde, bei der
 * Station Rendezvous und Andocken. Er nutzt dieselben Bausteine wie der Spieler (Hilfe-Pilot,
 * Bordcomputer, Manöver-Autopilot, Lande-Autopilot) und spult die Wartezeiten mit dem Zeitraffer
 * vor. Die Pläne kommen über `planFn` – im Spiel aus dem Hintergrund-Thread, in Tests direkt.
 */
import { DockPilot, LandingPilot, NodeExecutor, OrbitPilot } from './autopilot';
import type { Flight, TargetId } from './flight';
import { part } from './parts';
import { planOptions, type Plan, type PlanId } from './planner';
import { EARTH, SUN, bodyById, forms, tinyBody, type Body } from './world';

export type PlanFn = (f: Flight, id: PlanId) => Plan | Promise<Plan>;

export type MissionTarget = TargetId | 'orbit';

export interface MissionSpec {
  /** Wohin: ein Körper, die Station oder nur eine Umlaufbahn um die Erde. */
  target: MissionTarget;
  /** Auf dem Ziel landen (nur bei fester Oberfläche). */
  land: boolean;
  /** Danach zurück zur Erde und dort landen (nur bei Monden der Erde). */
  home: boolean;
}

export type Step =
  | { kind: 'ascent' }
  | { kind: 'circularize' }
  | { kind: 'undock' }
  | { kind: 'transfer'; to: Body }
  | { kind: 'cruise'; to: Body }
  | { kind: 'capture'; at: Body }
  | { kind: 'land'; on: Body }
  | { kind: 'return'; to: Body }
  | { kind: 'reentry'; at: Body }
  | { kind: 'rendezvous'; to: TargetId }
  | { kind: 'approach'; to: Body }
  | { kind: 'dock' };

export type MissionStatus = 'running' | 'done' | 'failed';

/** Kann man auf dem Körper landen (und wieder starten)? */
export function landable(b: Body): boolean {
  return b.solid && b !== SUN;
}

/**
 * Ob die Rückkehr zur Erde angeboten wird: von Monden der Erde, von Planeten und ihren großen
 * Monden (nicht von der Sonne und nicht von winzigen Monden ohne Umlaufbahn).
 */
export function canReturnHome(target: MissionTarget, land = false): boolean {
  if (target === 'orbit' || target === 'station') return false;
  const b = bodyById(target);
  // Von der Venus startet nach einer Landung keine Rakete mehr (90-facher Luftdruck, 460 °C).
  if (land && b.id === 'venus') return false;
  return b !== EARTH && b !== SUN && !tinyBody(b);
}

/**
 * Grober Δv-Bedarf einer Mission ab der Startrampe der Erde (nur zur Orientierung); mit
 * `fromOrbit` ohne den Aufstieg in die Erdumlaufbahn.
 */
export function missionBudget(spec: MissionSpec, fromOrbit = false): number {
  const orbit = fromOrbit ? 0 : 3_950;
  if (spec.target === 'orbit') return orbit;
  if (spec.target === 'station') return orbit + 250;
  const table: Record<string, [number, number, number]> = {
    // Transfer, Einschwenken, Landung
    moon: [920, 260, 800],
    mars: [1_150, 950, 700],
    venus: [1_050, 1_300, 150],
    mercury: [1_900, 2_600, 1_300],
    jupiter: [2_000, 2_600, 0],
    phobos: [1_150 + 950, 400, 60],
    europa: [2_000 + 2_600, 1_100, 700],
    ganymede: [2_000 + 2_600, 900, 750],
    ceres: [1_700, 1_600, 80],
  };
  const [t, c, l] = table[spec.target] ?? [1_000, 1_000, 800];
  let dv = orbit + t + c + (spec.land ? l : 0);
  if (spec.home) {
    const b = bodyById(spec.target);
    // Heimweg von Planeten: etwa derselbe Transfer zurück, dazu der Start vom Boden.
    dv += (spec.land ? l * 1.2 : 0) + (b.parent === 'earth' ? 300 : t);
  }
  return dv;
}

/** Kurzer Name der Mission für Anzeige und Meldungen. */
export function missionTitle(spec: MissionSpec): string {
  if (spec.target === 'orbit') return 'Umlaufbahn';
  if (spec.target === 'station') return 'Andocken an der Station';
  const b = bodyById(spec.target);
  const main =
    spec.land && landable(b) ? `Landung auf ${forms(b).dat}` : `Umlaufbahn um ${forms(b).acc}`;
  return spec.home && canReturnHome(spec.target, spec.land) ? `${main} und zurück zur Erde` : main;
}

export function stepLabel(s: Step): string {
  switch (s.kind) {
    case 'ascent':
      return 'Start in die Umlaufbahn';
    case 'circularize':
      return 'Bahn rund machen';
    case 'undock':
      return 'Von der Station ablegen';
    case 'transfer':
      return `Transfer ${forms(s.to).to}`;
    case 'cruise':
      return `Flug ${forms(s.to).to}`;
    case 'capture':
      return `Einschwenken ${forms(s.at).at}`;
    case 'land':
      return `Landung auf ${forms(s.on).dat}`;
    case 'return':
      return `Rückflug ${forms(s.to).to}`;
    case 'reentry':
      return 'Wiedereintritt und Landung';
    case 'rendezvous':
      return s.to === 'station'
        ? 'Rendezvous mit der Station'
        : `Rendezvous mit ${forms(bodyById(s.to)).dat}`;
    case 'approach':
      return `Anflug ${forms(s.to).to}`;
    case 'dock':
      return 'Andocken';
  }
}

/** Die Schritte vom jetzigen Zustand bis zum Missionsziel. */
export function missionSteps(spec: MissionSpec, f: Flight): Step[] {
  const steps: Step[] = [];
  if (f.status === 'docked') steps.push({ kind: 'undock' });
  const here = f.status === 'landed' && f.landedOn ? f.landedOn : f.refBody();
  if (spec.target === 'orbit' || spec.target === 'station') {
    steps.push({ kind: 'ascent' }, { kind: 'circularize' });
    if (spec.target === 'station')
      steps.push({ kind: 'rendezvous', to: 'station' }, { kind: 'dock' });
    return steps;
  }
  const goal = bodyById(spec.target);
  // Heimflug von einem Mond der Erde (Ziel „Erde“ oder „zurück“ ohne Hinflug).
  if (goal === EARTH && here.parent === 'earth') {
    steps.push({ kind: 'ascent' });
    steps.push({ kind: 'return', to: EARTH }, { kind: 'cruise', to: EARTH });
    steps.push({ kind: 'reentry', at: EARTH });
    return steps;
  }
  if (goal !== here) {
    steps.push({ kind: 'ascent' }, { kind: 'circularize' });
    // Monde anderer Planeten (Phobos, Europa): erst zum Planeten, dann zum Mond.
    const hops: Body[] =
      goal.parent && goal.parent !== 'sun' && goal.parent !== here.id && goal.parent !== 'earth'
        ? [bodyById(goal.parent), goal]
        : [goal];
    for (const b of hops) {
      // Winzige Monde (Phobos) haben keinen Einflussbereich, in den man einschwenken könnte: Man
      // trifft sie wie die Station und nähert sich dann langsam.
      if (tinyBody(b)) steps.push({ kind: 'rendezvous', to: b.id }, { kind: 'approach', to: b });
      else {
        steps.push({ kind: 'transfer', to: b }, { kind: 'cruise', to: b });
        steps.push({ kind: 'capture', at: b });
      }
    }
  }
  if (spec.land && landable(goal) && !(f.status === 'landed' && here === goal))
    // Auf der Erde: Wiedereintritt mit Hitzeschild und Fallschirm (untere Stufen abwerfen).
    steps.push(goal === EARTH ? { kind: 'reentry', at: goal } : { kind: 'land', on: goal });
  if (spec.home && canReturnHome(spec.target, spec.land && landable(goal))) {
    if (steps.at(-1)?.kind === 'land' || (f.status === 'landed' && here === goal))
      steps.push({ kind: 'ascent' });
    if (goal.parent === 'earth') {
      steps.push({ kind: 'return', to: EARTH }, { kind: 'cruise', to: EARTH });
    } else {
      // Von einem Mond erst zurück zu seinem Planeten, dann von dort heim.
      if (goal.parent && goal.parent !== 'sun') {
        const planet = bodyById(goal.parent);
        steps.push({ kind: 'return', to: planet }, { kind: 'cruise', to: planet });
        steps.push({ kind: 'capture', at: planet });
      }
      steps.push({ kind: 'transfer', to: EARTH }, { kind: 'cruise', to: EARTH });
    }
    steps.push({ kind: 'reentry', at: EARTH });
  }
  return steps;
}

/** Die unteren Stufen unter Kapsel/Schirm bzw. Hitzeschild (für den Wiedereintritt). */
function dropForReentry(f: Flight): number {
  let keep = -1;
  f.segs.forEach((seg, i) => {
    if (seg.parts.some((id) => ['chute', 'shield', 'capsule'].includes(part(id).kind))) keep = i;
  });
  // Mit Hitzeschild bleibt er (unterstes Teil seiner Stufe) erhalten.
  const shield = f.segs.findIndex((seg) => seg.parts.some((id) => part(id).kind === 'shield'));
  if (shield >= 0) keep = Math.max(keep, shield);
  return keep < 0 ? 0 : f.segs.length - 1 - keep;
}

export class MissionPilot {
  readonly spec: MissionSpec;
  readonly steps: Step[];
  index = 0;
  status: MissionStatus = 'running';
  /** Warum die Mission abgebrochen wurde (nur bei 'failed'). */
  message = '';
  /** Was gerade passiert (für die Anzeige). */
  detail = '';
  private phase = 'start';
  private sub: OrbitPilot | NodeExecutor | LandingPilot | DockPilot | null = null;
  private waiting = false;
  private planned: Plan | null = null;
  private planId: PlanId = 'circ-ap';
  private counter = 0;
  private stepStart = 0;
  private readonly planFn: PlanFn;

  constructor(spec: MissionSpec, f: Flight, planFn: PlanFn) {
    this.spec = spec;
    this.planFn = planFn;
    this.steps = missionSteps(spec, f);
    this.stepStart = f.t;
    if (spec.target !== 'orbit') f.target = spec.target;
  }

  /** Schritte mit Zustand für die Anzeige. */
  get overview(): { label: string; state: 'done' | 'active' | 'todo' }[] {
    return this.steps.map((s, i) => ({
      label: stepLabel(s),
      state:
        i < this.index || this.status === 'done'
          ? 'done'
          : i === this.index && this.status === 'running'
            ? 'active'
            : 'todo',
    }));
  }

  get stepLabel(): string {
    const s = this.steps[this.index];
    return s ? stepLabel(s) : 'Mission erfüllt';
  }

  private fail(f: Flight, text: string): MissionStatus {
    this.message = `Missions-Autopilot: ${text}`;
    this.status = 'failed';
    f.throttle = 0;
    f.translate = { x: 0, y: 0 };
    return this.status;
  }

  private next(f: Flight): void {
    this.index++;
    this.phase = 'start';
    this.sub = null;
    this.planned = null;
    this.counter = 0;
    this.stepStart = f.t;
    f.throttle = 0;
    f.turn = 0;
    if (this.index >= this.steps.length) this.status = 'done';
  }

  /** Plan anfordern; das Ergebnis liegt beim nächsten Bild in `planned`. */
  private plan(f: Flight, id: PlanId): void {
    f.setWarp(0);
    this.planId = id;
    const r = this.planFn(f, id);
    if (r instanceof Promise) {
      this.waiting = true;
      void r.then((p) => {
        this.planned = p;
        this.waiting = false;
      });
    } else this.planned = r;
  }

  /**
   * Nimmt den fertigen Plan ab (null, solange er noch rechnet). Hat sich die Bahn beim Rechnen
   * verändert, wird einfach noch einmal geplant.
   */
  private take(f: Flight): Plan | null {
    const p = this.planned;
    this.planned = null;
    if (p?.retry && this.retries < 5) {
      this.retries++;
      this.plan(f, this.planId);
      return null;
    }
    this.retries = 0;
    return p;
  }
  private retries = 0;

  /** Manöver ausführen; true, wenn fertig. */
  private burn(f: Flight): boolean | 'failed' {
    if (!(this.sub instanceof NodeExecutor)) this.sub = new NodeExecutor();
    const ph = this.sub.update(f);
    if (ph === 'failed') {
      this.message = this.sub.message;
      return 'failed';
    }
    if (ph === 'done') {
      this.sub = null;
      f.throttle = 0;
      return true;
    }
    return false;
  }

  /** Mit größtem erlaubtem Zeitraffer weiter (die Physik bremst vor Ereignissen selbst ab). */
  private fastForward(f: Flight): void {
    if (f.warpTarget === null && f.warpIndex < f.maxWarpIndex()) f.setWarp(f.maxWarpIndex());
  }

  update(f: Flight): MissionStatus {
    if (this.status !== 'running') return this.status;
    if (f.status === 'crashed') return this.fail(f, 'Die Rakete ist zerstört.');
    if (this.waiting) {
      this.detail = 'Bordcomputer rechnet …';
      return this.status;
    }
    const step = this.steps[this.index];
    if (!step) {
      this.status = 'done';
      return this.status;
    }
    switch (step.kind) {
      case 'undock':
        return this.undock(f);
      case 'ascent':
        return this.ascent(f);
      case 'circularize':
        return this.circularize(f);
      case 'transfer':
        return this.transfer(f, step.to);
      case 'cruise':
        return this.cruise(f, step.to);
      case 'capture':
        return this.capture(f, step.at);
      case 'land':
        return this.land(f, step.on);
      case 'return':
        return this.returnTo(f, step.to);
      case 'reentry':
        return this.reentry(f, step.at);
      case 'rendezvous':
        return this.rendezvous(f, step.to);
      case 'approach':
        return this.approach(f, step.to);
      case 'dock':
        return this.dock(f);
    }
  }

  private undock(f: Flight): MissionStatus {
    if (f.status === 'docked') {
      f.undock();
      this.detail = 'Abgelegt.';
    }
    // Ein Stück Abstand, bevor gezündet wird.
    if (f.t - this.stepStart > 20 || f.status !== 'flying') this.next(f);
    return this.status;
  }

  private ascent(f: Flight): MissionStatus {
    const ref = f.status === 'landed' && f.landedOn ? f.landedOn : f.refBody();
    const o = f.orbit(ref);
    const safe = Math.max(ref.atmosphere, 5_000);
    if (!(this.sub instanceof OrbitPilot)) {
      if (f.status === 'flying' && o.bound && o.periapsis > safe) {
        this.next(f);
        return this.status;
      }
      if (!ref.solid || ref === SUN)
        return this.fail(f, `Von ${forms(ref).dat} aus gibt es keinen Start.`);
      this.sub = new OrbitPilot(ref);
      if (f.status === 'landed' && !f.infiniteFuel && f.deltaV() < this.sub.needed * 0.95)
        return this.fail(
          f,
          `Zu wenig Treibstoff für eine Umlaufbahn um ${forms(ref).acc} (Δv ${Math.round(f.deltaV())} m/s, nötig etwa ${Math.round(this.sub.needed)} m/s).`,
        );
    }
    this.detail = `Hilfe-Pilot fliegt in eine Bahn um ${forms(ref).acc}.`;
    const ph = this.sub.update(f);
    if (ph === 'failed') return this.fail(f, this.sub.message || 'Umlaufbahn nicht erreicht.');
    if (ph === 'done') this.next(f);
    // Den Aufstieg im Zeitraffer: unter Schub vierfach (schneller wird die Steuerung zu grob),
    // antriebslos über der Luft bis zum Gipfel bis zu fünfzigfach.
    else if (f.status === 'flying' && f.warpTarget === null) {
      const coast =
        this.sub.phase === 'coast' &&
        f.relative(ref).altitude > Math.max(ref.atmosphere, 10_000) &&
        !f.thrusting;
      const want = Math.min(coast ? 4 : 2, f.maxWarpIndex());
      if (f.warpIndex !== want) f.setWarp(want);
    }
    return this.status;
  }

  private circularize(f: Flight): MissionStatus {
    if (this.phase === 'start') {
      const o = f.orbit();
      if (o.eccentricity < 0.01) {
        this.next(f);
        return this.status;
      }
      this.detail = 'Bahn rund machen: am höchsten Punkt beschleunigen.';
      this.plan(f, 'circ-ap');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      if (!p.ok || !f.node) {
        this.next(f);
        return this.status;
      }
      this.phase = 'burn';
    }
    const r = this.burn(f);
    if (r === 'failed') return this.fail(f, this.message);
    if (r) this.next(f);
    return this.status;
  }

  private transfer(f: Flight, to: Body): MissionStatus {
    f.target = to.id;
    if (this.phase === 'start') {
      this.detail = `Transfer ${forms(to).to} planen.`;
      this.plan(f, 'transfer');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      if (!p.ok && p.wait) {
        // Startfenster: bis kurz davor vorspulen und neu planen.
        const o = f.orbit();
        f.clearNode();
        f.warpTo(f.t + p.wait - (o.bound ? o.period : 600));
        this.detail = `Warten auf das Startfenster ${forms(to).to}.`;
        this.phase = 'window';
        return this.status;
      }
      if (!p.ok || !f.node) return this.fail(f, p.text);
      this.detail = p.text;
      this.phase = 'burn';
    }
    if (this.phase === 'window') {
      if (f.warpTarget !== null) return this.status;
      this.phase = 'start';
      return this.status;
    }
    const r = this.burn(f);
    if (r === 'failed') return this.fail(f, this.message);
    if (r) this.next(f);
    return this.status;
  }

  /**
   * Unterwegs: gleich nach dem Brennen und auf halbem Weg die Ankunft nachbessern, dann bis zum
   * Einflussbereich des Ziels vorspulen.
   */
  private cruise(f: Flight, to: Body): MissionStatus {
    if (to !== EARTH) f.target = to.id;
    else f.target = 'earth';
    if (f.refBody() === to) {
      this.next(f);
      return this.status;
    }
    // Zu einem anderen Planeten: erst aus dem Einflussbereich des Startplaneten heraus – dicht am
    // Planeten wäre eine Kurskorrektur viel zu empfindlich. (Vom Mond heim wird gleich korrigiert.)
    const ref = f.refBody();
    if (this.phase === 'start' && to.parent === 'sun' && ref !== SUN && ref.parent === 'sun') {
      this.detail = `Aus dem Einflussbereich ${forms(f.refBody()).gen} hinaus – Zeitraffer.`;
      this.fastForward(f);
      return this.status;
    }
    if (this.phase === 'start') {
      if (this.counter >= 3) {
        this.phase = 'coast';
        return this.status;
      }
      const offered = planOptions(f, f.predict()).some((o) => o.id === 'correct');
      if (!offered) {
        this.phase = 'coast';
        return this.status;
      }
      this.detail = `Kurskorrektur ${forms(to).to} planen.`;
      this.plan(f, 'correct');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      this.counter++;
      // Eine Kurskorrektur ist klein – ein großer Schub wäre ein Rechenfehler: dann lieber nicht.
      const n = f.node;
      if (p.ok && n && Math.hypot(n.prograde, n.radial) < 80) {
        this.detail = p.text;
        this.phase = 'burn';
      } else {
        f.clearNode();
        this.phase = 'coast';
      }
      return this.status;
    }
    if (this.phase === 'burn') {
      const r = this.burn(f);
      if (r === 'failed') return this.fail(f, this.message);
      if (r) this.phase = 'coast';
      return this.status;
    }
    // Vorspulen: bis zur halben Strecke (dann noch einmal korrigieren) oder bis zum Ziel.
    if (this.phase === 'coast') {
      this.detail = `Unterwegs ${forms(to).to} – Zeitraffer.`;
      // Heimflug zum Mutterkörper: angekommen, sobald der Einflussbereich verlassen ist.
      if (to.id === f.refBody().parent) {
        this.phase = 'arrive';
        return this.status;
      }
      const p = f.predict();
      const enc = p.encounter?.body === to ? p.encounter : null;
      if (!enc) {
        if (this.counter < 3) {
          this.phase = 'start';
          return this.status;
        }
        return this.fail(f, `Die Bahn trifft ${forms(to).acc} nicht.`);
      }
      const arrive = p.ts[enc.enter]!;
      const half = this.counter < 2 && arrive - f.t > 6 * 3_600;
      f.warpTo(half ? f.t + (arrive - f.t) / 2 : arrive + 1);
      this.phase = half ? 'half' : 'arrive';
      return this.status;
    }
    if (this.phase === 'half') {
      if (f.warpTarget !== null) return this.status;
      this.phase = 'start';
      return this.status;
    }
    // 'arrive': bis der Bezugskörper wechselt.
    if (f.warpTarget === null) this.fastForward(f);
    if (f.t - this.stepStart > 400 * 86_400) return this.fail(f, `${to.name} nicht erreicht.`);
    return this.status;
  }

  private capture(f: Flight, at: Body): MissionStatus {
    f.target = at.id;
    if (f.refBody() !== at) return this.fail(f, `Nicht im Einflussbereich ${forms(at).gen}.`);
    if (this.phase === 'start') {
      // Zuerst den Anflug feinstellen, falls der Computer das anbietet.
      if (this.counter === 0 && planOptions(f, f.predict()).some((o) => o.id === 'correct')) {
        this.detail = `Anflug ${forms(at).to} feinstellen.`;
        this.plan(f, 'correct');
        this.phase = 'correct';
        return this.status;
      }
      // Riesenplaneten und Zwischenstopps: nur so weit bremsen, dass eine lange Ellipse bleibt –
      // eine runde Bahn dicht über den Wolken kostete dort ein Vielfaches.
      const next = this.steps[this.index + 1];
      const cheap =
        !landable(at) ||
        (next?.kind === 'transfer' && next.to.parent === at.id) ||
        next?.kind === 'rendezvous';
      this.detail = `Einschwenken ${forms(at).at} planen.`;
      this.plan(f, cheap ? 'capture' : 'circ-pe');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'correct') {
      const p = this.take(f);
      if (!p) return this.status;
      this.counter = 1;
      this.phase = p.ok && f.node ? 'correct-burn' : 'start';
      return this.status;
    }
    if (this.phase === 'correct-burn') {
      const r = this.burn(f);
      if (r === 'failed') return this.fail(f, this.message);
      if (r) this.phase = 'start';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      if (!p.ok || !f.node) {
        // Tiefster Punkt in der Luft: direkt landen statt einschwenken (wenn gewünscht).
        const next = this.steps[this.index + 1];
        if (next?.kind === 'land' && at.atmosphere > 0) {
          this.next(f);
          return this.status;
        }
        return this.fail(f, p.text);
      }
      this.detail = p.text;
      this.phase = 'burn';
    }
    const r = this.burn(f);
    if (r === 'failed') return this.fail(f, this.message);
    if (r) {
      const o = f.orbit(at);
      if (!o.bound)
        return this.fail(f, `Nicht eingefangen – die Bahn um ${forms(at).acc} ist offen.`);
      const next = this.steps[this.index + 1];
      if (o.periapsis < Math.max(at.atmosphere, 1_000) && next?.kind !== 'land')
        return this.fail(
          f,
          `Eingefangen, aber der tiefste Punkt liegt ${at.atmosphere > 0 ? 'in der Atmosphäre' : 'zu dicht am Boden'} (${Math.round(o.periapsis / 1000)} km).`,
        );
      this.next(f);
    }
    return this.status;
  }

  private land(f: Flight, on: Body): MissionStatus {
    if (f.status === 'landed') {
      if (f.landedOn && f.landedOn !== on)
        return this.fail(f, `Auf ${forms(f.landedOn).dat} gelandet statt auf ${forms(on).dat}.`);
      this.next(f);
      return this.status;
    }
    // Winziger Mond: Der Lande-Autopilot fliegt erst wieder heran, falls die Rakete aus dem
    // kleinen Einflussbereich treibt – dafür muss der Mond das Ziel sein.
    if (tinyBody(on)) f.target = on.id;
    if (this.phase === 'start') {
      const o = f.orbit(on);
      // Aus einer Umlaufbahn erst den tiefsten Punkt absenken.
      if (o.bound && o.periapsis > Math.max(on.atmosphere * 0.8, 3_500)) {
        this.detail = `Abstieg ${forms(on).to} planen.`;
        this.plan(f, 'deorbit');
        this.phase = 'planned';
        return this.status;
      }
      this.phase = 'descent';
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      this.phase = p.ok && f.node ? 'burn' : 'descent';
      return this.status;
    }
    if (this.phase === 'burn') {
      const r = this.burn(f);
      if (r === 'failed') return this.fail(f, this.message);
      if (r) this.phase = 'descent';
      return this.status;
    }
    if (!(this.sub instanceof LandingPilot)) {
      // Kommt danach noch ein Wiedereintritt, bleibt der Fallschirm dafür verpackt.
      const later = this.steps.slice(this.index + 1).some((st) => st.kind === 'reentry');
      this.sub = new LandingPilot(later && on !== EARTH && f.engine().thrust > 0);
    }
    this.detail = `Lande-Autopilot ${forms(on).at}.`;
    const ph = this.sub.update(f);
    if (ph === 'failed') return this.fail(f, this.sub.message || 'Landung abgebrochen.');
    if (ph === 'done') this.next(f);
    return this.status;
  }

  private returnTo(f: Flight, to: Body): MissionStatus {
    f.target = to.id;
    if (this.phase === 'start') {
      this.detail = `Rückflug ${forms(to).to} planen.`;
      this.plan(f, 'return');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      if (!p.ok || !f.node) return this.fail(f, p.text);
      this.detail = p.text;
      this.phase = 'burn';
    }
    const r = this.burn(f);
    if (r === 'failed') return this.fail(f, this.message);
    if (r) this.next(f);
    return this.status;
  }

  private reentry(f: Flight, at: Body): MissionStatus {
    f.target = at.id;
    if (f.status === 'landed') {
      this.next(f);
      return this.status;
    }
    if (this.phase === 'start') {
      // Tiefsten Punkt auf Wiedereintrittshöhe legen (der Computer nimmt die echte Vorhersage).
      this.detail = 'Wiedereintritt planen.';
      this.plan(f, 'deorbit');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      this.phase = p.ok && f.node ? 'burn' : 'fall';
      return this.status;
    }
    if (this.phase === 'burn') {
      const r = this.burn(f);
      if (r === 'failed') return this.fail(f, this.message);
      if (r) this.phase = 'fall';
      return this.status;
    }
    if (this.phase === 'fall') {
      // Bis kurz vor die Lufthülle vorspulen, dann untere Stufen abwerfen (nur, wenn der Schirm
      // die Kapsel allein sicher herunterbringt).
      const alt = f.relative(at).altitude;
      if (alt > at.atmosphere * 1.6) {
        this.detail = 'Anflug zum Wiedereintritt – Zeitraffer.';
        this.fastForward(f);
        return this.status;
      }
      f.setWarp(0);
      const drop = dropForReentry(f);
      if (drop > 0) {
        const probe = f.segs.slice(0, f.segs.length - drop);
        const chute = probe.some((s) => s.parts.some((id) => part(id).kind === 'chute'));
        if (chute) for (let i = 0; i < drop; i++) f.stage();
      }
      if (f.chute === 'stowed') f.deployChute();
      this.phase = 'land';
      return this.status;
    }
    if (!(this.sub instanceof LandingPilot)) this.sub = new LandingPilot();
    this.detail = 'Wiedereintritt: Hitzeschild voran, dann Fallschirm.';
    const ph = this.sub.update(f);
    if (ph === 'failed') return this.fail(f, this.sub.message || 'Landung abgebrochen.');
    if (ph === 'done') this.next(f);
    return this.status;
  }

  private rendezvous(f: Flight, to: TargetId): MissionStatus {
    f.target = to;
    if (this.phase === 'start') {
      this.detail = `${stepLabel({ kind: 'rendezvous', to })} planen.`;
      this.plan(f, 'transfer');
      this.phase = 'planned';
      return this.status;
    }
    if (this.phase === 'planned') {
      const p = this.take(f);
      if (!p) return this.status;
      if (!p.ok || !f.node) return this.fail(f, p.text);
      this.detail = p.text;
      this.phase = 'burn';
      return this.status;
    }
    if (this.phase === 'burn' || this.phase === 'match-burn') {
      const r = this.burn(f);
      if (r === 'failed') return this.fail(f, this.message);
      if (!r) return this.status;
      if (this.phase === 'match-burn' && this.counter >= 99) {
        this.next(f);
        return this.status;
      }
      this.phase = 'match';
    }
    if (this.phase === 'match') {
      this.detail = 'Geschwindigkeit angleichen planen.';
      this.plan(f, 'match');
      this.phase = 'match-planned';
      return this.status;
    }
    if (this.phase === 'match-planned') {
      const p = this.take(f);
      if (!p) return this.status;
      if (!p.ok || !f.node) {
        const ti = f.targetInfo();
        if (ti && ti.distance < 5_000) {
          this.next(f);
          return this.status;
        }
        return this.fail(f, p.text);
      }
      this.detail = p.text;
      // „Kurs korrigieren“ – danach noch einmal angleichen; sonst ist das Angleichen der letzte.
      if (p.title.startsWith('Kurs') && this.counter < 4) this.counter++;
      else this.counter = 99;
      this.phase = 'match-burn';
    }
    return this.status;
  }

  /**
   * Langsam an einen winzigen Mond heran, bis dicht über den Boden – erst dort übernimmt der
   * Lande-Autopilot (am Rand des winzigen Einflussbereichs zieht der Planet noch kräftig).
   */
  private approach(f: Flight, to: Body): MissionStatus {
    f.target = to.id;
    const near = f.targetInfo();
    if ((f.refBody() === to && near && near.distance < 300) || f.status === 'landed') {
      this.next(f);
      return this.status;
    }
    if (!(this.sub instanceof DockPilot)) this.sub = new DockPilot(6);
    if (f.warpIndex) f.setWarp(0);
    const ti = f.targetInfo();
    this.detail = ti
      ? `Anflug ${forms(to).to}: noch ${ti.distance < 1_000 ? `${Math.round(ti.distance)} m` : `${(ti.distance / 1000).toFixed(1)} km`}, ${ti.speed.toFixed(1)} m/s.`
      : `Anflug ${forms(to).to}.`;
    this.sub.update(f);
    if (f.t - this.stepStart > 3 * 3_600)
      return this.fail(f, `Anflug ${forms(to).to} dauert zu lange.`);
    return this.status;
  }

  private dock(f: Flight): MissionStatus {
    f.target = 'station';
    if (!(this.sub instanceof DockPilot)) this.sub = new DockPilot();
    const ti = f.targetInfo();
    this.detail = ti
      ? `Anflug an die Station: ${ti.distance < 1_000 ? `${Math.round(ti.distance)} m` : `${(ti.distance / 1000).toFixed(1)} km`}, ${ti.speed.toFixed(1)} m/s.`
      : 'Anflug an die Station.';
    if (f.warpIndex) f.setWarp(0);
    if (this.sub.update(f) === 'done') this.next(f);
    else if (f.t - this.stepStart > 3 * 3_600)
      return this.fail(f, 'Andocken dauert zu lange – bitte selbst mit RCS (R) heranfahren.');
    return this.status;
  }
}
