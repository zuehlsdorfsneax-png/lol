/**
 * Prüflauf für Bordcomputer und Autopiloten: fliegt ganze Missionen so, wie ein Spieler es mit
 * den Knöpfen täte (planen → ausführen → Zeitsprung → …), und meldet, wo es hakt.
 * Aufruf: npx tsx scripts/scenarios.ts [Filter]
 */
import { LandingPilot, NodeExecutor, OrbitPilot } from '../src/rocket/autopilot';
import { Flight, type TargetId } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import {
  arrivalPeriapsis,
  makePlan,
  planOptions,
  type Plan,
  type PlanId,
} from '../src/rocket/planner';
import { GAME_EARTH, bodyById, type Body } from '../src/rocket/world';

const filter = process.argv[2] ?? '';
const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];
const km = (m: number): string => (Number.isFinite(m) ? `${(m / 1000).toFixed(1)} km` : '∞');
const DT = 1 / 60;
let problems = 0;

function log(...a: unknown[]): void {
  console.log('   ', ...a);
}
function bad(msg: string): void {
  problems++;
  console.log('    ✗', msg);
}

/** Bilder wie im Spiel, bis `step` true liefert. */
function loop(f: Flight, step: () => boolean, max = 600_000): number {
  for (let i = 0; i < max; i++) {
    if (step()) return i;
    f.update(DT);
    if (f.status === 'crashed') return i;
  }
  return max;
}

function orbitText(f: Flight, b: Body = f.refBody()): string {
  const o = f.orbit(b);
  return `${b.name}: ${o.bound ? 'Bahn' : 'frei'} Pe ${km(o.periapsis)} Ap ${km(o.apoapsis)}, Δv ${f.deltaV().toFixed(0)} m/s`;
}

function plan(f: Flight, id: PlanId): Plan {
  const a = performance.now();
  const r = makePlan(f, id);
  log(
    `Plan ${id} (${(performance.now() - a).toFixed(0)} ms): ${r.ok ? '' : 'FEHLER '}${r.title} – ${r.text}`,
  );
  return r;
}

function execute(f: Flight): boolean {
  if (!f.node) return false;
  const want = Math.hypot(f.node.prograde, f.node.radial);
  const x = new NodeExecutor();
  const t0 = f.t;
  const frames = loop(f, () => {
    const p = x.update(f);
    return p === 'done' || p === 'failed';
  });
  f.throttle = 0;
  f.sas = 'off';
  const ok = x.phase === 'done';
  log(
    `Ausführen (${want.toFixed(1)} m/s): ${x.phase} nach ${frames} Bildern / ${((f.t - t0) / 60).toFixed(0)} min${x.message ? ` – ${x.message}` : ''} → ${orbitText(f)}`,
  );
  if (!ok) bad(`Ausführen fehlgeschlagen: ${x.message}`);
  return ok;
}

function warpTo(f: Flight, t: number): void {
  if (!f.warpTo(t)) return;
  const frames = loop(f, () => f.warpTarget === null, 400_000);
  log(`Zeitsprung: ${frames} Bilder, jetzt ${orbitText(f)}`);
}

function ascent(f: Flight, body: Body = GAME_EARTH): boolean {
  const pilot = new OrbitPilot(body);
  const frames = loop(f, () => {
    const p = pilot.update(f);
    return p === 'done' || p === 'failed';
  });
  log(`Aufstieg: ${pilot.phase} (${frames} Bilder) → ${orbitText(f, body)}`);
  if (pilot.phase !== 'done' || f.status === 'crashed') {
    bad(`Aufstieg: ${pilot.message || f.status}`);
    return false;
  }
  return true;
}

