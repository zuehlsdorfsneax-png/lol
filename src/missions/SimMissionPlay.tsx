import { useMemo, useRef, useState } from 'preact/hooks';
import { G, YEAR } from '../physics';
import { SpaceCanvas } from '../sim/SpaceCanvas';
import type { Simulation } from '../sim/Simulation';
import { DEFAULT_VIEW, type Camera } from '../sim/view';
import { Callout, StatusChip } from '../ui/content';
import { Slider } from '../ui/controls';
import { duration, fmt } from '../ui/format';
import { Icon } from '../ui/Icon';
import type { RunResult, SimMission } from './missions';
import { progressStore, recordStars } from './progress';
import { createMissionSim, evaluateMission, missionResult } from './run';
import { playFailure, playSuccess } from './sound';
import { StarRules } from './StarRules';
import { Stars } from './Stars';

const OUTCOME_TEXT: Record<RunResult['outcome'], string> = {
  stable: 'Der Mond ist in seiner Bahn geblieben.',
  crash: 'Der Mond ist auf die Erde gestürzt.',
  escape: 'Der Mond ist entkommen.',
  sun: 'Der Mond ist in die Sonne gestürzt.',
  collision: 'Es kam zu einem Zusammenstoß.',
};

/** Dauer eines Missionslaufs in echten Sekunden. */
const PLAY_SECONDS = 7;

