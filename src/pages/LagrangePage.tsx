import { Fragment } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import { ROUTH_MU, lagrangePoints } from '../physics';
import type { LView } from '../lagrange/field';
import { lagrangeLevels } from '../lagrange/field';
import { LagrangeCanvas } from '../lagrange/LagrangeCanvas';
import { ParticleSystem, drawDragArrow, drawParticles, type Particle } from '../lagrange/particles';
import { StabilityTable } from '../lagrange/StabilityTable';
import { SYSTEMS, findSystem } from '../lagrange/systems';
import { Callout, PageHead, StatusChip } from '../ui/content';
import { Segmented, Select, Slider, Toggle } from '../ui/controls';
import { duration, fmt, sig } from '../ui/format';
import { Icon } from '../ui/Icon';
import { useAnimationFrame } from '../ui/hooks';

type Focus = 'ganz' | 'klein' | 'l4';

function viewFor(focus: Focus, mu: number): LView {
  if (focus === 'klein') {
    const rh = Math.cbrt(mu / 3);
    return { cx: 1 - mu, cy: 0, half: Math.min(Math.max(4.5 * rh, 0.03), 1.6) };
  }
  if (focus === 'l4') return { cx: 0.5 - mu, cy: Math.sqrt(3) / 2 - 0.1, half: 0.75 };
  return { cx: 0, cy: 0, half: 1.6 };
}

