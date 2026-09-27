import { G } from './constants';
import { criticalMoonDistance } from './criteria';
import { jacobiCheck } from './cr3bp';
import { orbitalElements } from './orbit';
import { buildScenario, type ScenarioParams } from './scenario';

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'na';

export interface StabilityCheck {
  id: 'crash' | 'roche' | 'escape' | 'hill' | 'jacobi';
  title: string;
  status: CheckStatus;
  detail: string;
}

export interface Assessment {
  verdict: 'stable' | 'marginal' | 'unstable';
  checks: StabilityCheck[];
}

const fmtKm = (m: number): string =>
  `${Math.round(m / 1000).toLocaleString('de-DE')} km`;

/**
 * Prognose aus den Startwerten – vor jeder Simulation. Verbindet die Kriterien aus Kapitel 5
 * und 6 zu einer Checkliste, die der Simulator anschließend überprüfen kann.
 */
export function assessStability(params: ScenarioParams): Assessment {
  const { bodies, indices, info } = buildScenario({ ...params, intruder: null, particles: null });
  const earth = bodies[indices.earth]!;
  const moon = bodies[indices.moon]!;
  const mu = G * (earth.mass + moon.mass);
  const el = orbitalElements(mu, moon.x - earth.x, moon.y - earth.y, moon.vx - earth.vx, moon.vy - earth.vy);
  const checks: StabilityCheck[] = [];
  const crashDistance = info.earthRadius + info.moonRadius;

  checks.push({
    id: 'crash',
    title: 'Kein Absturz',
    status: el.periapsis < crashDistance ? 'fail' : 'ok',
    detail: `Erdnächster Punkt ${fmtKm(el.periapsis)} – Berührung ab ${fmtKm(crashDistance)}.`,
  });

  checks.push({
    id: 'roche',
    title: 'Außerhalb der Roche-Grenze',
    status:
      el.periapsis < info.rocheFluid ? 'fail' : el.periapsis < 1.5 * info.rocheFluid ? 'warn' : 'ok',
    detail: `Roche-Grenze ${fmtKm(info.rocheFluid)} (flüssig) bzw. ${fmtKm(info.rocheRigid)} (starr).`,
  });

  checks.push({
    id: 'escape',
    title: 'Unter der Fluchtgeschwindigkeit',
    status: el.bound ? 'ok' : 'fail',
    detail: el.bound
      ? `Gebunden: v/v_Flucht = ${(el.v / Math.sqrt((2 * mu) / el.r)).toFixed(2)}.`
      : 'Die Bewegungsenergie reicht, um der Erde zu entkommen.',
  });

  if (indices.sun < 0) {
    checks.push({ id: 'hill', title: 'Innerhalb der Hill-Sphäre', status: 'na', detail: 'Ohne Sonne gibt es keine Hill-Grenze.' });
    checks.push({ id: 'jacobi', title: 'Jacobi-Kriterium', status: 'na', detail: 'Nur mit Sonne definiert.' });
  } else {
    const retrograde = el.h < 0;
    const ecc = Math.min(el.e, 0.99);
    const crit = criticalMoonDistance(retrograde, params.earthEccentricity, ecc) * info.hillRadius;
    const a = el.bound ? el.a : Infinity;
    checks.push({
      id: 'hill',
      title: 'Innerhalb der Stabilitätsgrenze',
      status: a > crit ? 'fail' : a > 0.85 * crit ? 'warn' : 'ok',
      detail: `Halbachse ${Number.isFinite(a) ? (a / info.hillRadius).toFixed(2) : '∞'} r_H – Grenze ${(crit / info.hillRadius).toFixed(2)} r_H (${retrograde ? 'retrograd' : 'prograd'}, Domingos et al. 2006).`,
    });
    const sun = bodies[indices.sun]!;
    const j = jacobiCheck(G * (sun.mass + earth.mass), earth.mass / (sun.mass + earth.mass), sun, earth, moon);
    checks.push({
      id: 'jacobi',
      title: 'Jacobi-Kriterium (Hill-Stabilität)',
      status: j.trapped ? 'ok' : 'warn',
      detail: j.trapped
        ? `C = ${j.C.toFixed(6)} > C(L1) = ${j.CL1.toFixed(6)}: Der Mond kann die Hill-Sphäre nie verlassen.`
        : `C = ${j.C.toFixed(6)} ≤ C(L1) = ${j.CL1.toFixed(6)}: Das Tor bei L1 ist offen – Flucht möglich, aber nicht zwingend.`,
    });
  }

  const verdict = checks.some((c) => c.status === 'fail')
    ? 'unstable'
    : checks.some((c) => c.status === 'warn')
      ? 'marginal'
      : 'stable';
  return { verdict, checks };
}
