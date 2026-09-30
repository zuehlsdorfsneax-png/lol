import { LandingPilot } from '../src/rocket/autopilot';
import { Flight } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { EARTH, MOON, MARS } from '../src/rocket/world';
for (const t of TEMPLATES)
  for (const [b, alt] of [
    [MOON, 30000],
    [EARTH, 90000],
    [MARS, 60000],
  ] as const) {
    const f = new Flight([...t.parts]);
    f.placeInOrbit(b, alt, 1);
    if (b === EARTH) {
      f.vx *= 0.97;
      f.vy *= 0.97;
    }
    const p = new LandingPilot();
    let i = 0;
    for (; i < 400000 && f.status === 'flying'; i++) {
      const ph = p.update(f);
      if (ph === 'failed') break;
      f.update(1 / 60);
    }
    const ok = f.status === 'landed';
    console.log(
      ok ? '✓' : '✗',
      t.id.padEnd(12),
      b.name.padEnd(5),
      f.status,
      ok ? f.stats.lastLanding?.speed.toFixed(1) : (p.message || f.crashReason).slice(0, 90),
    );
  }
