import { useRef, useState } from 'preact/hooks';
import { YEAR, lagrangePoints } from '../physics';
import { LagrangeCanvas } from '../lagrange/LagrangeCanvas';
import { ParticleSystem, drawDragArrow, drawParticles } from '../lagrange/particles';
import { findSystem } from '../lagrange/systems';
import { Callout, StatusChip } from '../ui/content';
import { fmt } from '../ui/format';
import { Slider } from '../ui/controls';
import { useAnimationFrame } from '../ui/hooks';
import { Icon } from '../ui/Icon';
import type { SpecialMission } from './missions';
import { progressStore, recordStars } from './progress';
import { playFailure, playSuccess } from './sound';
import { StarRules } from './StarRules';
import { Stars } from './Stars';

const SYSTEM = findSystem('sonne-jupiter');
const MU = SYSTEM.mu;
const L4 = lagrangePoints(MU)[3]!;
/** Größter erlaubter Startabstand zu L4 in Jupiter-Abständen; L5 liegt 1,73 entfernt. */
const MAX_START = 0.6;
const ORBITS = 50;
const DURATION = ORBITS * 2 * Math.PI;
/** Zeiteinheiten pro Sekunde: 50 Umläufe in etwa 13 Sekunden. */
const SPEED = 24;

export function TrojanMission({ mission }: { mission: SpecialMission }) {
  const ps = useRef(new ParticleSystem(MU, SYSTEM.radii));
  const drag = useRef<{ from: [number, number]; to: [number, number] } | null>(null);
  const [phase, setPhase] = useState<'place' | 'running' | 'done'>('place');
  const [result, setResult] = useState<{ stars: number; d0: number; reason: string } | null>(null);
  const [best, setBest] = useState(() => progressStore.load().stars[mission.id] ?? 0);
  const track = useRef({ d0: 0, minJupiter: Infinity, minR: Infinity, maxR: 0 });
  const [, setTick] = useState(0);
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState({ dist: 0.1, angle: 0, speed: 0, heading: 0 });

  const finish = (ok: boolean, reason: string): void => {
    const d0 = track.current.d0;
    const stars = ok ? 1 + (d0 >= 0.05 ? 1 : 0) + (d0 >= 0.12 ? 1 : 0) : 0;
    setResult({ stars, d0, reason });
    setPhase('done');
    if (stars > 0) playSuccess(stars);
    else playFailure();
    const p = recordStars(mission.id, stars, `Start ${fmt(d0, 3)} von L4`);
    setBest(p.stars[mission.id] ?? 0);
  };

  useAnimationFrame((dt) => {
    if (phase === 'running') {
      const sys = ps.current;
      const p = sys.particles[0];
      if (!p) return;
      const remaining = DURATION - p.age;
      sys.advance(Math.min(dt * SPEED, remaining), 20_000);
      const [x, y] = p.state;
      const t = track.current;
      const r = Math.hypot(x, y);
      t.minJupiter = Math.min(t.minJupiter, Math.hypot(x - 1 + MU, y));
      t.minR = Math.min(t.minR, r);
      t.maxR = Math.max(t.maxR, r);
      if (p.status !== 'active' || t.minJupiter < 0.15)
        finish(false, 'Der Asteroid ist Jupiter zu nahe gekommen und wurde herausgeschleudert.');
      else if (t.minR < 0.75 || t.maxR > 1.25)
        finish(false, 'Die Bahn ist zu exzentrisch geworden – das ist kein Trojaner mehr.');
      else if (p.age >= DURATION - 1e-9)
        finish(true, 'Der Asteroid hat 50 Jupiterumläufe als Trojaner überstanden.');
    }
    setTick((k) => (k + 1) % 1_000_000);
  }, true);

  const onPointer = (kind: 'down' | 'move' | 'up' | 'cancel', x: number, y: number): void => {
    if (phase !== 'place') return;
    if (kind === 'down') drag.current = { from: [x, y], to: [x, y] };
    else if (kind === 'cancel') drag.current = null;
    else if (kind === 'move' && drag.current) drag.current.to = [x, y];
    else if (kind === 'up' && drag.current) {
      const { from } = drag.current;
      drag.current = null;
      launch(from[0], from[1], (x - from[0]) * 0.5, (y - from[1]) * 0.5);
    }
  };

  const launch = (x: number, y: number, vx: number, vy: number): void => {
    const d0 = Math.hypot(x - L4.x, y - L4.y);
    if (d0 > MAX_START) {
      setNotice('Zu weit von L4 entfernt: Starte näher am Dreieckspunkt vor Jupiter.');
      return;
    }
    setNotice('');
    ps.current = new ParticleSystem(MU, SYSTEM.radii);
    ps.current.add(x, y, vx, vy);
    track.current = { d0, minJupiter: Infinity, minR: Infinity, maxR: 0 };
    setPhase('running');
  };

  const launchManual = (): void => {
    const { dist, angle, speed, heading } = manual;
    const a = (angle * Math.PI) / 180;
    const h = (heading * Math.PI) / 180;
    launch(
      L4.x + dist * Math.cos(a),
      L4.y + dist * Math.sin(a),
      speed * Math.cos(h),
      speed * Math.sin(h),
    );
  };

  const p = ps.current.particles[0];

  return (
    <div class="sim-layout">
      <div class="sim-main">
        <div style={{ position: 'relative' }}>
          <LagrangeCanvas
            mu={MU}
            view={{ cx: 0, cy: 0, half: 1.12 }}
            heat
            bodyLabels={SYSTEM.labels}
            animate
            label="Sonne–Jupiter-System, Trojaner-Mission"
            onPointer={onPointer}
            overlay={(ctx, toScreen, scale) => {
              const [ox, oy] = toScreen(-MU, 0);
              ctx.strokeStyle = 'rgba(245, 247, 255, 0.35)';
              ctx.setLineDash([4, 6]);
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(ox, oy, scale, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              drawParticles(ctx, ps.current.particles, toScreen);
              if (drag.current)
                drawDragArrow(ctx, toScreen(...drag.current.from), toScreen(...drag.current.to));
            }}
          />
          {phase === 'done' && result && (
            <div class="result-card" role="status">
              <div class="row" style={{ justifyContent: 'space-between' }}>
                <Stars count={result.stars} size={26} />
                <StatusChip status={result.stars > 0 ? 'ok' : 'fail'}>
                  {result.stars > 0 ? 'geschafft' : 'nicht geschafft'}
                </StatusChip>
              </div>
              <p>
                {result.reason} Startabstand zu L4: {fmt(result.d0, 3)} Jupiter-Abstände (
                {fmt(result.d0 * 5.2, 2)} AE).
              </p>
              <div class="btn-row">
                <button
                  type="button"
                  class="btn primary"
                  onClick={() => {
                    ps.current = new ParticleSystem(MU, SYSTEM.radii);
                    setPhase('place');
                    setResult(null);
                  }}
                >
                  <Icon name="reset" /> Nochmal
                </button>
                <a class="btn" href="#missionen">
                  Alle Missionen
                </a>
              </div>
            </div>
          )}
        </div>
        {result && result.stars > 0 && (
          <Callout kind="merke" title="Die Physik dahinter">
            {mission.explanation}
          </Callout>
        )}
      </div>
      <aside class="controls">
        <section class="panel panel-pad">
          <h3>Auftrag</h3>
          <p class="small">{mission.goal}</p>
          <StarRules rules={mission.starRules} stars={best} />
        </section>
        <section class="panel panel-pad">
          <h3>Status</h3>
          {phase === 'place' && (
            <p class="small">
              Klicke in die Darstellung (nahe L4) und ziehe, um die Startgeschwindigkeit
              festzulegen. Ein Klick ohne Ziehen startet ohne Eigengeschwindigkeit.
            </p>
          )}
          {notice && (
            <p class="small" role="status">
              {notice}
            </p>
          )}
          {phase === 'place' && (
            <div class="stack">
              <Slider
                id="trojan-dist"
                label="Abstand zu L4"
                value={manual.dist}
                min={0}
                max={MAX_START}
                step={0.01}
                format={(v) => `${fmt(v, 2)} Jupiter-Abstände`}
                onChange={(dist) => setManual({ ...manual, dist })}
              />
              <Slider
                id="trojan-angle"
                label="Richtung des Startorts von L4"
                value={manual.angle}
                min={0}
                max={360}
                step={5}
                format={(v) => `${v}°`}
                onChange={(angle) => setManual({ ...manual, angle })}
              />
              <Slider
                id="trojan-speed"
                label="Startgeschwindigkeit"
                value={manual.speed}
                min={0}
                max={0.3}
                step={0.01}
                format={(v) => fmt(v, 2)}
                onChange={(speed) => setManual({ ...manual, speed })}
              />
              <Slider
                id="trojan-heading"
                label="Richtung der Geschwindigkeit"
                value={manual.heading}
                min={0}
                max={360}
                step={5}
                format={(v) => `${v}°`}
                onChange={(heading) => setManual({ ...manual, heading })}
              />
              <button type="button" class="btn primary" onClick={launchManual}>
                Asteroid starten
              </button>
            </div>
          )}
          {p && (
            <dl class="kv">
              <dt>Umläufe</dt>
              <dd>
                {fmt(p.age / (2 * Math.PI), 1)} / {ORBITS}
              </dd>
              <dt>Zeit</dt>
              <dd>{fmt((p.age * SYSTEM.time) / YEAR)} Jahre</dd>
              <dt>Kleinster Abstand zu Jupiter</dt>
              <dd>
                {Number.isFinite(track.current.minJupiter) ? fmt(track.current.minJupiter, 3) : '–'}
              </dd>
            </dl>
          )}
          <p class="small muted">
            Tipp: Die gestrichelte Linie ist Jupiters Bahnkreis. Wer im rotierenden System auf
            diesem Kreis ruht, hat genau die Kreisbahngeschwindigkeit.
          </p>
        </section>
      </aside>
    </div>
  );
}