function land(f: Flight): boolean {
  const pilot = new LandingPilot();
  const body = f.refBody();
  let maxSpeed = 0;
  const frames = loop(f, () => {
    const p = pilot.update(f);
    const r = f.relative(body);
    maxSpeed = Math.max(maxSpeed, Math.hypot(r.vx, r.vy));
    return p === 'done' || p === 'failed';
  });
  const ok = f.status === 'landed';
  log(
    `Landung auf ${body.name}: ${pilot.phase}, Status ${f.status} (${frames} Bilder)${pilot.message ? ` – ${pilot.message}` : ''}, Δv übrig ${f.deltaV().toFixed(0)} m/s, Hitze max ${(f.maxHeat * 100).toFixed(0)} %`,
  );
  if (!ok) bad(`Landung auf ${body.name}: ${f.status} ${pilot.message}`);
  return ok;
}

/** Mit größtem erlaubtem Zeitraffer weiter, bis `cond` gilt (wie Taste . gedrückt halten). */
function warpUntil(f: Flight, cond: () => boolean, max = 400_000): number {
  const frames = loop(
    f,
    () => {
      if (cond()) return true;
      if (f.warpIndex < f.maxWarpIndex()) f.setWarp(f.maxWarpIndex());
      return false;
    },
    max,
  );
  f.setWarp(0);
  return frames;
}

/** Bis zur Hill-Sphäre des Ziels vorspulen (wie „Zeitsprung zur Begegnung“). */
function warpToEncounter(f: Flight, target: Body): boolean {
  for (let k = 0; k < 4; k++) {
    if (f.refBody() === target) return true;
    const p = f.predict();
    const enc = p.encounter;
    if (!enc || enc.body !== target) {
      log(`Keine Begegnung mit ${target.name} in der Vorhersage (Ref ${p.ref.name}).`);
      return false;
    }
    warpTo(f, p.ts[enc.enter]! + 1);
    loop(f, () => f.refBody() === target, 20_000);
  }
  return f.refBody() === target;
}

/** Kurskorrektur, solange der Computer eine anbietet. */
function correct(f: Flight): void {
  for (let k = 0; k < 2; k++) {
    if (!planOptions(f, f.predict()).some((o) => o.id === 'correct')) return;
    const r = plan(f, 'correct');
    if (!r.ok || !f.node) return;
    execute(f);
  }
}

function capture(f: Flight, target: Body): boolean {
  if (!warpToEncounter(f, target)) {
    bad(`${target.name} nicht erreicht`);
    return false;
  }
  correct(f);
  // Bietet der Bordcomputer das Einschwenken überhaupt an (wie im Spiel)?
  if (!planOptions(f, f.predict()).some((o) => o.id === 'circ-pe'))
    bad(`Einschwenken bei ${target.name} wird nicht angeboten (${orbitText(f, target)})`);
  const r = plan(f, 'circ-pe');
  if (!r.ok) {
    bad(`Einschwenken bei ${target.name}: ${r.text}`);
    return false;
  }
  execute(f);
  const o = f.orbit(target);
  const ok = o.bound && o.periapsis > Math.max(0, target.atmosphere);
  if (!ok) bad(`Keine stabile Bahn um ${target.name}: ${orbitText(f, target)}`);
  return ok;
}

function scenario(name: string, run: () => void): void {
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
  console.log(`\n▶ ${name}`);
  const a = performance.now();
  try {
    run();
  } catch (e) {
    bad(`Ausnahme: ${(e as Error).stack}`);
  }
  console.log(`  (${((performance.now() - a) / 1000).toFixed(1)} s)`);
}

function inOrbit(design: string, body: Body, alt: number, angle: number, target?: TargetId) {
  const f = new Flight(template(design));
  f.placeInOrbit(body, alt, angle);
  if (target) f.target = target;
  return f;
}

// ------------------------------------------------------------------ Szenarien

for (const id of ['orbiter', 'faehre', 'luna', 'selene', 'saturn', 'ares', 'aurora', 'jupiter']) {
  scenario(`Aufstieg ${id}`, () => {
    ascent(new Flight(template(id)));
  });
}

