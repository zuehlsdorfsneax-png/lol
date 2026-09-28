import { useEffect, useRef, useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { Tex } from '../ui/content';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { Icon } from '../ui/Icon';
import { CHALLENGES, type Challenge, type ChallengeGroup } from './challenges';
import { PAINTS, drawPart, drawRocket, setPaint } from './draw';
import { apsides, type Satellite } from './flight';
import { km } from './format';
import { GOALS, GOAL_GROUPS, RANKS, STAR_POINTS, careerPoints, rankFor } from './goals';
import {
  MAX_PARTS,
  PARTS,
  TEMPLATES,
  checkDesign,
  designHeight,
  part,
  stageStats,
  totalDeltaV,
  totalMass,
  unlocked,
  type Design,
  type PartDef,
} from './parts';
import type { Tab } from './RocketGame';
import { bodyById } from './world';

/** Grobe Δv-Bedarfe im Spiel (aus Testflügen mit Hilfe-Pilot und Bordcomputer). */
const MILESTONES = [
  { dv: 2500, label: 'Weltraum' },
  { dv: 3900, label: 'Umlaufbahn' },
  { dv: 4400, label: 'Raumstation' },
  { dv: 5700, label: 'Mondlandung' },
  { dv: 6900, label: 'Mond hin & zurück' },
  { dv: 7800, label: 'Marslandung' },
  { dv: 9500, label: 'Europa-Landung' },
];

const fmt = (x: number, d = 0): string =>
  x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

function PartIcon({ def }: { def: PartDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = prepareCanvas(c, 44, 44);
    if (!ctx) return;
    ctx.clearRect(0, 0, 44, 44);
    // Landebeine und Booster ragen nach unten über ihr Bauteil hinaus.
    const below =
      def.kind === 'legs' ? 1.6 : def.kind === 'booster' ? 5.5 : def.kind === 'shield' ? 0.35 : 0;
    const extra = def.kind === 'booster' ? 1.8 : 0;
    const h = def.height + below + extra;
    const wide = def.width + (def.kind === 'legs' ? 3 : def.kind === 'booster' ? 2.6 : 0);
    const s = Math.min(36 / Math.max(wide, 0.5), 36 / h);
    ctx.save();
    ctx.translate(22, 22 + (h * s) / 2 - below * s);
    ctx.scale(s, -s);
    drawPart(ctx, def, 0, -below + (def.kind === 'legs' ? 0.2 : 0));
    ctx.restore();
  }, [def]);
  return <canvas ref={ref} class="part-icon" style={{ width: '44px', height: '44px' }} />;
}

