import { LandingPilot } from '../src/rocket/autopilot';
import { Flight } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { EARTH } from '../src/rocket/world';
const f = new Flight([...TEMPLATES.find((t) => t.id === process.argv[2])!.parts]);
f.placeInOrbit(EARTH, 90000, 1); f.vx *= 0.97; f.vy *= 0.97;
const p = new LandingPilot(); let last = '';
for (let i = 0; i < 400000 && f.status === 'flying'; i++) { const ph = p.update(f); const r = f.relative(EARTH);
  const s = ph; if (s !== last || i % 1200 === 0) { last = s; console.log((f.t|0), ph, r.altitude|0, Math.hypot(r.vx,r.vy)|0, f.segs.length, f.chute, (f.engine().thrust/f.mass).toFixed(1), f.deltaV()|0, f.throttle.toFixed(2)); }
  f.update(1/60); }
console.log(f.status, f.crashReason);
