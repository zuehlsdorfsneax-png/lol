import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { Tex } from '../ui/content';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { Icon, type IconName } from '../ui/Icon';
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
  segments,
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
    // Blaupause: feines Raster je Meter, kräftige Linien alle 5 m
    const total = Math.max(designHeight(design), 8);
    const base = height - 44;
    // Oben bleibt Platz für die Werkzeugleiste (auf dem Handy auch für die Datenzeile).
    const topPad = width < 520 ? 124 : 70;
    const scale = Math.min((base - topPad) / (total + 1), 30);
    const cx = width / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    if (scale >= 7) {
      ctx.strokeStyle = 'rgba(150,190,255,0.07)';
      ctx.beginPath();
      for (let m = 1; base - m * scale > 0; m++) {
        if (m % 5 === 0) continue;
        const y = Math.round(base - m * scale) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let k = -Math.ceil(cx / scale); k * scale < cx; k++) {
        if (k % 5 === 0) continue;
        const x = Math.round(cx + k * scale) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, base);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,190,255,0.16)';
    ctx.beginPath();
    for (let k = -Math.ceil(cx / (5 * scale)) * 5; k * scale < cx; k += 5) {
      const x = Math.round(cx + k * scale) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, base);
    }
    for (let m = 5; base - m * scale > 0; m += 5) {
      const y = Math.round(base - m * scale) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(190,210,245,0.55)';
    ctx.font = '500 11px Jost, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let m = 5; base - m * scale > 14; m += 5)
      ctx.fillText(`${m} m`, width - 10, base - m * scale - 4);
    ctx.textAlign = 'left';

    // Startplattform
    ctx.fillStyle = '#2a3346';
    ctx.fillRect(cx - 80, base, 160, 7);
    ctx.fillStyle = '#1b2233';
    ctx.fillRect(cx - 64, base + 7, 128, 5);
    ctx.fillStyle = 'rgba(226,168,70,0.9)';
    for (let x = cx - 76; x < cx + 76; x += 16) ctx.fillRect(x, base + 1, 8, 2);

    ctx.save();
    ctx.translate(cx, base);
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

    // Stufen wie in Spaceflight Simulator am Bauplan markieren: Klammer, Nummer, Δv
    const segs = segments(design);
    if (segs.length > 1) {
      const st = stageStats(design);
      const maxW = Math.max(
        ...design.map((id) => part(id).width + (part(id).kind === 'booster' ? 2.6 : 0)),
      );
      const bx = Math.round(cx - (maxW / 2) * scale - 20) + 0.5;
      let idx = 0;
      ctx.font = '600 11px Jost, system-ui, sans-serif';
      segs.forEach((seg, k) => {
        const first = idx;
        const last = idx + seg.length - 1;
        idx += seg.length;
        const y0 = base - spans[first]![1] * scale + 3;
        const y1 = base - spans[last]![0] * scale - 3;
        const number = segs.length - k;
        const mid = (y0 + y1) / 2;
        ctx.strokeStyle = 'rgba(226,168,70,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 6, y0);
        ctx.lineTo(bx, y0);
        ctx.lineTo(bx, y1);
        ctx.lineTo(bx + 6, y1);
        ctx.stroke();
        ctx.fillStyle = '#e2a846';
        ctx.beginPath();
        ctx.arc(bx - 11, mid, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1305';
        ctx.textAlign = 'center';
        ctx.fillText(String(number), bx - 11, mid + 4);
        const dv = st[number - 1]?.deltaV ?? 0;
        if (dv > 0 && y1 - y0 > 26) {
          const text = `${fmt(dv)} m/s`;
          ctx.textAlign = 'right';
          if (bx - 26 - ctx.measureText(text).width > 6) {
            ctx.fillStyle = 'rgba(200,215,245,0.75)';
            ctx.fillText(text, bx - 26, mid + 4);
          }
        }
      });
      ctx.textAlign = 'left';
    }
    if (selected >= 0 && spans[selected]) {
      const [a, b] = spans[selected];
      const w = part(design[selected]!).width;
      const x0 = cx - (w / 2) * scale - 6;
      const y0 = base - b * scale - 4;
      const bw = w * scale + 12;
      const bh = (b - a) * scale + 8;
      ctx.fillStyle = 'rgba(226,168,70,0.12)';
      ctx.fillRect(x0, y0, bw, bh);
      ctx.strokeStyle = '#e2a846';
      ctx.lineWidth = 2;
      // Nur die Ecken – wie ein Sucher
      const k = Math.min(10, bw / 3, bh / 3);
      ctx.beginPath();
      for (const [px, py, dx, dy] of [
        [x0, y0, 1, 1],
        [x0 + bw, y0, -1, 1],
        [x0, y0 + bh, 1, -1],
        [x0 + bw, y0 + bh, -1, -1],
      ] as const) {
        ctx.moveTo(px + dx * k, py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py + dy * k);
      }
      ctx.stroke();
    }
    if (design.length === 0) {
      ctx.fillStyle = 'rgba(223,229,245,0.75)';
      ctx.textAlign = 'center';
      ctx.font = '500 16px Jost, system-ui, sans-serif';
      ctx.fillText('Wähle links ein Bauteil –', cx, height / 2 - 12);
      ctx.fillText('oder oben eine Vorlage.', cx, height / 2 + 12);
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
    <div class="blueprint-canvas" ref={box}>
      <canvas
        ref={canvas}
        onClick={click}
        role="img"
        aria-label="Bauplan der Rakete; ein Klick wählt ein Bauteil aus"
      />
    </div>
  );
}

/** Kleines Aufklappmenü in der Werft (schließt bei Klick daneben und mit Esc). */
function Menu({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: (close: () => void) => ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div class="gmenu" ref={ref}>
      <button
        type="button"
        class={`gbtn ${open ? 'on' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <Icon name={icon} />
        <span class="gbtn-label">{label}</span>
      </button>
      {open && <div class="gmenu-list">{children(() => setOpen(false))}</div>}
    </div>
  );
}

const CATEGORIES: { id: string; label: string; kinds: PartDef['kind'][] }[] = [
  { id: 'kopf', label: 'Kapseln', kinds: ['capsule', 'probe', 'payload'] },
  { id: 'tank', label: 'Tanks', kinds: ['tank'] },
  { id: 'antrieb', label: 'Antrieb', kinds: ['engine', 'booster'] },
  { id: 'technik', label: 'Technik', kinds: ['decoupler', 'chute', 'legs', 'shield'] },
];

function spec(p: PartDef): string {
  if (p.thrust > 0) return `${fmt(p.thrust / 1000)} kN · ${p.isp} s`;
  if (p.fuel > 0) return `${fmt(p.fuel / 1000, 1)} t Treibstoff`;
  return `${fmt(p.dry / 1000, 1)} t`;
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
  onClose,
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
  onClose: () => void;
}) {
  setPaint(paint);
  const points = careerPoints(goals, stars);
  const starSum = Object.values(stars).reduce((a, b) => a + b, 0);
  const rank = rankFor(points);
  const problems = checkDesign(design);
  const lockedParts = design.filter((id) => !unlocked(id, points, sandbox));
  const canLaunch = !problems.some((p) => p.level === 'error') && lockedParts.length === 0;
  const TABS: { id: Tab; label: string; icon: IconName; meta?: string }[] = [
    { id: 'werft', label: 'Werft', icon: 'wrench' },
    {
      id: 'herausforderungen',
      label: 'Herausforderungen',
      icon: 'trophy',
      meta: `${starSum}/${CHALLENGES.length * 3}`,
    },
    { id: 'karriere', label: 'Karriere', icon: 'medal', meta: rank.title },
  ];
  return (
    <div class="build">
      <header class="game-bar">
        <button
          type="button"
          class="gbtn icon"
          onClick={onClose}
          aria-label="Spiel verlassen"
          title="Spiel verlassen"
        >
          <Icon name="close" />
        </button>
        <div class="game-tabs" role="tablist" aria-label="Bereiche der Raketenwerft">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              class={tab === t.id ? 'on' : ''}
              onClick={() => onTab(t.id)}
            >
              <Icon name={t.icon} />
              <span class="gbtn-label">{t.label}</span>
              {t.meta && <span class="tab-meta">{t.meta}</span>}
            </button>
          ))}
        </div>
        <div class="game-bar-end">
          {tab === 'werft' && (
            <button
              type="button"
              class="gbtn launch"
              disabled={!canLaunch}
              onClick={onLaunch}
              title={canLaunch ? 'Zur Startrampe' : 'Erst die Hinweise rechts beheben'}
            >
              <Icon name="rocket" />
              <span>Starten</span>
            </button>
          )}
        </div>
      </header>
      {tab === 'werft' ? (
        <Werft
          design={design}
          points={points}
          problems={problems}
          lockedParts={lockedParts}
          onChange={onChange}
          sandbox={sandbox}
          onSandbox={onSandbox}
        />
      ) : (
        <div class="game-page">
          <div class="game-page-inner">
            {tab === 'herausforderungen' ? (
              <ChallengeList stars={stars} onStart={onChallenge} />
            ) : (
              <MissionControl
                goals={goals}
                stars={stars}
                paint={paint}
                onPaint={onPaint}
                satellites={satellites}
                onSatellites={onSatellites}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Werft({
  design,
  points,
  problems,
  lockedParts,
  onChange,
  sandbox,
  onSandbox,
}: {
  design: Design;
  points: number;
  problems: ReturnType<typeof checkDesign>;
  lockedParts: string[];
  onChange: (d: Design) => void;
  sandbox: boolean;
  onSandbox: (on: boolean) => void;
}) {
  const [selected, setSelected] = useState(-1);
  const [cat, setCat] = useState(CATEGORIES[0]!.id);
  const [statsOpen, setStatsOpen] = useState(false);
  const [hangar, setHangar] = useState<Record<string, string[]>>(
    () => progressStore.load().rocketHangar ?? {},
  );
  const [name, setName] = useState('');
  const saveHangar = (next: Record<string, string[]>): void => {
    setHangar(next);
    progressStore.update((p) => ({ ...p, rocketHangar: next }));
  };
  const stats = stageStats(design.length ? design : ['kapsel']);
  const dv = design.length ? totalDeltaV(design) : 0;
  const mass = totalMass(design);
  const first = design.length ? stats[0] : undefined;

  const [lockHint, setLockHint] = useState('');
  const add = (id: string): void => {
    if (!unlocked(id, points, sandbox)) {
      setLockHint(
        `${part(id).name} gibt es ab ${part(id).unlock} Punkten (du hast ${points}). Im Sandkasten kannst du es schon ausprobieren.`,
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
  const load = (d: readonly string[]): void => {
    onChange([...d]);
    setSelected(-1);
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
  const sel = selected >= 0 && design[selected] ? part(design[selected]) : null;
  return (
    <div class="werft">
      <aside class="parts-panel" aria-label="Bauteile">
        <div class="part-cats" role="tablist" aria-label="Art der Bauteile">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              class={cat === c.id ? 'on' : ''}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div class="part-grid">
          {PARTS.filter((p) => CATEGORIES.find((c) => c.id === cat)!.kinds.includes(p.kind)).map(
            (p) => {
              const open = unlocked(p.id, points, sandbox);
              return (
                <button
                  key={p.id}
                  type="button"
                  class={`part-tile ${open ? '' : 'locked'}`}
                  onClick={() => add(p.id)}
                  title={open ? p.info : `Ab ${p.unlock} Punkten: ${p.info}`}
                >
                  <PartIcon def={p} />
                  <span class="part-name">{p.name}</span>
                  <span class="part-spec">{open ? spec(p) : `🔒 ab ${p.unlock} P.`}</span>
                </button>
              );
            },
          )}
        </div>
        <p class="parts-hint">
          {lockHint ||
            (selected >= 0
              ? 'Neue Teile kommen unter das markierte Teil.'
              : 'Tippen fügt unten an.')}
        </p>
      </aside>

      <section class="blueprint" aria-label="Rakete">
        <div class="blueprint-tools">
          <Menu icon="stack" label="Vorlagen">
            {(close) =>
              TEMPLATES.map((t) => {
                const locked = t.parts.some((id) => !unlocked(id, points, sandbox));
                return (
                  <button
                    key={t.id}
                    type="button"
                    class="gmenu-item"
                    onClick={() => {
                      load(t.parts);
                      close();
                    }}
                  >
                    <strong>
                      {locked ? '🔒 ' : ''}
                      {t.name}
                    </strong>
                    <span>{t.info}</span>
                  </button>
                );
              })
            }
          </Menu>
          <Menu icon="box" label="Hangar">
            {(close) => (
              <>
                {Object.keys(hangar).length === 0 && (
                  <p class="gmenu-note">Noch keine eigenen Raketen gespeichert.</p>
                )}
                {Object.entries(hangar).map(([n, d]) => (
                  <div key={n} class="gmenu-row">
                    <button
                      type="button"
                      class="gmenu-item"
                      onClick={() => {
                        load(d);
                        setName(n);
                        close();
                      }}
                    >
                      <strong>{n}</strong>
                      <span>{d.length} Teile</span>
                    </button>
                    <button
                      type="button"
                      class="gbtn icon small"
                      aria-label={`${n} löschen`}
                      onClick={() => {
                        const next = { ...hangar };
                        delete next[n];
                        saveHangar(next);
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
                <form
                  class="gmenu-save"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!name.trim() || design.length === 0) return;
                    saveHangar({ ...hangar, [name.trim()]: [...design] });
                  }}
                >
                  <input
                    type="text"
                    maxLength={24}
                    placeholder="Name der Rakete"
                    aria-label="Name der Rakete"
                    value={name}
                    onInput={(e) => setName((e.target as HTMLInputElement).value)}
                  />
                  <button
                    type="submit"
                    class="gbtn primary small"
                    disabled={!name.trim() || design.length === 0}
                  >
                    <Icon name="save" /> Speichern
                  </button>
                </form>
              </>
            )}
          </Menu>
          <button
            type="button"
            class="gbtn"
            disabled={design.length === 0}
            onClick={() => load([])}
            title="Alle Teile entfernen"
          >
            <Icon name="trash" />
            <span class="gbtn-label">Abbauen</span>
          </button>
          <label
            class={`gtoggle ${sandbox ? 'on' : ''}`}
            title="Unendlich Treibstoff, alle Teile – dafür keine Punkte"
          >
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(e) => onSandbox((e.target as HTMLInputElement).checked)}
            />
            <span class="gtoggle-knob" aria-hidden="true" />
            Sandkasten
          </label>
        </div>

        <Preview design={design} selected={selected} onSelect={setSelected} />

        {sel && (
          <div class="part-toolbar" role="toolbar" aria-label={`Bauteil ${sel.name}`}>
            <div class="part-toolbar-text">
              <strong>{sel.name}</strong>
              <span>{sel.info}</span>
            </div>
            <button
              type="button"
              class="gbtn icon"
              disabled={selected <= 0}
              onClick={() => move(-1)}
              aria-label="Nach oben"
              title="Nach oben"
            >
              <Icon name="up" />
            </button>
            <button
              type="button"
              class="gbtn icon"
              disabled={selected >= design.length - 1}
              onClick={() => move(1)}
              aria-label="Nach unten"
              title="Nach unten"
            >
              <Icon name="down" />
            </button>
            <button
              type="button"
              class="gbtn icon danger"
              onClick={remove}
              aria-label="Entfernen"
              title="Entfernen (Entf)"
            >
              <Icon name="trash" />
            </button>
          </div>
        )}
      </section>

      <aside class={`stats-panel ${statsOpen ? 'open' : ''}`} aria-label="Daten der Rakete">
        <button
          type="button"
          class="stats-summary"
          aria-expanded={statsOpen}
          onClick={() => setStatsOpen(!statsOpen)}
        >
          <span>
            Δv <strong>{fmt(dv)} m/s</strong>
          </span>
          <span>
            TWR <strong>{first && first.thrust > 0 ? fmt(first.twrEarth, 2) : '–'}</strong>
          </span>
          <span>
            <strong>{fmt(mass / 1000, 1)} t</strong>
          </span>
          {problems.some((p) => p.level === 'error') && <span class="stats-alert">!</span>}
          <Icon name="chevron" />
        </button>
        <div class="stats-body">
          <div class="dv-big">
            <span>Δv gesamt</span>
            <strong>
              {fmt(dv)} <small>m/s</small>
            </strong>
          </div>
          <div class="dv-bar" aria-hidden="true">
            <div class="dv-fill" style={{ width: `${Math.min(100, (dv / maxBar) * 100)}%` }} />
            {MILESTONES.map((m) => (
              <span
                key={m.label}
                class={`dv-mark ${dv >= m.dv ? 'ok' : ''}`}
                style={{ left: `${(m.dv / maxBar) * 100}%` }}
              />
            ))}
          </div>
          <ul class="dv-list">
            {MILESTONES.map((m) => (
              <li key={m.label} class={dv >= m.dv ? 'ok' : ''}>
                <span aria-hidden="true">{dv >= m.dv ? '✓' : '·'}</span> {m.label}
                <span class="dv-need">{fmt(m.dv)}</span>
              </li>
            ))}
          </ul>
          <dl class="stat-grid">
            <div>
              <dt>Masse</dt>
              <dd>{fmt(mass / 1000, 1)} t</dd>
            </div>
            <div>
              <dt title="Schub-Gewichts-Verhältnis beim Start auf der Erde">TWR</dt>
              <dd class={first && first.thrust > 0 && first.twrEarth < 1 ? 'weak' : ''}>
                {first && first.thrust > 0 ? fmt(first.twrEarth, 2) : '–'}
              </dd>
            </div>
            <div>
              <dt>Höhe</dt>
              <dd>{fmt(designHeight(design), 1)} m</dd>
            </div>
            <div>
              <dt>Teile</dt>
              <dd>
                {design.length}/{MAX_PARTS}
              </dd>
            </div>
          </dl>
          {design.length > 0 && stats.length > 1 && (
            <table class="stage-table">
              <thead>
                <tr>
                  <th>Stufe</th>
                  <th>Δv</th>
                  <th title="Schub-Gewichts-Verhältnis auf der Erde">TWR</th>
                  <th>Brennt</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.number}>
                    <td>{s.number}</td>
                    <td>{fmt(s.deltaV)}</td>
                    <td class={s.thrust > 0 && s.twrEarth < 1 ? 'weak' : ''}>
                      {s.thrust > 0 ? fmt(s.twrEarth, 2) : '–'}
                      {s.thrust > 0 && s.twrMoon >= 1 && s.twrEarth < 1 ? ' ☾' : ''}
                    </td>
                    <td>{s.burnTime > 0 ? `${fmt(s.burnTime)} s` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {problems.length > 0 && (
            <ul class="build-problems">
              {problems.map((p) => (
                <li key={p.text} class={p.level}>
                  <Icon name={p.level === 'error' ? 'fail' : 'warn'} /> {p.text}
                </li>
              ))}
            </ul>
          )}
          {lockedParts.length > 0 && (
            <p class="build-problems-note">
              🔒 Noch gesperrt: {[...new Set(lockedParts)].map((id) => part(id).name).join(', ')}.
              Mehr Punkte sammeln – oder im Sandkasten fliegen.
            </p>
          )}
          <details class="rocket-eq">
            <summary>Woher kommt das Δv?</summary>
            <p>
              Die Raketengleichung von Ziolkowski: Wie viel Geschwindigkeit eine Rakete gewinnt,
              hängt vom Triebwerk (I<sub>sp</sub>) und vom Massenverhältnis ab.
            </p>
            <Tex
              block
            >{String.raw`\Delta v = I_\text{sp}\, g_0 \ln\frac{m_\text{voll}}{m_\text{leer}}`}</Tex>
            <p>
              Weil der Logarithmus langsam wächst, lohnen sich Stufen: Leere Tanks werden
              abgeworfen, und die nächste Stufe beschleunigt weniger Masse.
            </p>
          </details>
        </div>
      </aside>
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
