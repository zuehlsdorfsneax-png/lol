/**
 * Leistungsmessung für Bordcomputer und Autopilot: Planungszeiten, Vorhersage und Rechenzeit pro
 * Bild während automatisch geflogener Manöver (wie im Spiel: 60 Bilder/s, Vorhersage alle 0,15 s).
 * Aufruf: npx tsx scripts/bench-autopilot.ts
 */
import { NodeExecutor, OrbitPilot } from '../src/rocket/autopilot';
import { Flight } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { makePlan, type PlanId } from '../src/rocket/planner';
import { GAME_EARTH, GAME_MOON } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];
const now = (): number => performance.now();

interface FrameStats {
  frames: number;
  mean: number;
  p95: number;
  max: number;
  over16: number;
  simSeconds: number;
}

function stats(times: number[], sim: number): FrameStats {
  const s = [...times].sort((a, b) => a - b);
  return {
    frames: s.length,
    mean: s.reduce((a, b) => a + b, 0) / Math.max(1, s.length),
    p95: s[Math.floor(s.length * 0.95)] ?? 0,
    max: s[s.length - 1] ?? 0,
    over16: s.filter((x) => x > 16).length,
    simSeconds: sim,
  };
}

/** Bilder wie im Spiel, bis `until` gilt: Autopilot, Physik, alle 0,15 s eine Vorhersage. */
function frames(
  f: Flight,
  step: () => boolean,
  maxFrames = 200_000,
): { stats: FrameStats; predMs: number[] } {
  const times: number[] = [];
  const predMs: number[] = [];
  let predTimer = 0;
  const t0 = f.t;
  for (let i = 0; i < maxFrames; i++) {
    const a = now();
    const done = step();
    f.update(1 / 60);
    // HUD-Abfragen, die jedes Bild passieren
    f.maxWarpIndex();
    f.nodeBurnStart();
    predTimer += 1 / 60;
    if (predTimer > 0.15) {
      predTimer = 0;
      const p = now();
      if (f.status === 'flying') f.predict();
      predMs.push(now() - p);
    }
    times.push(now() - a);
    if (done || f.status === 'crashed') break;
  }
  return { stats: stats(times, f.t - t0), predMs };
}

function plan(f: Flight, id: PlanId): number {
  const a = now();
  const r = makePlan(f, id);
  const ms = now() - a;
  console.log(`  Plan ${id}: ${ms.toFixed(0)} ms – ${r.ok ? 'ok' : 'FEHLER'}: ${r.text}`);
  return ms;
}

function execute(f: Flight, label: string): string {
  const x = new NodeExecutor();
  const r = frames(f, () => {
    const p = x.update(f);
    return p === 'done' || p === 'failed';
  });
  f.throttle = 0;
  report(label, r);
  return x.phase;
}

function report(label: string, r: { stats: FrameStats; predMs: number[] }): void {
  const s = r.stats;
  const pm = r.predMs.length ? Math.max(...r.predMs) : 0;
  const pa = r.predMs.length ? r.predMs.reduce((a, b) => a + b, 0) / r.predMs.length : 0;
  console.log(
    `  ${label}: ${s.frames} Bilder (${(s.frames / 60).toFixed(1)} s echt, ${(s.simSeconds / 3600).toFixed(2)} h Spielzeit) · ` +
      `Bild Ø ${s.mean.toFixed(2)} ms, p95 ${s.p95.toFixed(1)}, max ${s.max.toFixed(1)}, >16 ms: ${s.over16} · ` +
      `Vorhersage Ø ${pa.toFixed(1)} ms, max ${pm.toFixed(1)}`,
  );
}

console.log('Mondmission (Luna, Bordcomputer):');
{
  const f = new Flight(template('luna'));
  const pilot = new OrbitPilot(GAME_EARTH);
  report(
    'Aufstieg',
    frames(f, () => pilot.update(f) === 'done'),
  );
  f.target = 'moon';
  plan(f, 'transfer');
  console.log('  Ergebnis:', execute(f, 'Transfer ausführen'));
  const p0 = now();
  const p = f.predict();
  console.log(
    `  predict: ${(now() - p0).toFixed(1)} ms, Begegnung: ${p.encounter?.body.name ?? '–'}`,
  );
  plan(f, 'correct');
  if (f.node) console.log('  Ergebnis:', execute(f, 'Korrektur ausführen'));
  // Bis zum Mond vorspulen wie mit dem Zeitsprung
  const enc = f.predict().encounter;
  if (enc) f.warpTo(f.predict().ts[enc.enter]!);
  report(
    'Zeitsprung zum Mond',
    frames(f, () => f.warpTarget === null && f.refBody() === GAME_MOON, 40_000),
  );
  console.log('  Bezugskörper:', f.refBody().name);
  plan(f, 'circ-pe');
  if (f.node) console.log('  Ergebnis:', execute(f, 'Einschwenken ausführen'));
  const o = f.orbit(GAME_MOON);
  console.log(
    `  Mondbahn: ${o.bound ? 'gebunden' : 'frei'}, Pe ${(o.periapsis / 1000).toFixed(0)} km, Ap ${(o.apoapsis / 1000).toFixed(0)} km`,
  );
}

console.log('\nMarsmission (Aurora):');
{
  const f = new Flight(template('aurora'));
  f.placeInOrbit(GAME_EARTH, 150_000, 1);
  f.target = 'mars';
  plan(f, 'transfer');
}