export function LagrangePage({ preset }: { preset: string | null }) {
  const initial = findSystem(preset);
  const [systemId, setSystemId] = useState<string>(initial.id);
  const [customMu, setCustomMu] = useState(0.02);
  const system = systemId === 'eigenes' ? null : findSystem(systemId);
  const mu = system ? system.mu : customMu;
  const [focus, setFocus] = useState<Focus>('ganz');
  const [zoom, setZoom] = useState(1);
  const [heat, setHeat] = useState(true);
  const [showForbidden, setShowForbidden] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [, setTick] = useState(0);
  const psRef = useRef(new ParticleSystem(mu));
  const drag = useRef<{ from: [number, number]; to: [number, number] } | null>(null);

  if (psRef.current.mu !== mu) {
    psRef.current = new ParticleSystem(mu);
  }
  const ps = psRef.current;

  const base = viewFor(focus, mu);
  const view: LView = { ...base, half: base.half / zoom };

  const last: Particle | undefined = ps.particles[ps.particles.length - 1];
  const levels = useMemo(() => lagrangeLevels(mu), [mu]);

  const lastTick = useRef(0);
  useAnimationFrame((dt) => {
    if (running) ps.advance(dt * speed * 2);
    const now = performance.now();
    if (now - lastTick.current > 250) {
      lastTick.current = now;
      setTick((t) => t + 1);
    }
  }, true);

  const addAtPoints = (): void => {
    const d = 0.004 + 0.02 * Math.cbrt(mu);
    for (const p of lagrangePoints(mu)) ps.add(p.x + d * 0.3, p.y + d * 0.3, 0, 0);
  };

  const onPointer = (kind: 'down' | 'move' | 'up', x: number, y: number): void => {
    if (kind === 'down') drag.current = { from: [x, y], to: [x, y] };
    else if (kind === 'move' && drag.current) drag.current.to = [x, y];
    else if (kind === 'up' && drag.current) {
      const { from } = drag.current;
      // Ziehlänge = Geschwindigkeit (in normierten Einheiten).
      ps.add(from[0], from[1], x - from[0], y - from[1]);
      drag.current = null;
    }
  };

  const timeUnit = system?.time ?? null;

  return (
    <div class="stack" style={{ gap: '18px' }}>
      <PageHead eyebrow="Werkzeug" title="Lagrange-Labor">
        Das eingeschränkte Drei-Körper-Problem im mitrotierenden System: Zwei Körper kreisen
        umeinander, ein dritter, masseloser bewegt sich in ihrem Feld. Ziehe mit der Maus, um
        Teilchen mit einer Startgeschwindigkeit abzuschießen.
      </PageHead>

      <div class="sim-layout">
        <div class="sim-main">
          <div class="toolbar">
            <button type="button" class="btn primary" onClick={() => setRunning((r) => !r)}>
              <Icon name={running ? 'pause' : 'play'} filled />
              {running ? 'Pause' : 'Start'}
            </button>
            <button type="button" class="btn" onClick={addAtPoints}>
              Teilchen an L1–L5
            </button>
            <button type="button" class="btn" onClick={() => ps.clear()}>
              Löschen
            </button>
            <span class="spacer" />
            <Segmented
              label="Ausschnitt"
              value={focus}
              options={[
                { value: 'ganz', label: 'Ganzes System' },
                { value: 'klein', label: `Um ${system?.labels[1] ?? 'm₂'}` },
                { value: 'l4', label: 'L4' },
              ]}
              onChange={(f) => {
                setFocus(f);
                setZoom(1);
              }}
            />
          </div>
          <LagrangeCanvas
            mu={mu}
            view={view}
            heat={heat}
            forbiddenC={showForbidden && last ? last.C : null}
            bodyLabels={system?.labels ?? ['m₁', 'm₂']}
            animate
            label="Mitrotierendes System mit effektivem Potential und Teilchen"
            onPointer={onPointer}
            onWheel={(factor) => setZoom((z) => Math.min(Math.max(z / factor, 0.3), 200))}
            overlay={(ctx, toScreen) => {
              drawParticles(ctx, ps.particles, toScreen);
              if (drag.current)
                drawDragArrow(ctx, toScreen(...drag.current.from), toScreen(...drag.current.to));
            }}
          />
          <div class="legend">
            <span class="legend-item">
              <span class="legend-swatch" style={{ background: '#cde2fb' }} />
              Potentialhügel (L4/L5)
            </span>
            <span class="legend-item">
              <span class="legend-swatch" style={{ background: '#0d366b' }} />
              Potentialtal (nahe den Körpern)
            </span>
            <span class="legend-item">
              <span class="legend-key" style={{ background: '#f2c46e' }} />
              Höhenlinien C(L1), C(L2), C(L3)
            </span>
            <span class="legend-item">
              <span class="legend-key" style={{ background: '#ff8a7a' }} />
              Grenze der verbotenen Zone (letztes Teilchen)
            </span>
          </div>

          <section class="panel panel-pad">
            <div class="panel-title">
              <h3>Lagrange-Punkte und ihre Stabilität</h3>
              <StatusChip status={mu < ROUTH_MU ? 'ok' : 'fail'}>
                μ = {sig(mu, 3)} {mu < ROUTH_MU ? '<' : '>'} 0,0385 (Routh-Grenze)
              </StatusChip>
            </div>
            <StabilityTable mu={mu} length={system?.length} secondary={system?.labels[1] ?? 'm₂'} />
            <p class="small muted">
              Rein imaginäre Eigenwerte bedeuten Schwingung um den Punkt (stabil), ein positiver
              Realteil exponentielles Wegdriften (instabil). Einheiten: Abstand der Hauptkörper = 1.
            </p>
          </section>
        </div>

        <aside class="controls">
          <details class="section" open>
            <summary>System</summary>
            <div class="section-body">
              <Select
                id="cr3bp-system"
                label="Hauptkörper"
                value={systemId}
                options={[
                  ...SYSTEMS.map((s) => ({ value: s.id, label: s.name })),
                  { value: 'eigenes', label: 'Eigenes Massenverhältnis' },
                ]}
                onChange={(id) => {
                  setSystemId(id);
                  setZoom(1);
                }}
              />
              {system ? (
                <p class="small muted">{system.note}</p>
              ) : (
                <Slider
                  id="custom-mu"
                  label="Massenverhältnis μ = m₂ / (m₁ + m₂)"
                  value={customMu}
                  min={1e-4}
                  max={0.5}
                  log
                  format={(v) => sig(v, 3)}
                  hint="Oberhalb von 0,0385 werden L4 und L5 instabil."
                  onChange={setCustomMu}
                />
              )}
            </div>
          </details>
          <details class="section" open>
            <summary>Darstellung</summary>
            <div class="section-body">
              <Toggle
                id="heat"
                label="Effektives Potential als Farbe"
                checked={heat}
                onChange={setHeat}
              />
              <Toggle
                id="forbidden"
                label="Verbotene Zone des letzten Teilchens"
                checked={showForbidden}
                onChange={setShowForbidden}
              />
              <Slider
                id="lab-speed"
                label="Tempo"
                value={speed}
                min={0.1}
                max={10}
                log
                format={(v) => `${sig(v, 2)}×`}
                onChange={setSpeed}
              />
              <div class="btn-row">
                <button type="button" class="btn small" onClick={() => setZoom((z) => z * 1.5)}>
                  Hineinzoomen
                </button>
                <button type="button" class="btn small" onClick={() => setZoom((z) => z / 1.5)}>
                  Herauszoomen
                </button>
              </div>
            </div>
          </details>
          <section class="panel panel-pad">
            <h3>Letztes Teilchen</h3>
            {last ? (
              <dl class="kv">
                <dt>Jacobi-Konstante C</dt>
                <dd>{fmt(last.C, 5)}</dd>
                {levels.slice(0, 3).map((l) => (
                  <Fragment key={l.name}>
                    <dt>C({l.name})</dt>
                    <dd>{fmt(l.C, 5)}</dd>
                  </Fragment>
                ))}
                <dt>Status</dt>
                <dd>
                  {last.status === 'active'
                    ? 'unterwegs'
                    : last.status === 'crashed'
                      ? 'eingeschlagen'
                      : 'entkommen'}
                </dd>
                <dt>Flugzeit</dt>
                <dd>
                  {timeUnit ? duration(last.age * timeUnit) : `${fmt(last.age, 1)} Einheiten`}
                </dd>
              </dl>
            ) : (
              <p class="small muted">
                Klicke und ziehe in die Darstellung: Startpunkt und Richtung bestimmen die
                Anfangsgeschwindigkeit.
              </p>
            )}
            <p class="small muted">
              Liegt C über C(L1), ist das Teilchen in seiner Region gefangen – die verbotene Zone
              umschließt sie vollständig. Unter C(L1) öffnet sich ein Tor bei L1.
            </p>
          </section>
          <Callout kind="fakt">
            Die Sonde SOHO beobachtet die Sonne seit 1996 von L1 aus. Weil L1 instabil ist, muss sie
            ihre Bahn regelmäßig mit kleinen Triebwerksstößen korrigieren – wie in der Mission
            „L1-Station“.
          </Callout>
        </aside>
      </div>
    </div>
  );
}
