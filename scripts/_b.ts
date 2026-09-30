import { LandingPilot } from '../src/rocket/autopilot';
import { Flight } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { MARS } from '../src/rocket/world';
const parts = [...TEMPLATES.find((t) => t.id === 'pionier')!.parts];
const f = new Flight(parts);
f.placeInOrbit(MARS, 45000, 1);
f.stage();
f.stage();
const s = f.segs;
console.log('segs', s.length, f.deltaV() | 0);
f.vx *= 0.99;
f.vy *= 0.99;
const p = new LandingPilot(true);
let last = '';
for (let i = 0; i < 400000 && f.status === 'flying'; i++) {
  const ph = p.update(f);
  const r = f.relative(MARS);
  if (ph !== last || i % 900 === 0) {
    last = ph;
    console.log(
      f.t | 0,
      ph,
      r.altitude | 0,
      Math.hypot(r.vx, r.vy) | 0,
      f.segs.length,
      f.chute,
      (f.engine().thrust / f.mass).toFixed(1),
      f.deltaV() | 0,
      f.throttle.toFixed(2),
    );
  }
  f.update(1 / 60);
}
console.log(f.status, f.crashReason, p.message);
