import { lagrangePoints, linearStability } from '../physics';
import { StatusChip } from '../ui/content';
import { distance, fmt, sig } from '../ui/format';
import { twoOmega } from './field';

/** Tabelle der Lagrange-Punkte mit linearer Stabilitätsanalyse. */
export function StabilityTable({
  mu,
  length,
  secondary,
}: {
  mu: number;
  length?: number;
  secondary: string;
}) {
  const rows = lagrangePoints(mu).map((p) => ({
    p,
    s: linearStability(mu, p),
    C: twoOmega(mu, p.x, p.y),
  }));
  return (
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>Punkt</th>
            <th class="num">x</th>
            <th class="num">y</th>
            {length && <th class="num">Abstand zu {secondary}</th>}
            <th class="num">C = 2Ω</th>
            <th class="num">Eigenwerte λ</th>
            <th>Linear</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, s, C }) => {
            const real = s.eigenvalues.filter((l) => Math.abs(l.im) < 1e-12 && l.re > 1e-12);
            const lambda = s.stable
              ? `±${sig(Math.abs(s.eigenvalues[0]!.im), 3)}i, ±${sig(Math.abs(s.eigenvalues[2]!.im), 3)}i`
              : real.length > 0
                ? `±${sig(real[0]!.re, 3)} (reell)`
                : `${sig(s.growthRate, 3)} ± ${sig(Math.abs(s.eigenvalues[0]!.im), 3)}i`;
            return (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td class="num">{fmt(p.x, 5)}</td>
                <td class="num">{fmt(p.y, 5)}</td>
                {length && (
                  <td class="num">{distance(Math.hypot(p.x - (1 - mu), p.y) * length)}</td>
                )}
                <td class="num">{fmt(C, 6)}</td>
                <td class="num">{lambda}</td>
                <td>
                  <StatusChip status={s.stable ? 'ok' : 'fail'}>
                    {s.stable ? 'stabil' : 'instabil'}
                  </StatusChip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
