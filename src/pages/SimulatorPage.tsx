import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  DAY,
  INTEGRATORS,
  KM,
  YEAR,
  assessStability,
  criticalMoonDistance,
  scenarioInfo,
  type IntegratorId,
  type ScenarioParams,
} from '../physics';
import { takePendingScenario } from '../app/store';
import { PRESETS, SPEEDS, findPreset } from '../sim/presets';
import { Simulation, DEFAULT_SETTINGS, type SimSettings } from '../sim/Simulation';
import { SpaceCanvas } from '../sim/SpaceCanvas';
import { DEFAULT_VIEW, FRAMES, SPACE, type FrameId, type ViewOptions } from '../sim/view';
import { LineChart, type RefLine } from '../ui/charts/LineChart';
import { PageHead, StatusChip } from '../ui/content';
import { Segmented, Select, Slider, Toggle } from '../ui/controls';
import { distance, duration, fmt, km, percent, pow10, sci, sig, speed } from '../ui/format';
import { Icon } from '../ui/Icon';
import { FILE_EXPORT, downloadCanvas, downloadText } from '../ui/download';
import { CheckList } from '../ui/CheckList';

type ChartId = 'distance' | 'eccentricity' | 'hill' | 'energy';

const CHARTS: { value: ChartId; label: string }[] = [
  { value: 'distance', label: 'Abstand' },
  { value: 'eccentricity', label: 'Exzentrizität' },
  { value: 'hill', label: 'Hill-Anteil' },
  { value: 'energy', label: 'Energiefehler' },
];

const TRAIL_SPANS = [
  { value: String(60 * DAY), label: '2 Monate' },
  { value: String(YEAR), label: '1 Jahr' },
  { value: String(10 * YEAR), label: '10 Jahre' },
  { value: '0', label: 'alles' },
] as const;