scenario('Mond: Transfer von verschiedenen Bahnen', () => {
  for (const alt of [90_000, 200_000, 600_000]) {
    for (const angle of [0, 1.3, 2.6, 3.9, 5.2]) {
      const f = inOrbit('saturn', GAME_EARTH, alt, angle, 'moon');
      const r = makePlan(f, 'transfer');
      const p = f.predict();
      const enc = p.encounter?.body.id ?? '–';
      const txt = `${km(alt)} / ${angle.toFixed(1)}: ${r.ok ? 'ok' : 'FEHLER'} ${r.text} (Begegnung ${enc})`;
      if (!r.ok || enc !== 'moon') bad(txt);
      else log(txt);
    }
  }
});

scenario('Mond: ganze Mission mit Landung und Rückflug (Selene)', () => {
  const f = new Flight(template('selene'));
  if (!ascent(f)) return;
  f.target = 'moon';
  if (!plan(f, 'transfer').ok) return bad('Transfer');
  execute(f);
  correct(f);
  const moon = bodyById('moon');
  if (!capture(f, moon)) return;
  if (!plan(f, 'deorbit').ok) return bad('Abstieg');
  execute(f);
  if (!land(f)) return;
  // Wieder hoch und heim
  f.target = 'earth';
  if (!ascent(f, moon)) return;
  if (!plan(f, 'return').ok) return bad('Rückflug');
  execute(f);
  log(
    `Nach dem Brennen: Vorhersage Pe Erde ${km(arrivalPeriapsis(f.predict(), GAME_EARTH, 0) ?? NaN)}`,
  );
  correct(f);
  log(
    `Nach Korrektur: Vorhersage Pe Erde ${km(arrivalPeriapsis(f.predict(), GAME_EARTH, 0) ?? NaN)}`,
  );
  const n = warpUntil(f, () => f.refBody() === GAME_EARTH);
  log(
    `Zurück (${n} Bilder): ${orbitText(f, GAME_EARTH)}, Vorhersage ${km(arrivalPeriapsis(f.predict(), GAME_EARTH, 0) ?? NaN)}`,
  );
  if (planOptions(f, f.predict()).some((o) => o.id === 'deorbit')) {
    const r = plan(f, 'deorbit');
    if (r.ok) execute(f);
  }
  land(f);
});

scenario('Mond: Rückflug aus verschiedenen Mondbahnen', () => {
  const moon = bodyById('moon');
  for (const alt of [20_000, 100_000, 400_000]) {
    for (const angle of [0, 2, 4]) {
      const f = new Flight(template('orbiter'));
      f.t = 3600 * 24 * angle;
      f.placeInOrbit(moon, alt, angle);
      f.target = 'earth';
      const r = makePlan(f, 'return');
      const p = f.predict();
      const pe = arrivalPeriapsis(p, GAME_EARTH, Math.max(0, p.nodeIndex)) ?? NaN;
      const txt = `${km(alt)} / ${angle}: ${r.ok ? 'ok' : 'FEHLER'} ${r.text} (Pe Erde laut Vorhersage ${km(pe)})`;
      if (!r.ok || !(pe > 0 && pe < 80_000)) bad(txt);
      else log(txt);
    }
  }
});

scenario('Erde: Wiedereintritt und Landung (Orbiter)', () => {
  for (const alt of [80_000, 150_000, 400_000]) {
    const f = inOrbit('orbiter', GAME_EARTH, alt, 1);
    // Nur die Kapsel mit Hitzeschild und Fallschirm (wie nach dem Abwerfen der Stufen)
    log(`Höhe ${km(alt)}`);
    const r = plan(f, 'deorbit');
    if (!r.ok) {
      bad(r.text);
      continue;
    }
    execute(f);
    land(f);
  }
});

