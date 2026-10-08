/**
 * Prüflauf für den Missions-Autopiloten: startet auf der Rampe und fliegt jede Mission ganz allein.
 * Aufruf: npx tsx scripts/missions.ts [Filter]
 */
import { Flight } from '../src/rocket/flight';
import { MissionPilot, missionBudget, type MissionSpec } from '../src/rocket/mission';
import { TEMPLATES } from '../src/rocket/parts';
import { makePlan } from '../src/rocket/planner';

const filter = process.argv[2] ?? '';
const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];
let problems = 0;

function fly(name: string, design: string, spec: MissionSpec): void {
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
  console.log(`\n▶ ${name} (${design})`);
  const a = performance.now();
  const f = new Flight(template(design));
  const verbose = process.argv.includes('-v');
  const m = new MissionPilot(spec, f, (fl, id) => {
    const r = makePlan(fl, id);
    if (verbose) console.log(`      Plan ${id}: ${r.ok ? '' : 'FEHLER '}${r.text}`);
    return r;
  });
  console.log(
    `   Schritte: ${m.overview.map((s) => s.label).join(' → ')} · Δv ${Math.round(f.deltaV())} / etwa ${missionBudget(spec)} m/s`,
  );
  let step = -1;
  let frames = 0;
  for (; frames < 4_000_000; frames++) {
    if (m.index !== step) {
      step = m.index;
      console.log(
        `   ${(f.t / 3600).toFixed(1).padStart(7)} h · ${m.stepLabel} · Δv ${Math.round(f.deltaV())} m/s`,
      );
    }
    const st = m.update(f);
    if (st !== 'running') break;
    f.update(1 / 60);
  }
  // Gelandet, wo es hingehen sollte (beim Heimflug auf der Erde)?
  const where0 = spec.home ? 'earth' : spec.target;
  const ok = m.status === 'done' && (!spec.land || f.landedOn?.id === where0);
  if (!ok) problems++;
  const where =
    f.status === 'landed'
      ? `gelandet auf ${f.landedOn?.name} mit ${f.stats.lastLanding?.speed.toFixed(1)} m/s`
      : f.status === 'docked'
        ? 'angedockt'
        : `${f.status}, ${f.refBody().name}: Pe ${(f.orbit().periapsis / 1000).toFixed(0)} km, Ap ${(f.orbit().apoapsis / 1000).toFixed(0)} km`;
  console.log(
    `   ${ok ? '✓' : '✗'} ${m.status}${m.message ? ` – ${m.message}` : ''} · ${where} · ${(f.t / 86400).toFixed(1)} Tage · Δv übrig ${Math.round(f.deltaV())} m/s · ${frames} Bilder, ${((performance.now() - a) / 1000).toFixed(1)} s`,
  );
}

fly('Umlaufbahn', 'orbiter', { target: 'orbit', land: false, home: false });
fly('Station andocken', 'faehre', { target: 'station', land: false, home: false });
fly('Mondbahn', 'luna', { target: 'moon', land: false, home: false });
fly('Mondlandung mit Rückkehr', 'selene', { target: 'moon', land: true, home: true });
fly('Mond umrunden und zurück', 'luna', { target: 'moon', land: false, home: true });
fly('Mondlandung mit Rückkehr (Mond-Riese)', 'saturn', { target: 'moon', land: true, home: true });
fly('Marslandung (Ares)', 'ares', { target: 'mars', land: true, home: false });
fly('Marslandung (Aurora)', 'aurora', { target: 'mars', land: true, home: false });
fly('Venuslandung', 'aurora', { target: 'venus', land: true, home: false });
fly('Jupiterbahn', 'jupiter', { target: 'jupiter', land: false, home: false });
fly('Merkurlandung', 'jupiter', { target: 'mercury', land: true, home: false });
fly('Phobos', 'spatzsonde', { target: 'phobos', land: true, home: false });
fly('Europa', 'jupiter', { target: 'europa', land: true, home: false });
fly('Ganymed', 'jupiter', { target: 'ganymede', land: true, home: false });
fly('Ceres', 'jupiter', { target: 'ceres', land: true, home: false });
fly('Odyssee: Ganymed', 'odyssee', { target: 'ganymede', land: true, home: false });
fly('Odyssee: Mond und zurück', 'odyssee', { target: 'moon', land: true, home: true });
fly('Odyssee: Marslandung', 'odyssee', { target: 'mars', land: true, home: false });
fly('Odyssee: Merkurlandung', 'odyssee', { target: 'mercury', land: true, home: false });
fly('Odyssee: Ceres', 'odyssee', { target: 'ceres', land: true, home: false });
fly('Odyssee: Mars und zurück', 'odyssee', { target: 'mars', land: false, home: true });
fly('Odyssee: Marslandung und zurück', 'odyssee', { target: 'mars', land: true, home: true });
fly('Pionier: Marslandung und zurück', 'pionier', { target: 'mars', land: true, home: true });
fly('Pionier: Mond und zurück', 'pionier', { target: 'moon', land: true, home: true });
fly('Kurier: Station', 'kurier', { target: 'station', land: false, home: false });
fly('Odyssee: Europa', 'odyssee', { target: 'europa', land: true, home: false });

fly('Zwerg: Umlaufbahn', 'zwerg', { target: 'orbit', land: false, home: false });
fly('Sternwarte: Umlaufbahn', 'sternwarte', { target: 'orbit', land: false, home: false });
fly('Phönix: Marslandung', 'phoenix', { target: 'mars', land: true, home: false });
fly('Dämmerung: Ceres', 'daemmerung', { target: 'ceres', land: true, home: false });
fly('Nachtfalke: Mond und zurück', 'nachtfalke', { target: 'moon', land: true, home: true });
fly('Koloss: Marslandung und zurück', 'koloss', { target: 'mars', land: true, home: true });

console.log(`\n${problems ? `✗ ${problems} Missionen gescheitert` : '✓ alle Missionen erfüllt'}`);