function Preview({
  design,
  selected,
  onSelect,
}: {
  design: Design;
  selected: number;
  onSelect: (i: number) => void;
}) {
  const [box, size] = useElementSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const layout = useRef<{ scale: number; base: number; spans: [number, number][] }>({
    scale: 1,
    base: 0,
    spans: [],
  });

  useEffect(() => {
    const c = canvas.current;
    const { width, height } = size;
    if (!c || width === 0) return;
    const ctx = prepareCanvas(c, width, height);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // Boden und Hilfslinien alle 5 m
    const total = Math.max(designHeight(design), 8);
    const scale = Math.min((height - 50) / (total + 2), 26);
    const base = height - 26;
    ctx.strokeStyle = 'rgba(143,153,184,0.25)';
    ctx.fillStyle = 'rgba(143,153,184,0.8)';
    ctx.font = '11px Jost, system-ui, sans-serif';
    ctx.lineWidth = 1;
    for (let m = 5; m < total + 2; m += 5) {
      const y = base - m * scale;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
      ctx.fillText(`${m} m`, 12, y - 3);
    }
    ctx.fillStyle = '#3c434d';
    ctx.fillRect(width / 2 - 70, base, 140, 8);

    ctx.save();
    ctx.translate(width / 2, base);
    ctx.scale(scale, -scale);
    drawRocket(ctx, design);
    ctx.restore();

    // Auswahl markieren
    const spans: [number, number][] = [];
    let y = 0;
    for (let i = design.length - 1; i >= 0; i--) {
      const h = part(design[i]!).height;
      spans[i] = [y, y + h];
      y += h;
    }
    layout.current = { scale, base, spans };
    if (selected >= 0 && spans[selected]) {
      const [a, b] = spans[selected];
      const w = part(design[selected]!).width;
      ctx.strokeStyle = '#e2a846';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(
        width / 2 - (w / 2) * scale - 5,
        base - b * scale - 3,
        w * scale + 10,
        (b - a) * scale + 6,
      );
      ctx.setLineDash([]);
    }
    if (design.length === 0) {
      ctx.fillStyle = 'rgba(223,229,245,0.8)';
      ctx.textAlign = 'center';
      ctx.font = '15px Jost, system-ui, sans-serif';
      ctx.fillText('Wähle links Bauteile aus –', width / 2, height / 2 - 10);
      ctx.fillText('oder nimm eine Vorlage.', width / 2, height / 2 + 12);
    }
  }, [design, selected, size]);

  const click = (e: MouseEvent): void => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const { scale, base, spans } = layout.current;
    const m = (base - (e.clientY - r.top)) / scale;
    const x = Math.abs(e.clientX - r.left - r.width / 2) / scale;
    const hit = spans.findIndex(
      (s, i) => s && m >= s[0] && m <= s[1] && x <= part(design[i]!).width / 2 + 1.5,
    );
    onSelect(hit);
  };

  return (
    <div class="build-preview" ref={box}>
      <canvas
        ref={canvas}
        onClick={click}
        role="img"
        aria-label="Vorschau der Rakete; ein Klick wählt ein Bauteil aus"
      />
    </div>
  );
}

export function Builder({
  tab,
  onTab,
  design,
  goals,
  stars,
  satellites,
  onSatellites,
  paint,
  onPaint,
  onChange,
  onLaunch,
  onChallenge,
  sandbox,
  onSandbox,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  design: Design;
  goals: readonly string[];
  stars: Record<string, number>;
  satellites: Satellite[];
  onSatellites: (s: Satellite[]) => void;
  paint: string;
  onPaint: (id: string) => void;
  onChange: (d: Design) => void;
  onLaunch: () => void;
  onChallenge: (c: Challenge) => void;
  sandbox: boolean;
  onSandbox: (on: boolean) => void;
}) {
  setPaint(paint);
  const points = careerPoints(goals, stars);
  const tabs = (
    <div class="rocket-tabs" role="tablist" aria-label="Bereiche der Raketenwerft">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'werft'}
        class={tab === 'werft' ? 'on' : ''}
        onClick={() => onTab('werft')}
      >
        🔧 Werft &amp; Freier Flug
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'herausforderungen'}
        class={tab === 'herausforderungen' ? 'on' : ''}
        onClick={() => onTab('herausforderungen')}
      >
        ★ Herausforderungen{' '}
        <span class="tab-count">
          {Object.values(stars).reduce((a, b) => a + b, 0)} / {CHALLENGES.length * 3}
        </span>
      </button>
    </div>
  );
  if (tab === 'herausforderungen')
    return (
      <div class="build">
        {tabs}
        <ChallengeList stars={stars} onStart={onChallenge} />
        <MissionControl
          goals={goals}
          stars={stars}
          paint={paint}
          onPaint={onPaint}
          satellites={satellites}
          onSatellites={onSatellites}
        />
      </div>
    );
  return (
    <Werft
      tabs={tabs}
      design={design}
      goals={goals}
      stars={stars}
      points={points}
      satellites={satellites}
      onSatellites={onSatellites}
      paint={paint}
      onPaint={onPaint}
      onChange={onChange}
      onLaunch={onLaunch}
      sandbox={sandbox}
      onSandbox={onSandbox}
    />
  );
}