export function SimMissionPlay({ mission }: { mission: SimMission }) {
  const [value, setValue] = useState(mission.control.initial);
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup');
  const [result, setResult] = useState<{ r: RunResult; stars: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [best, setBest] = useState(() => progressStore.load().stars[mission.id] ?? 0);
  const simRef = useRef<Simulation | null>(createMissionSim(mission, value));
  const [camKey, setCamKey] = useState(0);
  const [, setTick] = useState(0);

  const view = useMemo(
    () => ({ ...DEFAULT_VIEW, frame: mission.view.frame, trailSpan: 0 }),
    [mission],
  );

  const reset = (v: number): void => {
    simRef.current = createMissionSim(mission, v);
    setPhase('setup');
    setResult(null);
  };

  const finish = (r: RunResult): void => {
    const stars = mission.score(r, value);
    setResult({ r, stars });
    setPhase('done');
    if (stars > 0) playSuccess(stars);
    else playFailure();
    const p = recordStars(mission.id, stars, mission.control.format(value));
    setBest(p.stars[mission.id] ?? 0);
  };

  const onFrame = (dt: number): void => {
    const sim = simRef.current;
    if (!sim || phase !== 'running') return;
    const target = (mission.years * YEAR * dt) / PLAY_SECONDS;
    const t0 = performance.now();
    const start = sim.time;
    while (sim.time - start < target && performance.now() - t0 < 14) {
      if (sim.pending?.kind === 'roche') sim.acknowledge();
      sim.advance(Math.min(target - (sim.time - start), mission.years * YEAR - sim.time), 400);
      const r = missionResult(mission, sim);
      if (r) {
        finish(r);
        return;
      }
    }
    setTick((t) => t + 1);
  };

  // Vorschau der Zwei-Körper-Ellipse (nur im erdfesten System sinnvoll).
  const onDraw = (ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number): void => {
    const sim = simRef.current;
    if (!sim || phase !== 'setup' || mission.view.frame !== 'earth') return;
    const el = sim.moonElements();
    if (!el || !el.bound) return;
    const { earth, moon } = sim.indices;
    const mu = G * (sim.sys.mass[earth]! + sim.sys.mass[moon]!);
    const p = (el.h * el.h) / mu;
    ctx.strokeStyle = 'rgba(223, 229, 245, 0.55)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k <= 240; k++) {
      const th = (k / 240) * Math.PI * 2;
      const r = p / (1 + el.e * Math.cos(th - el.omega));
      const x = w / 2 + (r * Math.cos(th) - cam.cx) * cam.scale;
      const y = h / 2 - (r * Math.sin(th) - cam.cy) * cam.scale;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const sim = simRef.current;

  return (
    <div class="sim-layout">
      <div class="sim-main">
        <SpaceCanvas
          sim={simRef}
          view={view}
          radius={mission.view.radius}
          cameraKey={camKey}
          onFrame={onFrame}
          onDraw={onDraw}
          ariaLabel={`Mission ${mission.title}`}
        >
          {phase === 'running' && sim && (
            <div class="hud hud-tl">
              <div class="hud-row">
                <span>Zeit</span>
                <span>
                  {duration(sim.time)} / {mission.years} {mission.years === 1 ? 'Jahr' : 'Jahre'}
                </span>
              </div>
            </div>
          )}
          {phase === 'done' && result && (
            <div class="result-card" role="status">
              <div class="row" style={{ justifyContent: 'space-between' }}>
                <Stars count={result.stars} size={26} />
                <StatusChip status={result.stars > 0 ? 'ok' : 'fail'}>
                  {result.stars > 0 ? 'geschafft' : 'nicht geschafft'}
                </StatusChip>
              </div>
              <p>
                {OUTCOME_TEXT[result.r.outcome]}
                {result.r.outcome !== 'stable' && ` (nach ${duration(result.r.time)})`}{' '}
                {mission.control.label}: <strong>{mission.control.format(value)}</strong>.
                {result.r.outcome === 'stable' &&
                  result.r.elements &&
                  ` Exzentrizität am Ende: ${result.r.elements.e < 0.001 ? 'unter 0,001' : fmt(result.r.elements.e, 3)}.`}
              </p>
              <div class="btn-row">
                <button type="button" class="btn primary" onClick={() => reset(value)}>
                  <Icon name="reset" /> Nochmal
                </button>
                <a class="btn" href="#missionen">
                  Alle Missionen
                </a>
              </div>
            </div>
          )}
        </SpaceCanvas>
        {phase === 'done' && result && result.stars > 0 && (
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
          <Slider
            id="mission-control"
            label={mission.control.label}
            value={value}
            min={mission.control.min}
            max={mission.control.max}
            step={mission.control.step}
            log={mission.control.log}
            format={mission.control.format}
            disabled={phase === 'running'}
            onChange={(v) => {
              setValue(v);
              reset(v);
            }}
          />
          <div class="btn-row">
            <button
              type="button"
              class="btn small"
              disabled={phase === 'running'}
              onClick={() => {
                const v = Math.max(mission.control.min, value - mission.control.step);
                setValue(v);
                reset(v);
              }}
            >
              −
            </button>
            <button
              type="button"
              class="btn small"
              disabled={phase === 'running'}
              onClick={() => {
                const v = Math.min(mission.control.max, value + mission.control.step);
                setValue(v);
                reset(v);
              }}
            >
              +
            </button>
            <span class="small muted">Feineinstellung</span>
          </div>
          <div class="btn-row">
            <button
              type="button"
              class="btn primary"
              disabled={phase === 'running'}
              onClick={() => {
                reset(value);
                setCamKey((k) => k + 1);
                setPhase('running');
              }}
            >
              <Icon name="play" filled /> Starten
            </button>
            <button
              type="button"
              class="btn"
              disabled={phase === 'running'}
              onClick={() => {
                const { result: r } = evaluateMission(mission, value);
                finish(r);
              }}
            >
              Sofort auswerten
            </button>
          </div>
        </section>
        <section class="panel panel-pad">
          <button type="button" class="btn small" onClick={() => setShowHint((h) => !h)}>
            {showHint ? 'Tipp ausblenden' : 'Tipp anzeigen'}
          </button>
          {showHint && <p class="small">{mission.hint}</p>}
          <a class="small" href={`#kapitel-${mission.chapter}`}>
            Hintergrund in Kapitel {mission.chapter}
          </a>
        </section>
      </aside>
    </div>
  );
}