export function SimulatorPage({ preset: presetParam }: { preset: string | null }) {
  const initial = findPreset(presetParam);
  const [handoff] = useState(takePendingScenario);
  const [presetId, setPresetId] = useState(handoff ? 'eigene' : initial.id);
  const [params, setParams] = useState<ScenarioParams>(handoff?.params ?? initial.params);
  const [settings, setSettings] = useState<SimSettings>({
    ...DEFAULT_SETTINGS,
    ...initial.settings,
  });
  const [view, setView] = useState<ViewOptions>({
    ...DEFAULT_VIEW,
    frame: handoff ? 'rotating' : initial.view.frame,
    follow: initial.view.follow ?? 'earth',
  });
  const [radius, setRadius] = useState(() =>
    handoff ? Math.max(3 * handoff.params.moonDistance * 1000, 1e9) : initial.view.radius,
  );
  const [speedIndex, setSpeedIndex] = useState(initial.view.speedIndex);
  const [running, setRunning] = useState(true);
  const [chart, setChart] = useState<ChartId>('distance');
  const [version, setVersion] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [cameraKey, setCameraKey] = useState(0);
  const [limited, setLimited] = useState(false);

  const simRef = useRef<Simulation | null>(null);
  const lastUpdate = useRef(0);

  // Voreinstellung aus der Adresse übernehmen (z. B. Links aus den Kapiteln).
  useEffect(() => {
    if (presetParam && presetParam !== presetId) applyPreset(presetParam);
  }, [presetParam]);

  // Neue Simulation bei geänderten Parametern.
  useEffect(() => {
    simRef.current = new Simulation(params, settings);
    setVersion((v) => v + 1);
  }, [params, resetKey]);

  // Numerik-Einstellungen gelten sofort, ohne Neustart.
  useEffect(() => {
    if (simRef.current) simRef.current.settings = settings;
  }, [settings]);

  function applyPreset(id: string): void {
    const p = findPreset(id);
    setPresetId(p.id);
    setParams(p.params);
    setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
    setView((v) => ({ ...v, frame: p.view.frame, follow: p.view.follow ?? 'earth' }));
    setRadius(p.view.radius);
    setSpeedIndex(p.view.speedIndex);
    setCameraKey((k) => k + 1);
    setRunning(true);
  }

  const update = (patch: Partial<ScenarioParams>): void => {
    setParams((p) => ({ ...p, ...patch }));
    setPresetId('eigene');
  };

  const onFrame = (dt: number): void => {
    const sim = simRef.current;
    if (!sim) return;
    if (running && !sim.pending) {
      const want = SPEEDS[speedIndex]!.value * dt;
      const t0 = performance.now();
      const start = sim.time;
      while (sim.time - start < want && performance.now() - t0 < 14 && !sim.pending) {
        sim.advance(want - (sim.time - start), 300);
      }
      const reached = sim.time - start >= want * 0.95 || sim.pending !== null;
      if (reached === limited) setLimited(!reached);
      if (sim.pending) setRunning(false);
    }
    const now = performance.now();
    if (now - lastUpdate.current > 200) {
      lastUpdate.current = now;
      setVersion((v) => v + 1);
    }
  };

  const sim = simRef.current;
  const stats = useMemo(() => sim?.stats(), [version, sim]);
  const assessment = useMemo(() => assessStability(params), [params]);
  const info = useMemo(() => scenarioInfo(params), [params]);
  const preset = PRESETS.find((p) => p.id === presetId);

  const reset = (): void => {
    setResetKey((k) => k + 1);
    setRunning(true);
  };

  const exportCsv = (): void => {
    if (!sim) return;
    const csv = sim.series.toCsv(
      {
        time: 'Zeit (Tage)',
        distance: 'Abstand Erde-Mond (km)',
        eccentricity: 'Exzentrizität',
        semiMajorAxis: 'Große Halbachse (km)',
        periapsis: 'Perigäum (km)',
        hillFraction: 'Abstand / Hill-Radius',
        energyError: 'Relativer Energiefehler',
        omega: 'Argument des Perigäums (rad)',
      },
      { time: DAY, distance: KM, semiMajorAxis: KM, periapsis: KM },
    );
    downloadText(
      `orbitlabor-${presetId}.csv`,
      `${csvHeader(params, settings)}\n${csv}`,
      'text/csv',
    );
  };

  const exportPng = (): void => {
    const canvas = document.querySelector<HTMLCanvasElement>('.sim-main .space canvas');
    if (canvas) void downloadCanvas(canvas, `orbitlabor-${presetId}.png`);
  };

  const event = sim?.pending ?? null;
  const moonRH = (params.moonDistance * KM) / info.hillRadius;
  const circ = info.moonCircularSpeed;

  return (
    <div class="stack" style={{ gap: '18px' }}>
      <PageHead eyebrow="Werkzeug · Eigenanteil" title="Drei-Körper-Simulator">
        Erde, Mond und Sonne – alle Parameter frei einstellbar. Die Simulation löst Newtons
        Bewegungsgleichungen numerisch und meldet, wenn der Mond abstürzt, zerrissen wird oder
        entkommt.
      </PageHead>
      {presetParam && !PRESETS.some((p) => p.id === presetParam) && (
        <p class="notice" role="status">
          Die Voreinstellung „{presetParam}“ gibt es nicht – gezeigt wird „{PRESETS[0]!.title}“.
        </p>
      )}

      <div class="sim-layout">
        <div class="sim-main">
          <div class="toolbar">
            <button
              type="button"
              class="btn primary"
              onClick={() => {
                if (sim?.pending) sim.acknowledge();
                setRunning((r) => !r);
              }}
            >
              <Icon name={running ? 'pause' : 'play'} filled />
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              class="btn icon"
              title="Einen Tag weiterrechnen"
              aria-label="Einen Tag weiterrechnen"
              onClick={() => {
                if (!sim) return;
                sim.acknowledge();
                sim.advance(DAY, 200_000);
                setVersion((v) => v + 1);
              }}
            >
              <Icon name="step" />
            </button>
            <button
              type="button"
              class="btn icon"
              title="Neu starten"
              aria-label="Neu starten"
              onClick={reset}
            >
              <Icon name="reset" />
            </button>
            <span class="clock" aria-live="off">
              t = {stats ? duration(stats.time) : '–'}
            </span>
            <span class="spacer" />
            <Segmented
              label="Geschwindigkeit"
              value={String(speedIndex)}
              options={SPEEDS.map((s, i) => ({ value: String(i), label: s.label }))}
              onChange={(v) => setSpeedIndex(Number(v))}
            />
          </div>

          <div class="toolbar">
            <span class="small muted">Bezugssystem</span>
            <Segmented
              label="Bezugssystem"
              value={view.frame}
              options={FRAMES.map((f) => ({ value: f.value, label: f.label }))}
              onChange={(frame: FrameId) => {
                setView((v) => ({ ...v, frame }));
                if (frame === 'inertial' && view.frame !== 'inertial')
                  setRadius(Math.max(radius, 1e9));
              }}
            />
          </div>

          <SpaceCanvas
            sim={simRef}
            view={view}
            radius={radius}
            cameraKey={`${cameraKey}-${view.frame}`}
            onFrame={onFrame}
            ariaLabel="Simulation von Erde, Mond und Sonne"
          >
            {stats && (
              <div class="hud hud-tl">
                <div class="hud-row">
                  <span>Abstand</span>
                  <span>{stats.moonAlive ? km(stats.distance) : '–'}</span>
                </div>
                <div class="hud-row">
                  <span title="Momentaner (oskulierender) Wert – er schwankt, weil die Sonne an der Bahn zieht">
                    Exzentrizität (osk.)
                  </span>
                  <span>{stats.elements ? sig(stats.elements.e, 3) : '–'}</span>
                </div>
                <div class="hud-row">
                  <span>
                    d / r<sub>H</sub>
                  </span>
                  <span>
                    {Number.isFinite(stats.hillFraction) ? sig(stats.hillFraction, 3) : '–'}
                  </span>
                </div>
                {limited && (
                  <div class="hud-row">
                    <span>Rechenleistung begrenzt</span>
                  </div>
                )}
              </div>
            )}
            {view.vectors && (
              <div class="vector-legend">
                <span>
                  <i style={{ background: SPACE.velocity }} />
                  Geschwindigkeit
                </span>
                <span>
                  <i style={{ background: SPACE.pullEarth }} />
                  Anziehung Erde
                </span>
                <span>
                  <i style={{ background: SPACE.pullSun }} />
                  Anziehung Sonne
                </span>
                <span>
                  <i style={{ background: SPACE.tidal }} />
                  Gezeitenkraft ×20
                </span>
              </div>
            )}
            {event && (
              <div class="event-card" role="alertdialog" aria-labelledby="event-title">
                <StatusChip status={event.kind === 'roche' ? 'warn' : 'fail'}>
                  {event.kind === 'roche' ? 'Warnung' : 'Ereignis'} bei t = {duration(event.time)}
                </StatusChip>
                <h3 id="event-title">{event.title}</h3>
                <p>{event.text}</p>
                <div class="btn-row">
                  <button
                    type="button"
                    class="btn primary"
                    onClick={() => {
                      sim?.acknowledge();
                      setRunning(true);
                      setVersion((v) => v + 1);
                    }}
                  >
                    Weiterrechnen
                  </button>
                  <button type="button" class="btn" onClick={reset}>
                    Neu starten
                  </button>
                </div>
              </div>
            )}
          </SpaceCanvas>

          <div class="info-grid">
            <section class="panel panel-pad" aria-labelledby="prognose">
              <div class="panel-title">
                <h3 id="prognose">Prognose aus den Startwerten</h3>
                <StatusChip
                  status={
                    assessment.verdict === 'stable'
                      ? 'ok'
                      : assessment.verdict === 'marginal'
                        ? 'warn'
                        : 'fail'
                  }
                >
                  {assessment.verdict === 'stable'
                    ? 'stabil erwartet'
                    : assessment.verdict === 'marginal'
                      ? 'grenzwertig'
                      : 'instabil erwartet'}
                </StatusChip>
              </div>
              <CheckList checks={assessment.checks} />
            </section>

            <section class="panel panel-pad" aria-labelledby="messwerte">
              <div class="panel-title">
                <h3 id="messwerte">Messwerte</h3>
                {sim && <span class="small muted">{fmt(sim.steps)} Schritte</span>}
              </div>
              {stats && (
                <dl class="kv">
                  <dt>Abstand Erde–Mond</dt>
                  <dd>{stats.moonAlive ? km(stats.distance) : 'Mond zerstört'}</dd>
                  <dt>Relativgeschwindigkeit</dt>
                  <dd>{stats.moonAlive ? speed(stats.relativeSpeed) : '–'}</dd>
                  <dt>Große Halbachse a</dt>
                  <dd>{stats.elements?.bound ? km(stats.elements.a) : 'ungebunden'}</dd>
                  <dt>Perigäum / Apogäum</dt>
                  <dd>
                    {stats.elements ? km(stats.elements.periapsis) : '–'} /{' '}
                    {stats.elements ? distance(stats.elements.apoapsis) : '–'}
                  </dd>
                  <dt>Umlaufzeit (oskulierend)</dt>
                  <dd>{stats.elements?.bound ? duration(stats.elements.period) : '–'}</dd>
                  <dt>
                    Hill-Radius r<sub>H</sub>
                  </dt>
                  <dd>{distance(stats.hillRadius)}</dd>
                  <dt>Min. / max. Abstand bisher</dt>
                  <dd>
                    {sim && Number.isFinite(sim.minDistance) ? km(sim.minDistance) : '–'} /{' '}
                    {sim ? distance(sim.maxDistance) : '–'}
                  </dd>
                  <dt>Anziehung Sonne : Erde</dt>
                  <dd>{stats.pullRatio ? `${sig(stats.pullRatio, 3)} : 1` : '–'}</dd>
                  <dt>Gezeitenstörung</dt>
                  <dd>{stats.tidalRatio ? percent(stats.tidalRatio, 2) : '–'}</dd>
                  <dt>Jacobi C / C(L1)</dt>
                  <dd>
                    {stats.jacobi ? `${fmt(stats.jacobi.C, 5)} / ${fmt(stats.jacobi.CL1, 5)}` : '–'}
                  </dd>
                  <dt>Energiefehler |ΔE/E|</dt>
                  <dd>{sci(stats.energyError)}</dd>
                  <dt>Schrittweite</dt>
                  <dd>{duration(stats.dt)}</dd>
                  {stats.particles.total > 0 && (
                    <>
                      <dt>Teilchen gebunden / verloren</dt>
                      <dd>
                        {stats.particles.alive} /{' '}
                        {stats.particles.escaped + stats.particles.crashed}
                      </dd>
                    </>
                  )}
                </dl>
              )}
            </section>
          </div>

          <section class="panel panel-pad" aria-label="Diagramme">
            <div class="panel-title">
              <Segmented label="Diagramm" value={chart} options={CHARTS} onChange={setChart} />
              <div class="btn-row">
                <button type="button" class="btn small" onClick={exportCsv}>
                  <Icon name="download" />
                  {FILE_EXPORT ? 'CSV' : 'CSV kopieren'}
                </button>
                {FILE_EXPORT && (
                  <button type="button" class="btn small" onClick={exportPng}>
                    <Icon name="camera" />
                    Bild
                  </button>
                )}
              </div>
            </div>
            {sim && <SeriesChart sim={sim} chart={chart} version={version} />}
          </section>
        </div>

        <aside class="controls" aria-label="Einstellungen">
          <details class="section" open>
            <summary>Szenario</summary>
            <div class="section-body">
              <Select
                id="preset"
                label="Voreinstellung"
                value={presetId}
                options={[
                  ...(presetId === 'eigene'
                    ? [{ value: 'eigene', label: 'Eigene Einstellungen' }]
                    : []),
                  ...PRESETS.map((p) => ({ value: p.id, label: p.title })),
                ]}
                onChange={(id) => id !== 'eigene' && applyPreset(id)}
              />
              {preset && <p class="small muted">{preset.description}</p>}
              {preset?.chapter ? (
                <a class="small" href={`#kapitel-${preset.chapter}`}>
                  Hintergrund in Kapitel {preset.chapter}
                </a>
              ) : preset?.chapter === 0 ? (
                <a class="small" href="#methodik">
                  Hintergrund: Methodik & Validierung
                </a>
              ) : null}
              <div class="btn-row">
                <button
                  type="button"
                  class="btn small"
                  onClick={() => simRef.current?.kickMoon(0.95)}
                >
                  Mond bremsen −5 %
                </button>
                <button
                  type="button"
                  class="btn small"
                  onClick={() => simRef.current?.kickMoon(1.05)}
                >
                  beschleunigen +5 %
                </button>
              </div>
            </div>
          </details>

          <details class="section" open>
            <summary>Mond</summary>
            <div class="section-body">
              <Slider
                id="moon-distance"
                label="Anfangsabstand"
                value={params.moonDistance}
                min={10_000}
                max={3_000_000}
                log
                format={(v) => `${fmt(v)} km`}
                hint={
                  Number.isFinite(moonRH)
                    ? `= ${sig(moonRH, 3)} Hill-Radien · realer Mond: 384.400 km`
                    : 'realer Mond: 384.400 km'
                }
                onChange={(v) => update({ moonDistance: Math.round(v / 100) * 100 })}
              />
              <Slider
                id="moon-speed"
                label="Startgeschwindigkeit"
                value={params.moonSpeed}
                min={0}
                max={2}
                step={0.005}
                format={(v) => `${sig(v, 3)} × vₖ`}
                hint={`${speed(params.moonSpeed * circ)} · Kreisbahn = 1 · Flucht (ohne Sonne) = 1,414`}
                onChange={(v) => update({ moonSpeed: v })}
              />
              <Segmented
                label="Umlaufrichtung"
                value={params.moonRetrograde ? 'retro' : 'pro'}
                options={[
                  { value: 'pro', label: 'prograd (wie die Erde)' },
                  { value: 'retro', label: 'retrograd' },
                ]}
                onChange={(v) => update({ moonRetrograde: v === 'retro' })}
              />
              <Slider
                id="moon-angle"
                label="Startposition"
                value={params.moonAngle}
                min={0}
                max={360}
                step={5}
                format={(v) => `${fmt(v)}°`}
                hint="0° = Vollmond (hinter der Erde), 180° = Neumond"
                onChange={(v) => update({ moonAngle: v })}
              />
              <Slider
                id="moon-mass"
                label="Mondmasse"
                value={params.moonMass}
                min={0.01}
                max={100}
                log
                format={(v) => `${sig(v, 2)} × M☾`}
                hint="81 × M☾ entspräche der Erdmasse"
                onChange={(v) => update({ moonMass: v })}
              />
            </div>
          </details>

          <details class="section">
            <summary>Erde & Sonne</summary>
            <div class="section-body">
              <Toggle
                id="sun-on"
                label="Sonne vorhanden"
                checked={params.sunMass > 0}
                onChange={(on) => update({ sunMass: on ? 1 : 0 })}
              />
              <Slider
                id="sun-mass"
                label="Sonnenmasse"
                value={Math.max(params.sunMass, 0.1)}
                min={0.1}
                max={100}
                log
                disabled={params.sunMass === 0}
                format={(v) => `${sig(v, 2)} × M☉`}
                onChange={(v) => update({ sunMass: v })}
              />
              <Slider
                id="earth-orbit"
                label="Abstand Erde–Sonne (Halbachse)"
                value={params.earthOrbit}
                min={0.1}
                max={10}
                log
                format={(v) => `${sig(v, 3)} AE`}
                hint={`Hill-Radius: ${distance(info.hillRadius)}`}
                onChange={(v) => update({ earthOrbit: v })}
              />
              <Slider
                id="earth-ecc"
                label="Exzentrizität der Erdbahn"
                value={params.earthEccentricity}
                min={0}
                max={0.9}
                step={0.001}
                format={(v) => sig(v, 3)}
                hint="real: 0,0167 – Start im Perihel"
                onChange={(v) => update({ earthEccentricity: v })}
              />
              <Slider
                id="earth-mass"
                label="Erdmasse"
                value={params.earthMass}
                min={0.1}
                max={300}
                log
                format={(v) => `${sig(v, 2)} × M⊕`}
                hint="Radius wächst bei gleicher Dichte mit"
                onChange={(v) => update({ earthMass: v })}
              />
            </div>
          </details>

          <details class="section">
            <summary>Testteilchen & Störkörper</summary>
            <div class="section-body">
              <Toggle
                id="particles-on"
                label="Teilchenwolke um die Erde"
                checked={params.particles !== null}
                onChange={(on) =>
                  update({
                    particles: on
                      ? { count: 200, innerKm: 60_000, outerKm: 1_400_000, retrograde: false }
                      : null,
                  })
                }
              />
              {params.particles && (
                <>
                  <Slider
                    id="particle-count"
                    label="Anzahl"
                    value={params.particles.count}
                    min={20}
                    max={600}
                    step={10}
                    format={(v) => fmt(v)}
                    onChange={(v) => update({ particles: { ...params.particles!, count: v } })}
                  />
                  <Slider
                    id="particle-inner"
                    label="Innenradius"
                    value={params.particles.innerKm}
                    min={20_000}
                    max={1_000_000}
                    log
                    format={(v) => `${fmt(v)} km`}
                    onChange={(v) =>
                      update({
                        particles: {
                          ...params.particles!,
                          innerKm: Math.min(v, params.particles!.outerKm),
                        },
                      })
                    }
                  />
                  <Slider
                    id="particle-outer"
                    label="Außenradius"
                    value={params.particles.outerKm}
                    min={50_000}
                    max={3_000_000}
                    log
                    format={(v) => `${fmt(v)} km`}
                    onChange={(v) =>
                      update({
                        particles: {
                          ...params.particles!,
                          outerKm: Math.max(v, params.particles!.innerKm),
                        },
                      })
                    }
                  />
                  <Toggle
                    id="particle-retro"
                    label="rückläufig (retrograd)"
                    checked={params.particles.retrograde}
                    onChange={(retrograde) =>
                      update({ particles: { ...params.particles!, retrograde } })
                    }
                  />
                </>
              )}
              <hr class="rule" />
              <Toggle
                id="intruder-on"
                label="Störkörper fliegt vorbei"
                checked={params.intruder !== null}
                onChange={(on) =>
                  update({
                    intruder: on
                      ? { mass: 317.8, distance: 500_000, speed: 20, leadDays: 20 }
                      : null,
                  })
                }
              />
              {params.intruder && (
                <>
                  <Slider
                    id="intruder-mass"
                    label="Masse"
                    value={params.intruder.mass}
                    min={0.1}
                    max={3000}
                    log
                    format={(v) => `${sig(v, 3)} × M⊕`}
                    hint="Jupiter: 318 M⊕"
                    onChange={(v) => update({ intruder: { ...params.intruder!, mass: v } })}
                  />
                  <Slider
                    id="intruder-distance"
                    label="Vorbeiflug-Abstand zur Erde"
                    value={params.intruder.distance}
                    min={50_000}
                    max={20_000_000}
                    log
                    format={(v) => `${fmt(v)} km`}
                    onChange={(v) =>
                      update({
                        intruder: { ...params.intruder!, distance: Math.round(v / 1000) * 1000 },
                      })
                    }
                  />
                  <Slider
                    id="intruder-speed"
                    label="Relativgeschwindigkeit"
                    value={params.intruder.speed}
                    min={2}
                    max={100}
                    step={0.5}
                    format={(v) => `${sig(v, 3)} km/s`}
                    onChange={(v) => update({ intruder: { ...params.intruder!, speed: v } })}
                  />
                </>
              )}
            </div>
          </details>

          <details class="section">
            <summary>Darstellung</summary>
            <div class="section-body">
              {view.frame === 'inertial' && (
                <Select
                  id="follow"
                  label="Kamera folgt"
                  value={view.follow}
                  options={[
                    { value: 'none', label: 'niemandem (Schwerpunkt)' },
                    { value: 'earth', label: 'der Erde' },
                    { value: 'moon', label: 'dem Mond' },
                    { value: 'sun', label: 'der Sonne' },
                  ]}
                  onChange={(follow) => setView((v) => ({ ...v, follow }))}
                />
              )}
              <p class="small muted">{FRAMES.find((f) => f.value === view.frame)?.description}</p>
              <Toggle
                id="trails"
                label="Bahnspuren"
                checked={view.trails}
                onChange={(trails) => setView((v) => ({ ...v, trails }))}
              />
              <Select
                id="trail-span"
                label="Spurlänge"
                value={String(view.trailSpan)}
                options={TRAIL_SPANS}
                onChange={(s) => setView((v) => ({ ...v, trailSpan: Number(s) }))}
              />
              <Toggle
                id="vectors"
                label="Kräfte und Geschwindigkeit"
                checked={view.vectors}
                onChange={(vectors) => setView((v) => ({ ...v, vectors }))}
              />
              <Toggle
                id="limits"
                label="Hill-Sphäre, Roche-Grenze, L-Punkte"
                checked={view.limits}
                onChange={(limits) => setView((v) => ({ ...v, limits }))}
              />
              <Toggle
                id="labels"
                label="Beschriftungen"
                checked={view.labels}
                onChange={(labels) => setView((v) => ({ ...v, labels }))}
              />
              <Toggle
                id="exaggerate"
                label="Körper vergrößert zeigen"
                checked={view.exaggerate}
                onChange={(exaggerate) => setView((v) => ({ ...v, exaggerate }))}
              />
              <p class="small muted">
                Ziehen verschiebt, Mausrad oder zwei Finger zoomen, Doppelklick setzt zurück.
              </p>
            </div>
          </details>

          <details class="section">
            <summary>Numerik</summary>
            <div class="section-body">
              <Select
                id="integrator"
                label="Integrationsverfahren"
                value={settings.integrator}
                options={Object.values(INTEGRATORS).map((i) => ({ value: i.id, label: i.name }))}
                onChange={(integrator: IntegratorId) => setSettings((s) => ({ ...s, integrator }))}
              />
              <p class="small muted">{INTEGRATORS[settings.integrator].description}</p>
              <Toggle
                id="adaptive"
                label="Adaptive Schrittweite"
                checked={settings.adaptive}
                onChange={(adaptive) => setSettings((s) => ({ ...s, adaptive }))}
              />
              {settings.adaptive ? (
                <Slider
                  id="eta"
                  label="Genauigkeit η"
                  value={settings.eta}
                  min={0.001}
                  max={0.1}
                  log
                  format={(v) => sig(v, 2)}
                  hint="Schritt = η × kürzeste Zeitskala; kleiner = genauer"
                  onChange={(eta) => setSettings((s) => ({ ...s, eta }))}
                />
              ) : (
                <Slider
                  id="fixed-dt"
                  label="Feste Schrittweite"
                  value={settings.fixedDt}
                  min={60}
                  max={10 * DAY}
                  log
                  format={duration}
                  onChange={(fixedDt) => setSettings((s) => ({ ...s, fixedDt }))}
                />
              )}
              <Toggle
                id="roche-events"
                label="Bei Roche-Grenze anhalten"
                checked={settings.rocheEvents}
                onChange={(rocheEvents) => setSettings((s) => ({ ...s, rocheEvents }))}
              />
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

function SeriesChart({
  sim,
  chart,
  version,
}: {
  sim: Simulation;
  chart: ChartId;
  version: number;
}) {
  const s = sim.series;
  const n = s.length;
  const useYears = sim.time > 2 * YEAR;
  const unit = useYears ? YEAR : DAY;
  const x = useMemo(() => {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = s.time[i]! / unit;
    return out;
  }, [version, unit]);
  const xLabel = useYears ? 'Zeit (Jahre)' : 'Zeit (Tage)';
  const xFormat = (v: number): string => fmt(v, useYears && v < 10 ? 1 : 0);
  const hill = sim.info.hillRadius;
  const crit = criticalMoonDistance(sim.params.moonRetrograde, sim.params.earthEccentricity, 0);

  if (chart === 'distance') {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = s.data.distance[i]! / KM;
    const refs: RefLine[] = [{ y: sim.info.rocheFluid / KM, label: 'Roche-Grenze' }];
    if (Number.isFinite(hill)) refs.push({ y: (crit * hill) / KM, label: 'Stabilitätsgrenze' });
    return (
      <LineChart
        title="Abstand Erde–Mond"
        series={[{ id: 'd', label: 'Abstand', x, y, length: n }]}
        xLabel={xLabel}
        yLabel="Abstand (km)"
        xFormat={xFormat}
        yFormat={(v) => fmt(v)}
        refLines={refs}
        version={version}
      />
    );
  }
  if (chart === 'eccentricity') {
    return (
      <LineChart
        title="Exzentrizität der Mondbahn (oskulierend)"
        series={[{ id: 'e', label: 'Exzentrizität', x, y: s.data.eccentricity, length: n }]}
        xLabel={xLabel}
        yLabel="e"
        xFormat={xFormat}
        yFormat={(v) => sig(v, 2)}
        yMin={0}
        version={version}
      />
    );
  }
  if (chart === 'hill') {
    return (
      <LineChart
        title="Abstand in Hill-Radien"
        series={[
          { id: 'h', label: 'Abstand in Hill-Radien', x, y: s.data.hillFraction, length: n },
        ]}
        xLabel={xLabel}
        yLabel="Abstand in Hill-Radien"
        xFormat={xFormat}
        yFormat={(v) => sig(v, 2)}
        yMin={0}
        refLines={[
          { y: crit, label: `Stabilitätsgrenze ${sig(crit, 2)} Hill-Radien` },
          { y: 1, label: 'Hill-Radius' },
        ]}
        version={version}
      />
    );
  }
  return (
    <LineChart
      title="Relativer Energiefehler |ΔE/E₀| – Maß für die Rechengenauigkeit"
      series={[{ id: 'E', label: 'Energiefehler', x, y: s.data.energyError, length: n }]}
      xLabel={xLabel}
      yLabel="|ΔE/E₀|"
      xFormat={xFormat}
      yFormat={pow10}
      valueFormat={(v) => sci(v, 2)}
      yLog
      version={version}
    />
  );
}

function csvHeader(p: ScenarioParams, s: SimSettings): string {
  return [
    '# Orbitlabor – Messreihe',
    `# Sonnenmasse ${p.sunMass} M☉; Erdmasse ${p.earthMass} M⊕; Mondmasse ${p.moonMass} M☾`,
    `# Erdbahn ${p.earthOrbit} AE, e = ${p.earthEccentricity}`,
    `# Mond: Abstand ${p.moonDistance} km, v = ${p.moonSpeed} × vₖ, ${p.moonRetrograde ? 'retrograd' : 'prograd'}, Startwinkel ${p.moonAngle}°`,
    `# Verfahren: ${INTEGRATORS[s.integrator].name}, ${s.adaptive ? `adaptiv η = ${s.eta}` : `dt = ${s.fixedDt} s`}`,
  ].join('\n');
}