scenario('Kreisbahn am Ap/Pe', () => {
  for (const [pe, ap] of [
    [80_000, 400_000],
    [150_000, 2_000_000],
    [300_000, 30_000_000],
  ] as const) {
    for (const where of ['circ-ap', 'circ-pe'] as const) {
      const f = new Flight(template('saturn'));
      // Elliptische Bahn: am Pe mit passender Geschwindigkeit starten.
      f.placeInOrbit(GAME_EARTH, pe, 0.5);
      const r1 = GAME_EARTH.radius + pe;
      const r2 = GAME_EARTH.radius + ap;
      const v = Math.sqrt(GAME_EARTH.mu * (2 / r1 - 2 / (r1 + r2)));
      const vc = Math.sqrt(GAME_EARTH.mu / r1);
      f.vx *= v / vc;
      f.vy *= v / vc;
      const r = plan(f, where);
      if (!r.ok) {
        bad(r.text);
        continue;
      }
      execute(f);
      const o = f.orbit(GAME_EARTH);
      const e = o.eccentricity;
      const txt = `${where} ${km(pe)}–${km(ap)}: e danach ${e.toFixed(4)}, ${orbitText(f, GAME_EARTH)}`;
      // Weit draußen zerrt der Mond an jeder Bahn – dort ist „rund“ nur ungefähr möglich.
      if (e > (ap > 10_000_000 ? 0.05 : 0.01)) bad(txt);
      else log(txt);
    }
  }
});

scenario('Station: Rendezvous und Angleichen (Fähre)', () => {
  for (const [alt, angle] of [
    [120_000, 0],
    [150_000, 2],
    [250_000, 4],
    [600_000, 1],
  ] as const) {
    const f = inOrbit('faehre', GAME_EARTH, alt, angle, 'station');
    log(`Start ${km(alt)} / ${angle}`);
    if (!plan(f, 'transfer').ok) continue;
    execute(f);
    let r = plan(f, 'match');
    // „Angleichen“ schlägt erst eine Kurskorrektur vor, wenn es sonst knapp danebenginge.
    for (let k = 0; k < 3 && r.ok && r.title.startsWith('Kurs'); k++) {
      execute(f);
      r = plan(f, 'match');
    }
    if (!r.ok) {
      bad(r.text);
      continue;
    }
    execute(f);
    const ti = f.targetInfo();
    const txt = `Station: Abstand ${km(ti?.distance ?? NaN)}, Relativtempo ${ti?.speed.toFixed(1)} m/s`;
    if (!ti || ti.distance > 5_000 || ti.speed > 10) bad(txt);
    else log(txt);
  }
});

scenario('Mars: Fenster, Transfer, Einschwenken, Landung (Ares)', () => {
  const f = inOrbit('ares', GAME_EARTH, 200_000, 1, 'mars');
  f.infiniteFuel = false;
  let r = plan(f, 'transfer');
  if (!r.ok && r.wait) {
    warpTo(f, f.t + r.wait - f.orbit().period); // wie der Knopf im Bordcomputer
    r = plan(f, 'transfer');
  }
  if (!r.ok) return bad(r.text);
  execute(f);
  // Aus der Erd-Hill-Sphäre heraus
  warpUntil(f, () => f.refBody() !== GAME_EARTH);
  log(`Unterwegs: ${orbitText(f)}`);
  correct(f);
  const mars = bodyById('mars');
  if (!capture(f, mars)) return;
  const d = plan(f, 'deorbit');
  if (d.ok) execute(f);
  land(f);
});

scenario('Venus und Jupiter: Transfer planen', () => {
  for (const [design, target] of [
    ['aurora', 'venus'],
    ['jupiter', 'jupiter'],
    ['aurora', 'mercury'],
  ] as const) {
    const f = inOrbit(design, GAME_EARTH, 200_000, 1, target);
    let r = plan(f, 'transfer');
    if (!r.ok && r.wait) {
      warpTo(f, f.t + r.wait - f.orbit().period); // wie der Knopf im Bordcomputer
      r = plan(f, 'transfer');
    }
    const p = f.predict();
    const txt = `${target}: ${r.ok ? 'ok' : 'FEHLER'} (Begegnung ${p.encounter?.body.id ?? '–'})`;
    if (!r.ok || p.encounter?.body.id !== target) bad(txt);
    else log(txt);
  }
});

console.log(`\n${problems ? `✗ ${problems} Probleme` : '✓ alles gut'}`);