function Werft({
  tabs,
  design,
  goals,
  stars,
  points,
  satellites,
  onSatellites,
  paint,
  onPaint,
  onChange,
  onLaunch,
  sandbox,
  onSandbox,
}: {
  tabs: preact.ComponentChildren;
  design: Design;
  goals: readonly string[];
  stars: Record<string, number>;
  points: number;
  satellites: Satellite[];
  onSatellites: (s: Satellite[]) => void;
  paint: string;
  onPaint: (id: string) => void;
  onChange: (d: Design) => void;
  onLaunch: () => void;
  sandbox: boolean;
  onSandbox: (on: boolean) => void;
}) {
  const [selected, setSelected] = useState(-1);
  const [hangar, setHangar] = useState<Record<string, string[]>>(
    () => progressStore.load().rocketHangar ?? {},
  );
  const [name, setName] = useState('');
  const saveHangar = (next: Record<string, string[]>): void => {
    setHangar(next);
    progressStore.update((p) => ({ ...p, rocketHangar: next }));
  };
  const stats = stageStats(design.length ? design : ['kapsel']);
  const problems = checkDesign(design);
  const blocked = problems.some((p) => p.level === 'error');
  const dv = design.length ? totalDeltaV(design) : 0;
  const mass = totalMass(design);

  const [lockHint, setLockHint] = useState('');
  const add = (id: string): void => {
    if (!unlocked(id, points, sandbox)) {
      setLockHint(
        `${part(id).name} gibt es ab ${part(id).unlock} Punkten (du hast ${points}). Oder im Sandkasten ausprobieren.`,
      );
      return;
    }
    setLockHint('');
    if (design.length >= MAX_PARTS) return;
    const at = selected >= 0 ? selected + 1 : design.length;
    const next = [...design.slice(0, at), id, ...design.slice(at)];
    onChange(next);
    setSelected(at);
  };
  const move = (dir: -1 | 1): void => {
    const j = selected + dir;
    if (selected < 0 || j < 0 || j >= design.length) return;
    const next = [...design];
    [next[selected], next[j]] = [next[j]!, next[selected]!];
    onChange(next);
    setSelected(j);
  };
  const remove = (): void => {
    if (selected < 0) return;
    onChange(design.filter((_, i) => i !== selected));
    setSelected(Math.min(selected, design.length - 2));
  };

  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') remove();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const maxBar = 12_000;
  const lockedParts = design.filter((id) => !unlocked(id, points, sandbox));
  return (
    <div class="build">
      {tabs}
      <div class="build-templates">
        <span class="small muted">Vorlagen:</span>
        {TEMPLATES.map((t) => {
          const locked = t.parts.some((id) => !unlocked(id, points, sandbox));
          return (
            <button
              key={t.id}
              type="button"
              class={`btn small ${locked ? 'locked' : ''}`}
              title={locked ? `${t.info} (Einige Teile sind noch gesperrt.)` : t.info}
              onClick={() => {
                onChange([...t.parts]);
                setSelected(-1);
              }}
            >
              {locked ? '🔒 ' : ''}
              {t.name}
            </button>
          );
        })}
        <button
          type="button"
          class="btn small ghost"
          onClick={() => {
            onChange([]);
            setSelected(-1);
          }}
        >
          Alles abbauen
        </button>
      </div>
      <div class="build-templates hangar">
        <span class="small muted">Hangar:</span>
        {Object.keys(hangar).length === 0 && (
          <span class="small muted">noch keine eigenen Raketen gespeichert</span>
        )}
        {Object.entries(hangar).map(([n, d]) => (
          <span key={n} class="hangar-item">
            <button
              type="button"
              class="btn small"
              onClick={() => {
                onChange([...d]);
                setSelected(-1);
                setName(n);
              }}
            >
              {n}
            </button>
            <button
              type="button"
              class="btn small ghost"
              aria-label={`${n} löschen`}
              onClick={() => {
                const next = { ...hangar };
                delete next[n];
                saveHangar(next);
              }}
            >
              <Icon name="close" />
            </button>
          </span>
        ))}
        <input
          class="hangar-name"
          type="text"
          maxLength={24}
          placeholder="Name der Rakete"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          class="btn small"
          disabled={!name.trim() || design.length === 0}
          onClick={() => saveHangar({ ...hangar, [name.trim()]: [...design] })}
        >
          Speichern
        </button>
      </div>

      <div class="build-grid">
        <section class="build-palette" aria-label="Bauteile">
          <h3>Bauteile</h3>
          <p class="small muted">
            Klick fügt das Teil {selected >= 0 ? 'unter dem markierten Teil' : 'unten'} an.
          </p>
          <div class="palette-list">
            {PARTS.map((p) => {
              const open = unlocked(p.id, points, sandbox);
              return (
                <button
                  key={p.id}
                  type="button"
                  class={`palette-item ${open ? '' : 'locked'}`}
                  onClick={() => add(p.id)}
                  title={open ? p.info : `Ab ${p.unlock} Punkten: ${p.info}`}
                >
                  <PartIcon def={p} />
                  <span>
                    <strong>
                      {open ? '' : '🔒 '}
                      {p.name}
                    </strong>
                    <span class="small muted">
                      {!open
                        ? `ab ${p.unlock} Punkten`
                        : p.thrust > 0
                          ? `${fmt(p.thrust / 1000)} kN · ${p.isp} s`
                          : p.fuel > 0
                            ? `${fmt(p.fuel / 1000, 1)} t Treibstoff`
                            : `${fmt(p.dry / 1000, 1)} t`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {lockHint && <p class="small lock-hint">{lockHint}</p>}
        </section>

        <section class="build-center" aria-label="Rakete">
          <Preview design={design} selected={selected} onSelect={setSelected} />
          <div class="btn-row build-tools">
            <button
              type="button"
              class="btn small"
              disabled={selected <= 0}
              onClick={() => move(-1)}
            >
              ▲ nach oben
            </button>
            <button
              type="button"
              class="btn small"
              disabled={selected < 0 || selected >= design.length - 1}
              onClick={() => move(1)}
            >
              ▼ nach unten
            </button>
            <button type="button" class="btn small" disabled={selected < 0} onClick={remove}>
              <Icon name="close" /> Entfernen
            </button>
          </div>
          {selected >= 0 && design[selected] && (
            <p class="small muted build-info">
              <strong>{part(design[selected]).name}:</strong> {part(design[selected]).info}
            </p>
          )}
        </section>

        <section class="build-stats" aria-label="Daten der Rakete">
          <h3>Flugdaten</h3>
          <dl class="kv">
            <dt>Startmasse</dt>
            <dd>{fmt(mass / 1000, 1)} t</dd>
            <dt>Höhe</dt>
            <dd>{fmt(designHeight(design), 1)} m</dd>
            <dt>Teile</dt>
            <dd>
              {design.length} / {MAX_PARTS}
            </dd>
          </dl>
          {design.length > 0 && (
            <table class="table stage-table">
              <thead>
                <tr>
                  <th>Stufe</th>
                  <th>Δv</th>
                  <th title="Schub-Gewichts-Verhältnis auf der Erde">TWR</th>
                  <th>Brenndauer</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.number}>
                    <td>{s.number}</td>
                    <td>{fmt(s.deltaV)} m/s</td>
                    <td class={s.thrust > 0 && s.twrEarth < 1 ? 'weak' : ''}>
                      {s.thrust > 0 ? fmt(s.twrEarth, 2) : '–'}
                      {s.thrust > 0 && s.twrMoon >= 1 && s.twrEarth < 1 ? ' (Mond ✓)' : ''}
                    </td>
                    <td>{s.burnTime > 0 ? `${fmt(s.burnTime)} s` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div class="dv-meter" aria-label={`Gesamt-Δv ${fmt(dv)} m/s`}>
            <div class="dv-head">
              <span>Gesamt-Δv</span>
              <strong>{fmt(dv)} m/s</strong>
            </div>
            <div class="dv-bar">
              <div class="dv-fill" style={{ width: `${Math.min(100, (dv / maxBar) * 100)}%` }} />
              {MILESTONES.map((m) => (
                <span
                  key={m.label}
                  class={`dv-mark ${dv >= m.dv ? 'ok' : ''}`}
                  style={{ left: `${(m.dv / maxBar) * 100}%` }}
                  title={`${m.label}: etwa ${fmt(m.dv)} m/s`}
                />
              ))}
            </div>
            <ul class="dv-list">
              {MILESTONES.map((m) => (
                <li key={m.label} class={dv >= m.dv ? 'ok' : ''}>
                  {dv >= m.dv ? '✓' : '○'} {m.label} <span class="muted">≈ {fmt(m.dv)} m/s</span>
                </li>
              ))}
            </ul>
          </div>
          {problems.length > 0 && (
            <ul class="build-problems">
              {problems.map((p) => (
                <li key={p.text} class={p.level}>
                  <Icon name={p.level === 'error' ? 'fail' : 'warn'} /> {p.text}
                </li>
              ))}
            </ul>
          )}
          <label class="sandbox-toggle">
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(e) => onSandbox((e.target as HTMLInputElement).checked)}
            />
            <span>
              <strong>Sandkasten:</strong> unendlich Treibstoff zum Ausprobieren – dafür gibt es
              keine Punkte.
            </span>
          </label>
          {lockedParts.length > 0 && (
            <p class="small lock-hint">
              🔒 Noch gesperrt: {[...new Set(lockedParts)].map((id) => part(id).name).join(', ')}.
              Mehr Punkte sammeln – oder im Sandkasten fliegen.
            </p>
          )}
          <button
            type="button"
            class="btn primary launch-btn"
            disabled={blocked || lockedParts.length > 0}
            onClick={onLaunch}
          >
            Zur Startrampe <Icon name="arrow" />
          </button>
          <details class="rocket-eq">
            <summary>Woher kommt das Δv? – die Raketengleichung</summary>
            <p class="small">
              Eine Rakete stößt Masse nach hinten aus und wird dadurch schneller. Wie viel
              Geschwindigkeit sie insgesamt gewinnen kann, sagt die Raketengleichung von Ziolkowski:
            </p>
            <Tex
              block
            >{String.raw`\Delta v = I_\text{sp}\, g_0 \ln\frac{m_\text{voll}}{m_\text{leer}}`}</Tex>
            <p class="small">
              I<sub>sp</sub> misst, wie sparsam ein Triebwerk ist, m<sub>voll</sub>/m
              <sub>leer</sub> ist das Massenverhältnis. Weil der Logarithmus langsam wächst, lohnen
              sich Stufen: Leere Tanks werden abgeworfen, und die nächste Stufe beschleunigt weniger
              Masse.
            </p>
          </details>
        </section>
      </div>
      <MissionControl
        goals={goals}
        stars={stars}
        paint={paint}
        onPaint={onPaint}
        satellites={satellites}
        onSatellites={onSatellites}
      />
    </div>
  );
}

const GROUP_INFO: Record<ChallengeGroup, string> = {
  Flugschule: 'Die Grundlagen: abheben, Umlaufbahn, Manöver planen.',
  Profi: 'Andocken, Satelliten, Präzisionslandungen.',
  Meister: 'Für echte Raketenprofis.',
};

/** Übersicht der Herausforderungen mit den besten Sternen. */
function ChallengeList({
  stars,
  onStart,
}: {
  stars: Record<string, number>;
  onStart: (c: Challenge) => void;
}) {
  const groups: ChallengeGroup[] = ['Flugschule', 'Profi', 'Meister'];
  return (
    <section class="challenge-list" aria-label="Herausforderungen">
      <p class="small muted">
        Feste Rakete, feste Startsituation, ein Ziel: Jede Herausforderung bringt bis zu drei
        Sterne, jeder Stern zählt {STAR_POINTS} Punkte für deinen Rang.
      </p>
      {groups.map((g) => (
        <div key={g} class="challenge-group">
          <h3>
            {g} <span class="small muted">{GROUP_INFO[g]}</span>
          </h3>
          <div class="challenge-cards">
            {CHALLENGES.filter((c) => c.group === g).map((c) => {
              const n = stars[c.id] ?? 0;
              return (
                <article key={c.id} class={`challenge-card ${n > 0 ? 'done' : ''}`}>
                  <div class="challenge-stars" aria-label={`${n} von 3 Sternen`}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} class={i < n ? 'on' : ''}>
                        ★
                      </span>
                    ))}
                  </div>
                  <h4>{c.title}</h4>
                  <p class="small">{c.brief}</p>
                  <p class="small muted">
                    {c.computer ? 'Bordcomputer erlaubt' : 'Ohne Bordcomputer'}
                  </p>
                  <button type="button" class="btn primary small" onClick={() => onStart(c)}>
                    {n > 0 ? 'Nochmal' : 'Starten'} <Icon name="arrow" />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Rang, Punkte, alle Ziele, Satelliten und die freigeschalteten Lackierungen. */
function MissionControl({
  goals,
  stars,
  paint,
  onPaint,
  satellites,
  onSatellites,
}: {
  goals: readonly string[];
  stars: Record<string, number>;
  paint: string;
  onPaint: (id: string) => void;
  satellites: Satellite[];
  onSatellites: (s: Satellite[]) => void;
}) {
  const points = careerPoints(goals, stars);
  const starSum = Object.values(stars).reduce((a, b) => a + b, 0);
  const rank = rankFor(points);
  const prev = RANKS[rank.index]!.points;
  const progress = rank.next === null ? 1 : (points - prev) / (rank.next - prev);
  return (
    <section class="mission-control" aria-labelledby="missionskontrolle">
      <div class="mc-head">
        <div>
          <h3 id="missionskontrolle">Missionskontrolle</h3>
          <p class="small muted">
            Jedes erreichte Ziel und jeder Stern bringt Punkte. Mit Punkten steigst du im Rang auf –
            bis zum „{RANKS[RANKS.length - 1]!.title}“ – und schaltest neue Bauteile und
            Lackierungen frei.
          </p>
        </div>
        <div class="mc-rank">
          <strong>{rank.title}</strong>
          <span>
            {points} Punkte
            {starSum > 0 ? ` (davon ${starSum * STAR_POINTS} aus ${starSum} Sternen)` : ''}
            {rank.next !== null ? ` · nächster Rang ab ${rank.next}` : ' · höchster Rang!'}
          </span>
          <div class="dv-bar" aria-hidden="true">
            <div class="dv-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        </div>
      </div>
      <div class="mc-goals">
        {GOAL_GROUPS.map((g) => (
          <div key={g} class="mc-group">
            <h4>{g}</h4>
            <ul>
              {GOALS.filter((q) => q.group === g).map((q) => (
                <li key={q.id} class={goals.includes(q.id) ? 'done' : ''} title={q.text}>
                  <span aria-hidden="true">{goals.includes(q.id) ? '★' : '☆'}</span> {q.title}
                  <span class="pts">{q.points}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {satellites.length > 0 && (
        <div class="mc-sats">
          <h4>Deine Satelliten ({satellites.length})</h4>
          <ul>
            {satellites.map((s) => {
              const b = bodyById(s.body);
              const { peri, apo } = apsides(s.el);
              return (
                <li key={s.id}>
                  🛰 {s.name} · um {b.name} · {km(peri - b.radius)} – {km(apo - b.radius)}
                  <button
                    type="button"
                    class="btn small ghost"
                    aria-label={`${s.name} abschalten`}
                    title="Satellit abschalten (verschwindet aus allen Flügen)"
                    onClick={() => onSatellites(satellites.filter((q) => q !== s))}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div class="mc-paints" role="radiogroup" aria-label="Lackierung">
        <span class="small muted">Lackierung:</span>
        {PAINTS.map((p) => {
          const locked = points < p.points;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={paint === p.id}
              class={`paint ${paint === p.id ? 'on' : ''}`}
              disabled={locked}
              title={locked ? `Ab ${p.points} Punkten` : p.name}
              onClick={() => onPaint(p.id)}
            >
              <span
                class="swatch"
                style={{
                  background: `linear-gradient(90deg, ${p.metal[0]}, ${p.metal[1]} 45%, ${p.stripe} 46%, ${p.stripe} 60%, ${p.band} 61%)`,
                }}
              />
              {locked ? `🔒 ${p.name} · ${p.points}` : p.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
