/**
 * Bordcomputer: plant Manöver wie ein Flugdynamiker – Kreisbahn am höchsten oder tiefsten Punkt,
 * Hohmann-Transfers zu Monden und Planeten, Rendezvous mit der Station, Geschwindigkeit angleichen,
 * Rückflug vom Mond und Wiedereintritt. Die Formeln liefern einen Startwert; danach sucht der
 * Computer mit der echten Mehrkörper-Vorhersage die beste Zündzeit und Stärke.
 */
import { Flight, nodeFrame, type Prediction, type TargetId } from './flight';
import { clockIn, fmt, km } from './format';
import {
  elements,
  period,
  radiusCrossings,
  stateAt,
  timeToApoapsis,
  timeToPeriapsis,
} from './kepler';
import {
  BODIES,
  EARTH,
  STATION,
  SUN,
  angularRate,
  bodyById,
  bodyState,
  forms,
  orbitAround,
  phaseLead,
  requiredExcess,
  stationState,
  tinyBody,
  transferWindow,
  type Body,
} from './world';

export type PlanId =
  'circ-ap' | 'circ-pe' | 'capture' | 'transfer' | 'correct' | 'match' | 'return' | 'deorbit';

export interface Plan {
  ok: boolean;
  title: string;
  text: string;
  /** Wartezeit bis zum Startfenster, wenn es für die Planung noch zu weit weg ist. */
  wait?: number;
  /** Die Bahn hat sich beim Rechnen verändert – einfach noch einmal planen. */
  retry?: boolean;
}

export interface PlanOption {
  id: PlanId;
  label: string;
  hint: string;
}

const TAU = 2 * Math.PI;
const mod = (a: number): number => ((a % TAU) + TAU) % TAU;
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

function fail(title: string, text: string, wait?: number): Plan {
  return { ok: false, title, text, wait };
}

/** Tiefster Punkt für den Wiedereintritt: gut in der Atmosphäre, aber nicht zu steil. */
export function reentryAltitude(b: Body): number {
  return b === EARTH ? 25_000 : b.atmosphere * 0.5;
}

/** Gewünschte Höhe des tiefsten Punkts bei der Ankunft an einem Körper. */
export function arrivalAltitude(b: Body): number {
  if (b === EARTH) return reentryAltitude(b);
  if (b.atmosphere > 0) return b.atmosphere * 1.5;
  return Math.min(100_000, Math.max(500, b.radius * 0.3));
}

/**
 * Wandert die Vorhersage ab `from` entlang und meldet für jeden Punkt den Abstand zu `body` –
 * bis der erste tiefste Punkt vorbei ist. Spätere Vorbeiflüge zählen nicht: Bis dahin hätten die
 * Luft oder das nächste Manöver die Bahn längst verändert (sonst zielt der Computer beim Rückflug
 * vom Mond womöglich auf die zweite Runde statt auf die erste).
 */
function untilFirstClosest(
  p: Prediction,
  body: Body,
  from: number,
  visit: (i: number, d: number) => boolean | void,
): void {
  let prev = Infinity;
  let low = Infinity;
  let falling = false;
  // Solange die Rakete noch bei einem Mond des Körpers ist (etwa kurz nach dem Rückflug-Brennen),
  // zählen Annäherungen an den Körper nicht – sie kreist ja noch um den Mond.
  const moons = BODIES.filter((b) => b.parent === body.id);
  for (let i = Math.max(0, from); i < p.n; i++) {
    const t = p.ts[i]!;
    if (
      moons.some((m) => {
        const [mx, my] = bodyState(m, t);
        return Math.hypot(p.xs[i]! - mx, p.ys[i]! - my) < m.hill;
      })
    )
      continue;
    const [bx, by] = bodyState(body, t);
    const d = Math.hypot(p.xs[i]! - bx, p.ys[i]! - by);
    if (Number.isFinite(prev) && d < prev * 0.9999) falling = true;
    else if (falling && d > low * 1.01 + 1_000) return;
    prev = d;
    low = Math.min(low, d);
    if (visit(i, d) === false) return;
  }
}

/** Wie `untilFirstClosest`, nur bis der erste höchste Punkt vorbei ist. */
function untilFirstFarthest(
  p: Prediction,
  body: Body,
  from: number,
  visit: (i: number, d: number) => boolean | void,
): void {
  let prev = -Infinity;
  let high = 0;
  let rising = false;
  for (let i = Math.max(0, from); i < p.n; i++) {
    const [bx, by] = bodyState(body, p.ts[i]!);
    const d = Math.hypot(p.xs[i]! - bx, p.ys[i]! - by);
    if (Number.isFinite(prev) && d > prev * 1.0001) rising = true;
    else if (rising && d < high * 0.99 - 1_000) return;
    prev = d;
    high = Math.max(high, d);
    if (visit(i, d) === false) return;
  }
}

/**
 * Höhe des (ersten) tiefsten Punkts über `body` auf der vorhergesagten Bahn ab dem Index `from`
 * (echte Mehrkörperbahn; bei einem Aufschlag negativ aus den Bahnelementen). null, wenn die Bahn
 * nicht in die Hill-Sphäre des Körpers kommt.
 */
export function arrivalPeriapsis(p: Prediction, body: Body, from: number): number | null {
  return arrival(p, body, from)?.altitude ?? null;
}

/** Wie `arrivalPeriapsis`, dazu der Zeitpunkt des tiefsten Punkts. */
function arrival(p: Prediction, body: Body, from: number): { altitude: number; t: number } | null {
  let best: number | null = null;
  let when = 0;
  let entered = false;
  untilFirstClosest(p, body, from, (i, d) => {
    if (d > body.hill) return !entered;
    entered = true;
    const alt = d - body.radius;
    if (best === null || alt < best) {
      best = alt;
      when = p.ts[i]!;
    }
    if (p.impact === body && i === p.n - 1) {
      const [bx, by, bvx, bvy] = bodyState(body, p.ts[i]!);
      const o = orbitAround(body, p.xs[i]! - bx, p.ys[i]! - by, p.vxs[i]! - bvx, p.vys[i]! - bvy);
      best = Math.min(o.periapsis, 0);
    }
  });
  return best === null ? null : { altitude: best, t: when };
}

/**
 * Vorbeiflug mit Vorzeichen: Abstand des tiefsten Punkts vom Mittelpunkt des Körpers, positiv bei
 * einem Vorbeiflug gegen, negativ im Uhrzeigersinn. So lässt sich die Bahn stetig verschieben –
 * auch über einen Aufschlag hinweg auf die andere Seite.
 */
export function signedMiss(p: Prediction, body: Body, from: number): number | null {
  let best = -1;
  let bestD = Infinity;
  untilFirstClosest(p, body, from, (i, d) => {
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  if (best < 0) return null;
  const t = p.ts[best]!;
  const [bx, by, bvx, bvy] = bodyState(body, t);
  const rx = p.xs[best]! - bx;
  const ry = p.ys[best]! - by;
  const vx = p.vxs[best]! - bvx;
  const vy = p.vys[best]! - bvy;
  const h = rx * vy - ry * vx;
  let r = bestD;
  if (bestD < body.hill) {
    const o = orbitAround(body, rx, ry, vx, vy);
    r = o.periapsis + body.radius;
  }
  return (h >= 0 ? 1 : -1) * r;
}

interface Candidate {
  t: number;
  dv: number;
  score: number;
}

/** Sucht Zündzeit und Stärke mit der kleinsten Bewertung (Koordinatensuche). */
function search(
  f: Flight,
  t0: number,
  dv0: number,
  spanT: number,
  spanDv: number,
  score: (p: Prediction) => number,
  coarse = 6,
): Candidate {
  let best: Candidate = { t: t0, dv: dv0, score: Infinity };
  const test = (t: number, dv: number): void => {
    if (t < f.t + 5) return;
    f.setNode(t, dv, 0);
    const s = score(f.predict(1400, true));
    if (s < best.score) best = { t, dv, score: s };
  };
  for (let k = -coarse; k <= coarse; k++) test(t0 + (k * spanT) / coarse, dv0);
  for (let j = -4; j <= 4; j++) test(best.t, best.dv * (1 + (j * spanDv) / 4));
  const t1 = best.t;
  for (let k = -4; k <= 4; k++) test(t1 + (k * spanT) / (coarse * 5), best.dv);
  const dv1 = best.dv;
  for (let j = -4; j <= 4; j++) test(best.t, dv1 * (1 + (j * spanDv) / 20));
  for (let k = -3; k <= 3; k++) test(best.t + (k * spanT) / (coarse * 25), best.dv);
  return best;
}

/**
 * Nächste Etappe auf dem Weg zu `tb`: Zu einem Mond eines anderen Planeten (Phobos, Europa) geht
 * es erst zu diesem Planeten, von dort weiter zum Mond.
 */
export function legGoal(tb: Body, ref: Body): Body {
  if (tb !== ref && tb.parent && tb.parent !== 'sun' && tb.parent !== ref.id) {
    const planet = bodyById(tb.parent);
    if (planet.parent === 'sun' && planet !== ref) return planet;
  }
  return tb;
}

/** Welche Pläne gerade sinnvoll sind (mit der letzten Vorhersage, falls vorhanden). */
export function planOptions(f: Flight, pred: Prediction | null = null): PlanOption[] {
  if (f.status !== 'flying') return [];
  const ref = f.refBody();
  const kepler = f.orbit(ref);
  // Tiefster und höchster Punkt wie im Cockpit: weit draußen aus der echten Vorhersage.
  const shown = f.apsidesShown(pred);
  const o = { ...kepler, periapsis: shown.periapsis, apoapsis: shown.apoapsis };
  const out: PlanOption[] = [];
  // Eine schon runde Bahn braucht keine Kreisbahn-Manöver.
  const round = o.bound && o.eccentricity < 0.01;
  if (o.bound && !round && o.apoapsis > Math.max(ref.atmosphere, 1_000))
    out.push({
      id: 'circ-ap',
      label: 'Kreisbahn am Ap',
      hint: 'Am höchsten Punkt so beschleunigen, dass die Bahn rund wird.',
    });
  if (!round && o.periapsis > Math.max(ref.atmosphere, 1_000))
    out.push({
      id: 'circ-pe',
      label: o.bound ? 'Kreisbahn am Pe' : `Einschwenken ${forms(ref).at}`,
      hint: o.bound
        ? 'Am tiefsten Punkt bremsen, bis die Bahn rund ist.'
        : 'Am tiefsten Punkt bremsen – dann fängt dich der Körper ein.',
    });
  const target = f.target;
  const orb = orbiterFor(target);
  if (orb && ref === orb.ref && o.bound) {
    out.push({
      id: 'transfer',
      label: `Rendezvous mit ${orb.dat}`,
      hint: `Zündung so, dass du ${orb.nom} an einer Kreuzung eurer Bahnen triffst.`,
    });
    out.push({
      id: 'match',
      label: 'Geschwindigkeit angleichen',
      hint: `Bei der nächsten Annäherung auf die Geschwindigkeit ${orb.gen} bremsen.`,
    });
  } else if (target && target !== 'station' && o.bound) {
    const tb = bodyById(target);
    const goal = legGoal(tb, ref);
    if (goal.parent === ref.id || (goal.parent === 'sun' && ref.parent === 'sun' && goal !== ref))
      out.push({
        id: 'transfer',
        label: `Transfer zu: ${goal.name}${goal !== tb ? ` (weiter zu ${tb.name})` : ''}`,
        hint:
          goal.parent === ref.id && f.elements(ref).e > 0.1
            ? `Treffpunkt mit ${forms(goal).dat} an einer Bahnkreuzung – auch aus einer langen Ellipse.`
            : 'Hohmann-Transfer im richtigen Startfenster.',
      });
    if (ref.parent === tb.id && ref.parent !== 'sun')
      out.push({
        id: 'return',
        label: `Rückflug zu: ${tb.name}`,
        hint: `Aus der Bahn um ${forms(ref).acc} zurück, tiefster Punkt ${km(arrivalAltitude(tb))} über ${forms(tb).dat}.`,
      });
  }
  if (target === ref.id && !o.bound)
    out.push({
      id: 'correct',
      label: `Anflug korrigieren`,
      hint: `Tiefsten Punkt auf ${km(arrivalAltitude(ref))} über ${forms(ref).dat} legen – dann einschwenken.`,
    });
  if (!o.bound && o.periapsis > Math.max(ref.atmosphere, 1_000) && ref !== SUN && ref !== EARTH)
    out.push({
      id: 'capture',
      label: `Einfangen ${forms(ref).at} (sparsam)`,
      hint: 'Am tiefsten Punkt nur so viel bremsen, dass eine lange Ellipse bleibt – spart viel Treibstoff.',
    });
  if (target && target !== 'station' && target !== ref.id) {
    const goal = legGoal(bodyById(target), ref);
    const onWay =
      pred?.encounter?.body === goal ||
      ref === SUN ||
      !o.bound ||
      o.apoapsis + ref.radius >
        0.2 * Math.min(ref.hill, goal.parent === ref.id ? goal.distance * 5 : Infinity);
    const offer =
      goal !== ref &&
      !tinyBody(goal) &&
      (goal.parent !== ref.id ? onWay : onWay && o.apoapsis + ref.radius > 0.5 * goal.distance);
    if (offer)
      out.push({
        id: 'correct',
        label: `Kurskorrektur zu: ${goal.name}`,
        hint: `Kleiner Schub, damit du ${km(arrivalAltitude(goal))} über ${forms(goal).dat} ankommst.`,
      });
  }
  if (!target && ref.parent && ref.parent !== 'sun' && o.bound) {
    const parent = bodyById(ref.parent);
    out.push({
      id: 'return',
      label: `Rückflug zu: ${parent.name}`,
      hint: `Aus der Bahn um ${forms(ref).acc} zurück ${forms(parent).to}.`,
    });
  }
  // Weit draußen (z. B. auf dem Heimweg vom Mond) täuscht die Kepler-Bahn beim tiefsten Punkt –
  // dort zählt die echte Vorhersage, die der Computer ohnehin nimmt.
  if (o.bound && ref.solid && (o.periapsis > 0 || o.apoapsis > 10 * ref.radius))
    out.push({
      id: 'deorbit',
      label: ref.atmosphere > 0 ? 'Wiedereintritt vorbereiten' : 'Abstieg zur Landung',
      hint:
        ref.atmosphere > 0
          ? `Bremsen, bis der tiefste Punkt ${km(reentryAltitude(ref))} hoch in der Atmosphäre liegt.`
          : 'Am höchsten Punkt bremsen, bis die Bahn knapp über den Boden führt.',
    });
  return out;
}

/**
 * Welcher der angebotenen Pläne gerade der nächste sinnvolle Schritt zum Ziel ist (oder null).
 * Nur eine Empfehlung aus der letzten Vorhersage – gerechnet wird erst beim Antippen.
 */
export function recommendedPlan(
  f: Flight,
  options: readonly PlanOption[],
  pred: Prediction | null,
): PlanId | null {
  const has = (id: PlanId): PlanId | null => (options.some((o) => o.id === id) ? id : null);
  const target = f.target;
  if (f.status !== 'flying' || !target) return null;
  const ref = f.refBody();
  const o = f.orbit(ref);
  // Noch keine stabile Bahn: erst rund machen.
  if (o.bound && o.periapsis < Math.max(ref.atmosphere, 1_000) && ref !== SUN)
    return has('circ-ap');
  const orb = orbiterFor(target);
  if (orb) {
    if (ref !== orb.ref) return null;
    const near = pred?.closest && pred.closest.distance < 50_000;
    return near ? has('match') : has('transfer');
  }
  if (target === 'station') return null;
  const tb = bodyById(target);
  if (tb === ref) {
    if (o.bound) return null;
    // Angekommen: Anflughöhe prüfen, dann einschwenken (bei Riesen sparsam).
    const pe = pred ? arrivalPeriapsis(pred, ref, 0) : null;
    if (
      pe !== null &&
      Math.abs(pe - arrivalAltitude(ref)) > Math.max(5_000, 0.3 * arrivalAltitude(ref))
    )
      return has('correct');
    return ref.solid ? has('circ-pe') : (has('capture') ?? has('circ-pe'));
  }
  const goal = legGoal(tb, ref);
  if (pred?.encounter?.body === goal) {
    const pe = arrivalPeriapsis(pred, goal, 0);
    const want = arrivalAltitude(goal);
    return pe === null || Math.abs(pe - want) > Math.max(5_000, 0.3 * want) ? has('correct') : null;
  }
  if (ref.parent === goal.id) return has('return');
  return has('transfer') ?? has('correct');
}

export function makePlan(f: Flight, id: PlanId): Plan {
  switch (id) {
    case 'circ-ap':
      return planCircularize(f, 'ap');
    case 'circ-pe':
      return planCircularize(f, 'pe');
    case 'capture':
      return planCapture(f);
    case 'transfer': {
      const orb = orbiterFor(f.target);
      return orb && f.refBody() === orb.ref ? planRendezvous(f, orb) : planTransfer(f);
    }
    case 'correct':
      return planCorrection(f);
    case 'match':
      return planMatch(f);
    case 'return':
      return planReturn(f);
    case 'deorbit':
      return planDeorbit(f);
  }
}

/** Am höchsten bzw. tiefsten Punkt auf Kreisbahngeschwindigkeit bringen. */
/**
 * Manöver zur Kreisbahn an einem Bahnpunkt (Weltkoordinaten): waagerecht auf Kreisbahntempo,
 * die senkrechte Geschwindigkeit weg. Gibt den Anteil in Flugrichtung zurück.
 */
function circularNode(
  f: Flight,
  ref: Body,
  t: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  speed?: number,
): number {
  const [bx, by, bvx, bvy] = bodyState(ref, t);
  const rx = x - bx;
  const ry = y - by;
  const r = Math.hypot(rx, ry);
  const ux = rx / r;
  const uy = ry / r;
  const rvx = vx - bvx;
  const rvy = vy - bvy;
  const radial = rvx * ux + rvy * uy;
  const hx = rvx - radial * ux;
  const hy = rvy - radial * uy;
  const h = Math.hypot(hx, hy) || 1;
  const vc = speed ?? Math.sqrt(ref.mu / r);
  const dx = ((vc - h) * hx) / h - radial * ux;
  const dy = ((vc - h) * hy) / h - radial * uy;
  const [px, py, qx, qy] = nodeFrame(ref, x, y, vx, vy, t);
  const pro = dx * px + dy * py;
  f.setNode(t, pro, dx * qx + dy * qy);
  return pro;
}

export function planCircularize(f: Flight, where: 'ap' | 'pe'): Plan {
  const title = where === 'ap' ? 'Kreisbahn am Ap' : 'Kreisbahn am Pe';
  if (f.status !== 'flying') return fail(title, 'Erst abheben.');
  const ref = f.refBody();
  const el = f.elements(ref);
  const o = f.orbit(ref);
  // Weit draußen stören Sonne, Planeten und Monde die Kepler-Bahn: den Bahnpunkt dann aus der
  // echten Vorhersage nehmen (nahe am Körper ist die Kepler-Rechnung genauer).
  const far = el.e > 0.5 || (o.bound && o.apoapsis + ref.radius > 0.05 * ref.hill);
  if (far) {
    const node = f.node;
    f.node = null;
    const p = f.predict(2500);
    f.node = node;
    let best = -1;
    let bestD = where === 'pe' ? Infinity : -Infinity;
    const visit = (i: number, d: number): boolean | void => {
      if (d > ref.hill) return false;
      if (where === 'pe' ? d < bestD : d > bestD) {
        bestD = d;
        best = i;
      }
    };
    if (where === 'pe') untilFirstClosest(p, ref, 1, visit);
    else untilFirstFarthest(p, ref, 1, visit);
    if (best > 0 && best < p.n - 1 && p.ts[best]! > f.t + 10) {
      if (bestD - ref.radius < Math.max(ref.atmosphere, 1_000))
        return fail(
          title,
          `Der tiefste Punkt liegt ${ref.atmosphere > 0 ? 'in der Atmosphäre' : 'zu dicht am Boden'} – erst den Anflug korrigieren (oder mit Fallschirm direkt landen).`,
        );
      const t = p.ts[best]!;
      const dv = circularNode(f, ref, t, p.xs[best]!, p.ys[best]!, p.vxs[best]!, p.vys[best]!);
      return {
        ok: true,
        title: el.e >= 1 ? `Einschwenken ${forms(ref).at}` : title,
        text: `${fmt(Math.abs(dv))} m/s ${dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(t - f.t)}, auf ${km(bestD - ref.radius)} Höhe.`,
      };
    }
  }
  let dt = where === 'ap' ? timeToApoapsis(el, f.t) : timeToPeriapsis(el, f.t);
  if (!Number.isFinite(dt))
    return fail(
      title,
      where === 'ap'
        ? 'Die Bahn ist offen – es gibt keinen höchsten Punkt.'
        : 'Der tiefste Punkt liegt schon hinter dir.',
    );
  if (dt < 10 && el.e < 1) dt += period(el);
  const [x, y, vx, vy] = stateAt(el, f.t + dt);
  const r = Math.hypot(x, y);
  if (r - ref.radius < Math.max(ref.atmosphere, 1_000))
    return fail(
      title,
      `Dieser Bahnpunkt liegt ${ref.atmosphere > 0 ? 'in der Atmosphäre' : 'zu dicht am Boden'} – dort hält keine Kreisbahn.`,
    );
  const [bx, by, bvx, bvy] = bodyState(ref, f.t + dt);
  const dv = circularNode(f, ref, f.t + dt, bx + x, by + y, bvx + vx, bvy + vy);
  return {
    ok: true,
    title,
    text: `${fmt(Math.abs(dv))} m/s ${dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(dt)}, auf ${km(r - ref.radius)} Höhe.`,
  };
}

/**
 * Einfangen (sparsam): am tiefsten Punkt nur so viel bremsen, dass die Bahn geschlossen ist – mit
 * dem höchsten Punkt etwas hinter dem äußersten Mond (für den Weiterflug), sonst weit draußen.
 * Bei großen Planeten kostet das nur einen Bruchteil einer Kreisbahn knapp über den Wolken.
 */
export function planCapture(f: Flight): Plan {
  const ref = f.refBody();
  const title = `Einfangen ${forms(ref).at}`;
  if (f.status !== 'flying') return fail(title, 'Erst abheben.');
  const node = f.node;
  f.node = null;
  const p = f.predict(2500);
  f.node = node;
  let best = -1;
  let bestD = Infinity;
  untilFirstClosest(p, ref, 1, (i, d) => {
    if (d > ref.hill) return false;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  if (best <= 0 || best >= p.n - 1 || p.ts[best]! < f.t + 10)
    return fail(title, 'Kein tiefster Punkt in Sicht – erst den Anflug korrigieren.');
  if (bestD - ref.radius < Math.max(ref.atmosphere, 1_000))
    return fail(
      title,
      `Der tiefste Punkt liegt ${ref.atmosphere > 0 ? 'in der Atmosphäre' : 'zu dicht am Boden'} – erst den Anflug korrigieren.`,
    );
  const moons = BODIES.filter((b) => b.parent === ref.id);
  const apo = Math.max(
    bestD * 1.5,
    moons.length ? Math.max(...moons.map((m) => m.distance)) * 1.5 : 0.1 * ref.hill,
  );
  const need = Math.sqrt(ref.mu * (2 / bestD - 2 / (bestD + apo)));
  const t = p.ts[best]!;
  const dv = circularNode(f, ref, t, p.xs[best]!, p.ys[best]!, p.vxs[best]!, p.vys[best]!, need);
  return {
    ok: true,
    title,
    text: `${fmt(Math.abs(dv))} m/s gegen die Flugrichtung in ${clockIn(t - f.t)}, auf ${km(bestD - ref.radius)} Höhe. Danach eine lange Ellipse bis ${km(apo - ref.radius)}.`,
  };
}

/** „Ankunft 45 km über dem Mars“ – oder, bei einem Treffer, der Hinweis auf die Kurskorrektur. */
function arrivalText(pe: number, target: Body): string {
  return pe < 0
    ? `Die Bahn trifft ${forms(target).acc} noch mitten – nach dem Brennen mit „Kurskorrektur“ auf ${km(arrivalAltitude(target))} bringen`
    : `Ankunft ${km(pe)} über ${forms(target).dat}`;
}

/** Hohmann-Transfer zu einem Mond des Bezugskörpers oder zu einem anderen Planeten. */
export function planTransfer(f: Flight): Plan {
  const target =
    f.target && f.target !== 'station' ? legGoal(bodyById(f.target), f.refBody()) : null;
  if (!target) return fail('Transfer', 'Erst ein Ziel wählen.');
  const ref = f.refBody();
  const el = f.elements(ref);
  const title = `Transfer zu: ${target.name}`;
  if (el.e >= 1) return fail(title, 'Erst eine geschlossene Umlaufbahn fliegen.');
  const P = period(el);
  const want = arrivalAltitude(target);
  const score = (p: Prediction): number => {
    const pe = arrivalPeriapsis(p, target, Math.max(p.nodeIndex, 0));
    if (pe !== null) return Math.abs(pe - want) + (pe < 0 ? target.radius : 0);
    return 1e12 + (p.closest?.distance ?? 1e12);
  };

  if (target.parent === ref.id && el.e > 0.1) {
    // Langgestreckte Bahn (etwa gleich nach dem Einfangen): Zündzeit und Schub so wählen, dass
    // die Rakete den Mond an einer Kreuzung der Bahnen trifft, dann mit der echten Vorhersage
    // auf die gewünschte Ankunftshöhe feinstellen.
    // Gleich nach dem Brennen ankommen (die Vorhersage reicht nicht über viele Umläufe), dafür
    // bis zu vier Umläufe auf die richtige Stellung des Mondes warten.
    const m = findMeeting(f, el, moonOrbiter(target), hohmannCenter(el, target.distance), 1, {
      revs: 1,
      laps: 4,
    });
    if (!m)
      return fail(
        title,
        `Von dieser Bahn aus findet der Computer keinen Treffpunkt mit ${forms(target).dat} – erst die Bahn runder machen.`,
      );
    const best = search(f, m.tb, m.dv, Math.min(P / 48, 1_800), 0.01, score, 3);
    f.setNode(best.t, best.dv, 0);
    const p = f.predict(1400, true);
    const pe = arrivalPeriapsis(p, target, Math.max(p.nodeIndex, 0));
    const laps = Math.round((m.tc - m.tb) / period(el));
    return {
      ok: true,
      title,
      text:
        pe === null
          ? `${fmt(Math.abs(best.dv))} m/s ${best.dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(best.t - f.t)} – danach mit einer Kurskorrektur nachbessern.`
          : `${fmt(Math.abs(best.dv))} m/s ${best.dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(best.t - f.t)}. ${arrivalText(pe, target)}${laps >= 2 ? ` (nach ${laps} Umläufen)` : ''}.`,
    };
  }

  if (target.parent === ref.id) {
    // Mond des Bezugskörpers: Phasenwinkel wie beim Mondfenster.
    const r2 = target.distance;
    const tt = Math.PI * Math.sqrt(((el.a + r2) / 2) ** 3 / ref.mu);
    const rate = angularRate(target);
    const ideal = Math.PI - rate * tt;
    const omega = TAU / P;
    if (omega <= rate) return fail(title, `Deine Bahn liegt schon höher als ${forms(target).nom}.`);
    const [bx, by] = bodyState(ref, f.t);
    const [tx, ty] = bodyState(target, f.t);
    const lead = Math.atan2(f.y - by, f.x - bx) - Math.atan2(ty - by, tx - bx);
    let wait = mod(lead - ideal) / (omega - rate);
    if (wait < 30) wait += TAU / (omega - rate);
    const [x, y, vx, vy] = stateAt(el, f.t + wait);
    const r1 = Math.hypot(x, y);
    const need = Math.sqrt(ref.mu * (2 / r1 - 2 / (r1 + r2)));
    const dv0 = need - Math.hypot(vx, vy);
    const best = search(f, f.t + wait, dv0, P / 12, 0.02, score);
    f.setNode(best.t, best.dv, 0);
    const p = f.predict(1400, true);
    const pe = arrivalPeriapsis(p, target, Math.max(p.nodeIndex, 0));
    return pe === null
      ? {
          ok: true,
          title,
          text: `Kein Treffer gefunden – das Manöver kommt nah heran. Mit ± in Flugrichtung nachbessern.`,
        }
      : {
          ok: true,
          title,
          text: `${fmt(best.dv)} m/s in ${clockIn(best.t - f.t)}. ${arrivalText(pe, target)}.`,
        };
  }

  if (target.parent === 'sun' && ref.parent === 'sun') {
    // Planet zu Planet: Warten auf das Startfenster, dann die Fluchtbahn in die richtige Richtung.
    const w = transferWindow(ref, target);
    const ideal = mod(w.lead);
    const lead = phaseLead(ref, target, f.t);
    const rel = angularRate(ref) - angularRate(target);
    const syn = TAU / Math.abs(rel);
    let wait = mod(rel > 0 ? lead - ideal : ideal - lead) / Math.abs(rel);
    if (syn - wait < 3 * 86_400) wait -= syn;
    if (wait > 2.5 * P && wait > 3 * 86_400)
      return fail(
        title,
        `Das Startfenster ${forms(target).to} öffnet sich in ${clockIn(wait)}. Spule mit dem Zeitsprung bis kurz davor und plane dann noch einmal.`,
        wait,
      );
    const vinf = Math.abs(requiredExcess(ref, target));
    const base = f.t + Math.max(90, wait - P / 2);
    const dvAt = (t: number): number => {
      const [x, y, vx, vy] = stateAt(el, t);
      const r = Math.hypot(x, y);
      return Math.sqrt(vinf * vinf + (2 * ref.mu) / r) - Math.hypot(vx, vy);
    };
    let start: Candidate = { t: base, dv: dvAt(base), score: Infinity };
    for (let k = 0; k < 24; k++) {
      const t = base + (k * P) / 24;
      const dv = dvAt(t);
      f.setNode(t, dv, 0);
      const s = score(f.predict(1400, true));
      if (s < start.score) start = { t, dv, score: s };
    }
    const best = search(f, start.t, start.dv, P / 24, 0.06, score, 3);
    f.setNode(best.t, best.dv, 0);
    const p = f.predict(1400, true);
    const pe = arrivalPeriapsis(p, target, Math.max(p.nodeIndex, 0));
    const flight = pe !== null && p.encounter ? p.encounter.t - best.t : w.duration;
    return {
      ok: true,
      title,
      text:
        pe === null
          ? `Das Fenster passt, aber noch kein Treffer: ${fmt(best.dv)} m/s in ${clockIn(best.t - f.t)}. Nach dem Brennen mit kleinen Korrekturen nachbessern.`
          : `${fmt(best.dv)} m/s in ${clockIn(best.t - f.t)}. Flugzeit etwa ${Math.round(flight / 86_400)} Tage. ${arrivalText(pe, target)}.`,
    };
  }
  return fail(title, `Von ${forms(ref).dat} aus ist ${forms(target).nom} kein direktes Ziel.`);
}

/**
 * Kurskorrektur unterwegs: ein kleiner Schub in oder gegen die Flugrichtung, bis der tiefste Punkt
 * am Ziel die gewünschte Höhe hat (Intervallhalbierung mit der echten Vorhersage).
 */
export function planCorrection(f: Flight): Plan {
  const target =
    f.target && f.target !== 'station' ? legGoal(bodyById(f.target), f.refBody()) : null;
  if (!target) return fail('Kurskorrektur', 'Erst ein Ziel wählen.');
  const title =
    f.refBody() === target ? `Anflug auf ${forms(target).acc}` : `Kurskorrektur zu: ${target.name}`;
  if (f.status !== 'flying') return fail(title, 'Erst abheben.');
  const t = f.t + Math.max(60, Math.min(f.burnTime(20), 600) / 2 + 30);
  const miss = (pro: number, rad: number): number | null => {
    f.setNode(t, pro, rad);
    return signedMiss(f.predict(1600, true), target, 0);
  };
  const base = miss(0, 0);
  if (base === null) {
    f.clearNode();
    return fail(title, 'Keine Vorhersage möglich.');
  }
  const natural = base >= 0 ? 1 : -1;
  // Zu einem Planeten mit Monden möglichst im Uhrzeigersinn ankommen (so laufen die Monde) – dann
  // ist der Weiterflug zu einem Mond billig. Nur, solange das Ziel noch weit weg ist und der
  // Seitenwechsel wenig kostet.
  const moony =
    f.refBody() !== target && target !== EARTH && BODIES.some((b) => b.parent === target.id);
  const prefer = moony ? -1 : natural;
  const radius = target.radius + arrivalAltitude(target);
  const fine =
    Math.abs(base - natural * radius) < Math.max(2_000, 0.05 * arrivalAltitude(target)) &&
    Math.abs(base) < target.hill;
  const fits = (): Plan => {
    f.clearNode();
    return fail(
      title,
      `Passt schon: Ankunft etwa ${km(Math.abs(base) - target.radius)} über ${forms(target).dat}.`,
    );
  };
  if (fine && prefer === natural) return fits();
  // Wirksamste Richtung aus kleinen Probeschüben (in Flugrichtung und radial).
  const gp = (miss(1, 0) ?? base) - base;
  const gr = (miss(0, 1) ?? base) - base;
  const norm = Math.hypot(gp, gr);
  if (!(norm > 0)) {
    f.clearNode();
    return fail(title, 'Die Bahn reagiert nicht auf kleine Schübe.');
  }
  const dp = gp / norm;
  const dr = gr / norm;
  /** Schub entlang der wirksamsten Richtung, nach dem der Vorbeiflug bei `want` liegt. */
  const solve = (want: number): { x: number; end: number } | null => {
    const g0 = base - want;
    const g = (x: number): number => {
      const m = miss(x * dp, x * dr);
      return m === null ? NaN : m - want;
    };
    // Schätzung aus der Steigung, dann einschachteln und halbieren.
    const est = -g0 / norm;
    let lo = 0;
    let hi = NaN;
    for (let k = 0; k < 14; k++) {
      const x = est * 0.25 * 1.6 ** k;
      if (Math.abs(x) > 3_000) break;
      const gx = g(x);
      if (!Number.isFinite(gx)) continue;
      if (gx * g0 <= 0) {
        hi = x;
        break;
      }
      lo = x;
    }
    if (Number.isNaN(hi)) return null;
    for (let k = 0; k < 40 && Math.abs(hi - lo) > 0.002; k++) {
      const mid = (lo + hi) / 2;
      const gm = g(mid);
      if (!Number.isFinite(gm)) break;
      if (gm * g0 > 0) lo = mid;
      else hi = mid;
    }
    const x = (lo + hi) / 2;
    const end = miss(x * dp, x * dr);
    // Hat die Halbierung an einer Sprungstelle geendet (Treffer ↔ Vorbeiflug), passt das
    // Ergebnis nicht: dann lieber keinen Plan als einen falschen.
    if (end === null || Math.abs(end - want) > Math.max(20_000, 0.25 * arrivalAltitude(target)))
      return null;
    return { x, end };
  };
  let sol = prefer !== natural ? solve(prefer * radius) : null;
  if (sol && Math.abs(sol.x) > 40) sol = null;
  if (!sol && fine) return fits();
  sol ??= solve(natural * radius);
  if (!sol) {
    f.clearNode();
    return fail(
      title,
      `Mit einem kleinen Schub ist ${forms(target).nom} gerade nicht genau zu treffen – etwas später noch einmal versuchen.`,
    );
  }
  const { x, end } = sol;
  const pro = x * dp;
  const rad = x * dr;
  const dir =
    Math.abs(rad) > Math.abs(pro)
      ? rad >= 0
        ? 'nach außen'
        : 'nach innen'
      : pro >= 0
        ? 'in Flugrichtung'
        : 'gegen die Flugrichtung';
  return {
    ok: true,
    title,
    text: `${fmt(Math.abs(x), Math.abs(x) < 10 ? 2 : 0)} m/s (vor allem ${dir}) in ${clockIn(t - f.t)}. Ankunft dann ${km(Math.abs(end) - target.radius)} über ${forms(target).dat}${moony && end < 0 ? ' (im Uhrzeigersinn, wie die Monde)' : ''}.`,
  };
}

/** Winkel eines Punkts um den Mittelpunkt des Bezugskörpers. */
const angleOf = (x: number, y: number): number => Math.atan2(y, x);

/**
 * Ziel auf einer Kreisbahn um `ref`, das man wie die Station anfliegt: die Station selbst und
 * winzige Monde wie Phobos (deren Einflussbereich nur ein paar Kilometer misst), für die
 * Hohmann-Transfers zu Monden auch aus einer langgestreckten Bahn heraus.
 */
export interface Orbiter {
  ref: Body;
  radius: number;
  /** Größe des Ziels selbst (0 bei der Station). */
  size: number;
  /** Ort und Geschwindigkeit relativ zum Mittelpunkt von `ref`. */
  state: (t: number) => [number, number, number, number];
  nom: string;
  gen: string;
  dat: string;
}

const STATION_ORBITER: Orbiter = {
  ref: EARTH,
  radius: STATION.radius,
  size: 0,
  state: stationState,
  nom: 'die Station',
  gen: 'der Station',
  dat: 'der Station',
};

function moonOrbiter(b: Body): Orbiter {
  const ref = bodyById(b.parent!);
  return {
    ref,
    radius: b.distance,
    size: b.radius,
    state: (t) => {
      const [x, y, vx, vy] = bodyState(b, t);
      const [px, py, pvx, pvy] = bodyState(ref, t);
      return [x - px, y - py, vx - pvx, vy - pvy];
    },
    nom: forms(b).nom,
    gen: forms(b).gen,
    dat: forms(b).dat,
  };
}

/** Das Ziel als „Orbiter“, wenn man es wie die Station anfliegt (Station, winzige Monde). */
export function orbiterFor(target: TargetId | null): Orbiter | null {
  if (!target) return null;
  if (target === 'station') return STATION_ORBITER;
  const b = bodyById(target);
  return tinyBody(b) ? moonOrbiter(b) : null;
}

/** Sicherheitsabstand zum Mittelpunkt, bei dem das Angleichen endet (bei der Station 0). */
function standoff(orb: Orbiter): number {
  return orb.size > 0 ? orb.size + 4_000 : 0;
}

/**
 * Rendezvous: ein Schub in oder gegen die Flugrichtung auf eine Bahn, die die Bahn des Ziels
 * kreuzt – und zwar so, dass das Ziel genau dann an der Kreuzung ist. Dafür darf die Rakete auch
 * ein paar Umläufe auf der neuen Bahn warten (Phasenbahn); so klappt es auch aus einer Bahn knapp
 * unter oder auf der Höhe des Ziels. Gerechnet wird mit Kepler-Bahnen und genau per
 * Intervallhalbierung.
 */
export function planRendezvous(f: Flight, orb: Orbiter = STATION_ORBITER): Plan {
  const title = `Rendezvous mit ${orb.dat}`;
  const ref = f.refBody();
  if (ref !== orb.ref) return fail(title, `${cap(orb.nom)} kreist um ${forms(orb.ref).acc}.`);
  const el = f.elements(ref);
  if (el.e >= 1) return fail(title, `Erst eine geschlossene Bahn um ${forms(ref).acc} fliegen.`);
  const best = findMeeting(f, el, orb, hohmannCenter(el, orb.radius), 1);
  if (!best)
    return fail(
      title,
      `Von dieser Bahn aus findet der Computer kein Treffen – erst eine niedrige, runde Bahn um ${forms(ref).acc} fliegen.`,
    );
  f.setNode(best.tb, best.dv, 0);
  const laps = Math.round((best.tc - best.tb) / period(el));
  return {
    ok: true,
    title,
    text: `${fmt(Math.abs(best.dv), Math.abs(best.dv) < 10 ? 1 : 0)} m/s ${best.dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(best.tb - f.t)}. Treffen mit ${orb.dat} in ${clockIn(best.tc - f.t)}${laps >= 2 ? ` (nach ${laps} Umläufen)` : ''} – dann „Geschwindigkeit angleichen“ (${fmt(best.rel)} m/s).`,
  };
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Startwert für den Schub zu einer Zündzeit: so viel in Flugrichtung, dass die neue Bahn die
 * Zielbahn gerade berührt (Hohmann), mit großzügigem Suchbereich.
 */
function hohmannCenter(
  el: ReturnType<typeof elements>,
  r2: number,
): (tb: number) => [number, number] {
  return (tb) => {
    const [x, y, vx, vy] = stateAt(el, tb);
    const r = Math.hypot(x, y);
    const dv = Math.sqrt(el.mu * (2 / r - 2 / (r + r2))) - Math.hypot(vx, vy);
    return [dv, 60 + 0.6 * Math.abs(dv)];
  };
}

interface Meeting {
  tb: number;
  dv: number;
  tc: number;
  rel: number;
  cost: number;
}

/**
 * Sucht Zündzeit (innerhalb eines Umlaufs) und Schub in Flugrichtung (Bereich aus `center`),
 * nach dem die Rakete das Ziel an einer Kreuzung ihrer Bahnen genau trifft – auch erst nach bis
 * zu zwölf Umläufen. Bewertet werden Schub, Tempo gegenüber dem Ziel beim Treffen (mal
 * `relWeight`) und die Wartezeit.
 */
function findMeeting(
  f: Flight,
  el: ReturnType<typeof elements>,
  orb: Orbiter,
  center: (tb: number) => [number, number],
  relWeight: number,
  { revs = 12, laps = 1 }: { revs?: number; laps?: number } = {},
): Meeting | null {
  const P = period(el);
  const ref = orb.ref;
  const r2 = orb.radius;
  const low = ref.radius + ref.atmosphere + 5_000;
  const REVS = revs;
  const STEPS = 80;
  const TIMES = 48 * laps;

  /** Bahn nach dem Schub und Winkelfehler zum Ziel an einer Kreuzung (Zweig b, Umlauf k). */
  const meet = (
    tb: number,
    dv: number,
    b: number,
    k: number,
  ): { err: number; tc: number; rel: number } | null => {
    const [x, y, vx, vy] = stateAt(el, tb);
    const v = Math.hypot(vx, vy);
    const q = (v + dv) / v;
    const el2 = elements(ref.mu, x, y, vx * q, vy * q, tb);
    if (el2.e >= 1 || el2.p / (1 + el2.e) < low) return null;
    const dt = radiusCrossings(el2, tb, r2, 3_000)[b];
    if (dt === undefined) return null;
    const tc = tb + dt + k * period(el2);
    const [sx, sy, svx, svy] = stateAt(el2, tc);
    const [tx, ty, tvx, tvy] = orb.state(tc);
    return {
      err: wrap(angleOf(tx, ty) - angleOf(sx, sy)),
      tc,
      rel: Math.hypot(tvx - svx, tvy - svy),
    };
  };

  let best: Meeting | null = null;
  const errs = new Array<number | null>(STEPS + 1);
  for (let i = 0; i < TIMES; i++) {
    const tb = f.t + 60 + (i * P * laps) / TIMES;
    const [dvCenter, span] = center(tb);
    const dvAt = (j: number): number => dvCenter - span + (2 * span * j) / STEPS;
    for (let b = 0; b < 2; b++) {
      for (let k = 0; k < REVS; k++) {
        for (let j = 0; j <= STEPS; j++) errs[j] = meet(tb, dvAt(j), b, k)?.err ?? null;
        for (let j = 0; j < STEPS; j++) {
          const e0 = errs[j];
          const e1 = errs[j + 1];
          if (e0 == null || e1 == null || e0 * e1 > 0 || Math.abs(e0 - e1) > 1) continue;
          // Nullstelle einschachteln: dort trifft die Rakete das Ziel an der Kreuzung.
          let lo = dvAt(j);
          let hi = dvAt(j + 1);
          let elo = e0;
          for (let it = 0; it < 40; it++) {
            const mid = (lo + hi) / 2;
            const m = meet(tb, mid, b, k);
            if (!m) break;
            if (m.err * elo > 0) {
              lo = mid;
              elo = m.err;
            } else hi = mid;
          }
          const dv = (lo + hi) / 2;
          const m = meet(tb, dv, b, k);
          if (!m || Math.abs(m.err) > 5e-4) continue;
          // Treibstoff für beide Schübe plus etwas für jede Stunde Warten.
          const cost = Math.abs(dv) + relWeight * m.rel + (5 * (m.tc - f.t)) / 3_600;
          if (!best || cost < best.cost) best = { tb, dv, tc: m.tc, rel: m.rel, cost };
        }
      }
    }
  }
  return best;
}

/**
 * Nächste Annäherung an das Ziel auf der Kepler-Bahn: die erste deutliche, nicht unbedingt die
 * allernächste (die kann viele Umläufe später kommen). Grob abtasten, dann fein suchen.
 */
function approach(
  el: ReturnType<typeof elements>,
  orb: Orbiter,
  t0: number,
  t1: number,
): { t: number; distance: number } | null {
  const dist = (t: number): number => {
    const [x, y] = stateAt(el, t);
    const [sx, sy] = orb.state(t);
    return Math.hypot(x - sx, y - sy);
  };
  const rate = Math.sqrt(orb.ref.mu / orb.radius ** 3);
  const step = Math.min(period(el), TAU / rate) / 360;
  const found: { t: number; distance: number }[] = [];
  let a = dist(t0);
  let b = dist(t0 + step);
  for (let t = t0 + step; t < t1; t += step) {
    const c = dist(t + step);
    if (b <= a && b <= c) {
      let lo = t - step;
      let hi = t + step;
      for (let k = 0; k < 50; k++) {
        const m1 = lo + (hi - lo) * 0.382;
        const m2 = lo + (hi - lo) * 0.618;
        if (dist(m1) < dist(m2)) hi = m2;
        else lo = m1;
      }
      const tm = (lo + hi) / 2;
      found.push({ t: tm, distance: dist(tm) });
    }
    a = b;
    b = c;
  }
  if (!found.length) return null;
  const closest = Math.min(...found.map((q) => q.distance));
  return found.find((q) => q.distance <= Math.max(5_000, 2 * closest)) ?? null;
}

/**
 * Bei der nächsten Annäherung die Geschwindigkeit des Ziels übernehmen. Bei einem Mond endet
 * das Bremsen ein paar Kilometer davor (sonst stürzte die Rakete mit voller Wucht hinein).
 */
export function planMatch(f: Flight): Plan {
  const title = 'Geschwindigkeit angleichen';
  const orb = orbiterFor(f.target);
  if (!orb) return fail(title, 'Erst die Station (oder einen winzigen Mond) als Ziel wählen.');
  if (f.status !== 'flying' || f.refBody() !== orb.ref)
    return fail(title, `Erst in eine Bahn um ${forms(orb.ref).acc} fliegen.`);
  const el = f.elements(orb.ref);
  if (el.e >= 1)
    return fail(title, `Erst eine geschlossene Bahn um ${forms(orb.ref).acc} fliegen.`);
  const c = approach(el, orb, f.t + 15, f.t + 12 * period(el));
  if (!c) return fail(title, 'Keine Annäherung in Sicht – plane zuerst das Rendezvous.');
  if (c.distance > 2_000 && c.t - f.t > 0.75 * period(el)) {
    // Noch Zeit bis zum Treffen, aber es wird knapp daneben gehen: erst den Kurs verbessern
    // (das kostet jetzt ein paar Zehntel m/s, beim Treffen ein Vielfaches).
    const fix = findMeeting(f, el, orb, () => [0, 12], 0.1);
    if (fix) {
      f.setNode(fix.tb, fix.dv, 0);
      return {
        ok: true,
        title: `Kurs zu${orb.size > 0 ? ` ${orb.dat}` : 'r Station'} korrigieren`,
        text: `Du kämst nur auf ${km(c.distance)} heran. Erst ${fmt(Math.abs(fix.dv), 2)} m/s ${fix.dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(fix.tb - f.t)} – dann triffst du ${orb.nom} in ${clockIn(fix.tc - f.t)}. Danach noch einmal „Geschwindigkeit angleichen“.`,
      };
    }
  }
  if (c.distance > 50_000)
    return fail(
      title,
      `Die nächste Annäherung ist ${km(c.distance)} weit weg – erst das Rendezvous planen.`,
    );
  let t = c.t;
  const keep = standoff(orb);
  if (keep > c.distance) {
    // Früher bremsen: Die Rakete bleibt etwa `keep` vor dem Mond stehen.
    const [, , vx, vy] = stateAt(el, c.t);
    const [, , svx, svy] = orb.state(c.t);
    const rel = Math.hypot(vx - svx, vy - svy);
    if (rel > 0.5) t = Math.max(f.t + 20, c.t - Math.sqrt(keep ** 2 - c.distance ** 2) / rel);
  }
  const [x, y, vx, vy] = stateAt(el, t);
  const [sx, sy, svx, svy] = orb.state(t);
  const dx = svx - vx;
  const dy = svy - vy;
  const [bx, by, bvx, bvy] = bodyState(orb.ref, t);
  const [px, py, qx, qy] = nodeFrame(orb.ref, bx + x, by + y, bvx + vx, bvy + vy, t);
  f.setNode(t, dx * px + dy * py, dx * qx + dy * qy);
  const gap = Math.max(c.distance, Math.hypot(x - sx, y - sy) - orb.size);
  return {
    ok: true,
    title,
    text: `${fmt(Math.hypot(dx, dy))} m/s in ${clockIn(t - f.t)}, dann ${km(gap)} vor ${orb.dat}. Den Rest mit RCS (R)${orb.size > 0 ? ' – oder mit dem Lande-Autopiloten' : ''}.`,
  };
}

/** Vom Mond (oder einem anderen Mond) zurück zum Planeten, tiefster Punkt in der Atmosphäre. */
export function planReturn(f: Flight): Plan {
  const ref = f.refBody();
  const title = 'Rückflug';
  if (!ref.parent || ref.parent === 'sun') return fail(title, 'Du bist nicht bei einem Mond.');
  const home = bodyById(ref.parent);
  const el = f.elements(ref);
  if (el.e >= 1) return fail(title, `Erst eine Umlaufbahn um ${forms(ref).acc} fliegen.`);
  const P = period(el);
  const want = arrivalAltitude(home);
  const rp = home.radius + want;
  const ra = ref.distance;
  const va = Math.sqrt(home.mu * (2 / ra - 2 / (ra + rp)));
  const vinf = angularRate(ref) * ref.distance - va;
  const dvAt = (t: number): number => {
    const [x, y, vx, vy] = stateAt(el, t);
    return Math.sqrt(vinf * vinf + (2 * ref.mu) / Math.hypot(x, y)) - Math.hypot(vx, vy);
  };
  // Direkt heim: Ein Weg, der erst weit hinausführt und Tage später zurückfällt, zählt als
  // schlechter (auch wenn er am Ende genauso tief kommt).
  const direct = 1.5 * Math.PI * Math.sqrt(((ra + rp) / 2) ** 3 / home.mu);
  const score = (p: Prediction): number => {
    const a = arrival(p, home, Math.max(p.nodeIndex, 0));
    if (!a) return 1e12;
    return Math.abs(a.altitude - want) + Math.max(0, a.t - f.t - direct) * 10;
  };
  let start: Candidate = { t: f.t + 60, dv: dvAt(f.t + 60), score: Infinity };
  for (let k = 0; k < 24; k++) {
    const t = f.t + 60 + (k * P) / 24;
    const dv = dvAt(t);
    f.setNode(t, dv, 0);
    const s = score(f.predict(1400, true));
    if (s < start.score) start = { t, dv, score: s };
  }
  const best = search(f, start.t, start.dv, P / 24, 0.04, score, 3);
  f.setNode(best.t, best.dv, 0);
  const p = f.predict(1400, true);
  const pe = arrivalPeriapsis(p, home, Math.max(p.nodeIndex, 0));
  return {
    ok: true,
    title: `Rückflug zu: ${home.name}`,
    text:
      pe === null
        ? `${fmt(best.dv)} m/s in ${clockIn(best.t - f.t)} – noch nicht perfekt, bitte nachbessern.`
        : `${fmt(best.dv)} m/s in ${clockIn(best.t - f.t)}. Tiefster Punkt über ${forms(home).dat}: ${km(pe)}.${home.atmosphere > 0 ? ' Fallschirm nicht vergessen!' : ''}`,
  };
}

/**
 * Tiefsten Punkt einstellen: in niedriger Bahn zum Wiedereintritt (bzw. Abstieg), auf dem Heimweg
 * als Kurskorrektur. Der Computer sucht das Δv per Intervallhalbierung mit der echten Vorhersage.
 */
export function planDeorbit(f: Flight): Plan {
  const ref = f.refBody();
  const title = ref.atmosphere > 0 ? 'Wiedereintritt' : 'Abstieg zur Landung';
  if (f.status !== 'flying') return fail(title, 'Erst abheben.');
  const el = f.elements(ref);
  const o = f.orbit(ref);
  const rel = f.relative(ref);
  const falling = rel.rx * rel.vx + rel.ry * rel.vy < 0;
  const want = ref.atmosphere > 0 ? reentryAltitude(ref) : 3_000;
  let dt: number;
  let where: string;
  if (el.e >= 1 || (falling && o.apoapsis > 20 * Math.max(want, 10_000))) {
    dt = 45;
    where = 'Kurskorrektur';
  } else {
    dt = timeToApoapsis(el, f.t);
    if (el.e < 0.02 || dt < 20) dt = Math.min(dt < 20 ? dt + period(el) : dt, 90);
    where = 'Bremsen';
  }
  const t = f.t + dt;
  const pe = (dv: number): number => {
    f.setNode(t, dv, 0);
    return arrivalPeriapsis(f.predict(1400, true), ref, 0) ?? Infinity;
  };
  const base = pe(0);
  if (Math.abs(base - want) < 1_000) {
    f.clearNode();
    return fail(title, `Der tiefste Punkt liegt schon bei ${km(base)} – passt!`);
  }
  // Einschachteln: in die richtige Richtung schrittweise weiter, dann halbieren.
  const sign = base > want ? -1 : 1;
  let lo = 0;
  let hi = 0;
  let step = 5;
  let found = false;
  for (let k = 0; k < 16; k++) {
    hi = sign * step;
    if ((pe(hi) - want) * sign >= 0) {
      found = true;
      break;
    }
    lo = hi;
    step *= 2;
  }
  if (!found) {
    f.clearNode();
    return fail(title, 'Dafür reicht kein vernünftiges Manöver.');
  }
  for (let k = 0; k < 30 && Math.abs(hi - lo) > 0.02; k++) {
    const mid = (lo + hi) / 2;
    if ((pe(mid) - want) * sign >= 0) hi = mid;
    else lo = mid;
  }
  const dv = (lo + hi) / 2;
  const reached = pe(dv);
  return {
    ok: true,
    title: `${title}: ${where}`,
    text: `${fmt(Math.abs(dv), Math.abs(dv) < 10 ? 1 : 0)} m/s ${dv >= 0 ? 'in' : 'gegen die'} Flugrichtung in ${clockIn(dt)}. Tiefster Punkt danach ${km(reached)}.${ref.atmosphere > 0 ? ' Dann Fallschirm scharf machen (P) und mit dem Hitzeschild voran eintauchen.' : ' Den Rest erledigt der Lande-Autopilot.'}`,
  };
}
