import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { Tex } from '../ui/content';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Icon, type IconName } from '../ui/Icon';
import { CHALLENGES, type Challenge, type ChallengeGroup } from './challenges';
import { PAINTS, boosterPod, drawPart, drawRocket, setPaint, visualWidth } from './draw';
import {
  START_GROUPS,
  START_OPTIONS,
  THRUST_FACTORS,
  buildRules,
  type SandboxSettings,
  type StartId,
} from './sandbox';
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
  isPart,
  unlocked,
  type BuildRules,
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
  { dv: 7000, label: 'Ceres-Landung' },
  { dv: 7800, label: 'Marslandung' },
  { dv: 9500, label: 'Europa- oder Ganymed-Landung' },
  { dv: 10_500, label: 'Merkurlandung' },
  { dv: 10_800, label: 'Mars: landen & zurück' },
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
    const extra = def.kind === 'booster' ? boosterPod(def).rise + 0.4 : 0;
    const h = def.height + below + extra;
    const wide = visualWidth(def);
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
  rules,
}: {
  design: Design;
  selected: number;
  onSelect: (i: number) => void;
  rules?: BuildRules;
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
    // Mit gewähltem Teil steht unten die Werkzeugleiste: dann die Rakete darüber zeichnen.
    const base = height - (selected >= 0 ? 92 : 44);
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
      const st = stageStats(design, rules);
      const maxW = Math.max(...design.map((id) => visualWidth(part(id))));
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
        if (dv > 0 && Number.isFinite(dv) && y1 - y0 > 26) {
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
      // Wie gezeichnet: Booster sitzen seitlich und sind breiter als ihr Rumpfmaß.
      const w = visualWidth(part(design[selected]!));
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
      ctx.fillText('Wähle ein Bauteil aus der Liste –', cx, height / 2 - 12);
      ctx.fillText('oder oben eine Vorlage.', cx, height / 2 + 12);
    }
  }, [design, selected, size, rules?.thrust, rules?.infiniteFuel]);

  const click = (e: MouseEvent): void => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const { scale, base, spans } = layout.current;
    const m = (base - (e.clientY - r.top)) / scale;
    const x = Math.abs(e.clientX - r.left - r.width / 2) / scale;
    const hit = spans.findIndex(
      (s, i) => s && m >= s[0] && m <= s[1] && x <= visualWidth(part(design[i]!)) / 2 + 1.5,
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
        aria-label={label}
        title={label}
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
  { id: 'aero', label: 'Aero', kinds: ['nose', 'chute', 'airbrake', 'shield'] },
  {
    id: 'technik',
    label: 'Technik',
    kinds: ['decoupler', 'legs', 'wheel', 'rcs', 'solar', 'light'],
  },
];

/** Gespeicherte Raketen prüfen: unbekannte Teile oder kaputte Einträge fallen weg. */
function loadHangar(): Record<string, string[]> {
  const raw: unknown = progressStore.load().rocketHangar;
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, string[]> = {};
  for (const [n, d] of Object.entries(raw as Record<string, unknown>))
    if (Array.isArray(d) && d.length > 0 && d.every((id) => typeof id === 'string' && isPart(id)))
      out[n] = d as string[];
  return out;
}

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
  sandboxSettings,
  onSandboxSettings,
  onClose,
  onResetCareer,
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
  sandboxSettings: SandboxSettings;
  onSandboxSettings: (s: SandboxSettings) => void;
  onClose: () => void;
  onResetCareer: () => void;
}) {
  setPaint(paint);
  const points = careerPoints(goals, stars);
  const starSum = Object.values(stars).reduce((a, b) => a + b, 0);
  const rank = rankFor(points);
  const problems = checkDesign(design, sandbox ? buildRules(sandboxSettings) : undefined);
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
              aria-label={t.meta ? `${t.label} (${t.meta})` : t.label}
              title={t.label}
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
          settings={sandboxSettings}
          onSettings={onSandboxSettings}
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
                sandbox={sandbox}
                onReset={onResetCareer}
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
  settings,
  onSettings,
}: {
  design: Design;
  points: number;
  problems: ReturnType<typeof checkDesign>;
  lockedParts: string[];
  onChange: (d: Design) => void;
  sandbox: boolean;
  onSandbox: (on: boolean) => void;
  settings: SandboxSettings;
  onSettings: (s: SandboxSettings) => void;
}) {
  const [selected, setSelected] = useState(-1);
  const [cat, setCat] = useState(CATEGORIES[0]!.id);
  const [statsOpen, setStatsOpen] = useState(false);
  const [hangar, setHangar] = useState<Record<string, string[]>>(loadHangar);
  const [name, setName] = useState('');
  /** Name, der auf ein zweites Tippen wartet (Überschreiben bzw. Löschen). */
  const [confirmSave, setConfirmSave] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const saveHangar = (next: Record<string, string[]>): boolean => {
    setHangar(next);
    progressStore.update((p) => ({ ...p, rocketHangar: next }));
    return progressStore.lastSaveOk;
  };
  // Rückgängig: die letzten Baustände (Strg+Z oder Knopf).
  const history = useRef<Design[]>([]);
  const commit = (next: Design): void => {
    history.current = [...history.current.slice(-39), design];
    onChange(next);
  };
  const undo = (): void => {
    const prev = history.current.pop();
    if (!prev) return;
    onChange(prev);
    setSelected(-1);
    setLockHint('Rückgängig gemacht.');
  };
  // Im Sandkasten gelten Schubfaktor, Treibstoff-Schalter und Startort auch für die Werte hier.
  const rules = sandbox ? buildRules(settings) : undefined;
  const home = rules?.body ?? bodyById('earth');
  const stats = stageStats(design.length ? design : ['kapsel'], rules);
  const dv = design.length ? totalDeltaV(design, rules) : 0;
  const earthStart = !sandbox || settings.start === 'rampe';
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
    if (design.length >= MAX_PARTS) {
      setLockHint(`Mehr als ${MAX_PARTS} Teile passen nicht auf die Startrampe.`);
      return;
    }
    setLockHint('');
    const at = selected >= 0 ? selected + 1 : design.length;
    const next = [...design.slice(0, at), id, ...design.slice(at)];
    commit(next);
    setSelected(at);
  };
  const move = (dir: -1 | 1): void => {
    const j = selected + dir;
    if (selected < 0 || j < 0 || j >= design.length) return;
    const next = [...design];
    [next[selected], next[j]] = [next[j]!, next[selected]!];
    commit(next);
    setSelected(j);
  };
  const remove = (): void => {
    if (selected < 0) return;
    commit(design.filter((_, i) => i !== selected));
    setSelected(Math.min(selected, design.length - 2));
  };
  const load = (d: readonly string[]): void => {
    commit([...d]);
    setSelected(-1);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Nur, wenn nichts Bestimmtes den Fokus hat (oder die Bauansicht selbst).
      const el = e.target as HTMLElement | null;
      const free = !el || el === document.body || el.classList.contains('game');
      if (!free && !el.closest('.blueprint')) return;
      if (el?.closest('button, a, input, select, textarea, [role="menu"], .gmenu')) return;
      e.preventDefault();
      remove();
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
        <p class={`parts-hint ${lockHint ? 'msg' : ''}`} aria-live="polite">
          {lockHint ||
            (sandbox
              ? 'Sandkasten: alle Teile, Vorlagen und Lackierungen frei – dafür keine Punkte.'
              : selected >= 0
                ? 'Neue Teile kommen unter das markierte Teil.'
                : 'Ein Teil antippen oder anklicken – es kommt unten an die Rakete.')}
        </p>
      </aside>

      <section class="blueprint" aria-label="Rakete">
        <div class="blueprint-tools">
          <Menu icon="stack" label="Vorlagen">
            {(close) =>
              TEMPLATES.map((t) => {
                const lockedIds = [
                  ...new Set(t.parts.filter((id) => !unlocked(id, points, sandbox))),
                ];
                const stages = segments(t.parts).length;
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
                      {lockedIds.length ? '🔒 ' : ''}
                      {t.name}
                    </strong>
                    <span>{t.info}</span>
                    <span class="gmenu-meta">
                      Δv {fmt(totalDeltaV(t.parts))} m/s · {stages}{' '}
                      {stages === 1 ? 'Stufe' : 'Stufen'} · {t.parts.length} Teile
                    </span>
                    {lockedIds.length > 0 && (
                      <span class="gmenu-meta locked">
                        Gesperrt: {lockedIds.map((id) => part(id).name).join(', ')}
                      </span>
                    )}
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
                      class={`gbtn small ${confirmDelete === n ? 'danger' : 'icon'}`}
                      aria-label={confirmDelete === n ? `${n} wirklich löschen` : `${n} löschen`}
                      onClick={() => {
                        if (confirmDelete !== n) {
                          setConfirmDelete(n);
                          return;
                        }
                        const next = { ...hangar };
                        delete next[n];
                        setConfirmDelete('');
                        setLockHint(
                          saveHangar(next)
                            ? `„${n}“ aus dem Hangar gelöscht.`
                            : 'Löschen nicht möglich – der Browser erlaubt keinen Speicher.',
                        );
                      }}
                    >
                      <Icon name="trash" />
                      {confirmDelete === n && ' Löschen?'}
                    </button>
                  </div>
                ))}
                <form
                  class="gmenu-save"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = name.trim();
                    if (!n || design.length === 0) return;
                    if (hangar[n] && confirmSave !== n) {
                      // Gleicher Name: erst beim zweiten Mal überschreiben.
                      setConfirmSave(n);
                      setLockHint(`„${n}“ gibt es schon – noch einmal tippen überschreibt sie.`);
                      return;
                    }
                    setConfirmSave('');
                    setLockHint(
                      saveHangar({ ...hangar, [n]: [...design] })
                        ? `„${n}“ im Hangar gespeichert.`
                        : 'Speichern nicht möglich – der Browser erlaubt keinen Speicher.',
                    );
                  }}
                >
                  <input
                    type="text"
                    maxLength={24}
                    placeholder="Name der Rakete"
                    aria-label="Name der Rakete"
                    value={name}
                    onInput={(e) => {
                      setName((e.target as HTMLInputElement).value);
                      setConfirmSave('');
                    }}
                  />
                  <button
                    type="submit"
                    class="gbtn primary small"
                    disabled={!name.trim() || design.length === 0}
                  >
                    <Icon name="save" />{' '}
                    {confirmSave && confirmSave === name.trim() ? 'Überschreiben' : 'Speichern'}
                  </button>
                </form>
              </>
            )}
          </Menu>
          <button
            type="button"
            class="gbtn"
            disabled={history.current.length === 0}
            onClick={undo}
            aria-label="Rückgängig"
            title="Rückgängig (Strg+Z)"
          >
            <Icon name="rotl" />
            <span class="gbtn-label">Zurück</span>
          </button>
          <button
            type="button"
            class="gbtn"
            disabled={design.length === 0}
            onClick={() => {
              load([]);
              setLockHint('Rakete abgebaut – „Zurück“ (Strg+Z) holt sie wieder.');
            }}
            aria-label="Ganze Rakete abbauen"
            title="Alle Teile entfernen (mit „Zurück“ rückgängig)"
          >
            <Icon name="close" />
            <span class="gbtn-label">Abbauen</span>
          </button>
          <label
            class={`gtoggle ${sandbox ? 'on' : ''}`}
            title="Sandkasten: alle Teile frei und eigene Regeln (Treibstoff, Schub, Startort) – dafür keine Punkte"
          >
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(e) => onSandbox((e.target as HTMLInputElement).checked)}
            />
            <span class="gtoggle-knob" aria-hidden="true" />
            Sandkasten
          </label>
          {sandbox && (
            <Menu icon="sliders" label="Einstellungen">
              {() => <SandboxPanel settings={settings} onChange={onSettings} />}
            </Menu>
          )}
        </div>

        <Preview design={design} selected={selected} onSelect={setSelected} rules={rules} />

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
            TWR <strong>{first && first.thrust > 0 ? fmt(first.twrStart, 2) : '–'}</strong>
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
            {earthStart &&
              MILESTONES.map((m) => (
                <span
                  key={m.label}
                  class={`dv-mark ${dv >= m.dv ? 'ok' : ''}`}
                  style={{ left: `${(m.dv / maxBar) * 100}%` }}
                />
              ))}
          </div>
          {rules?.infiniteFuel ? (
            <p class="small muted">Sandkasten: Der Treibstoff geht nie aus – Δv ohne Grenze.</p>
          ) : earthStart ? (
            <ul class="dv-list">
              {MILESTONES.map((m) => (
                <li key={m.label} class={dv >= m.dv ? 'ok' : ''}>
                  <span aria-hidden="true">{dv >= m.dv ? '✓' : '·'}</span> {m.label}
                  <span class="dv-need">{fmt(m.dv)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="small muted">
              Die Richtwerte (Umlaufbahn, Mond …) gelten für einen Start von der Erde.
            </p>
          )}
          <dl class="stat-grid">
            <div>
              <dt>Masse</dt>
              <dd>{fmt(mass / 1000, 1)} t</dd>
            </div>
            <div>
              <dt title={`Schub-Gewichts-Verhältnis beim Start (${home.name})`}>TWR</dt>
              <dd class={first && first.thrust > 0 && first.twrStart < 1 ? 'weak' : ''}>
                {first && first.thrust > 0 ? fmt(first.twrStart, 2) : '–'}
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
                  <th title={`Schub-Gewichts-Verhältnis (${home.name})`}>TWR</th>
                  <th>Brenndauer</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.number}>
                    <td>{s.number}</td>
                    <td>{fmt(s.deltaV)}</td>
                    <td class={s.thrust > 0 && s.twrStart < 1 ? 'weak' : ''}>
                      {s.thrust > 0 ? fmt(s.twrStart, 2) : '–'}
                      {home.id === 'earth' && s.thrust > 0 && s.twrMoon >= 1 && s.twrEarth < 1
                        ? ' ☾'
                        : ''}
                    </td>
                    <td>{s.burnTime > 0 ? `${fmt(s.burnTime)} s` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {design.length > 0 &&
            stats.length > 1 &&
            home.id === 'earth' &&
            stats.some((s) => s.thrust > 0 && s.twrMoon >= 1 && s.twrEarth < 1) && (
              <p class="small muted">
                ☾ = zu schwach für die Erde, reicht aber für den Mond (TWR über 1 bei
                Mondschwerkraft).
              </p>
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

function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label class={`gswitch ${on ? 'on' : ''}`}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span class="gswitch-text">
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
      <span class="gtoggle-knob" aria-hidden="true" />
    </label>
  );
}

/** Regeln und Startort des Sandkastens. */
function SandboxPanel({
  settings,
  onChange,
}: {
  settings: SandboxSettings;
  onChange: (s: SandboxSettings) => void;
}) {
  const set = (patch: Partial<SandboxSettings>): void => onChange({ ...settings, ...patch });
  return (
    <div class="sandbox-panel">
      <label class="sb-field">
        <span>Startort</span>
        <select
          value={settings.start}
          onChange={(e) => set({ start: (e.target as HTMLSelectElement).value as StartId })}
        >
          {START_GROUPS.map((g) => (
            <optgroup key={g} label={g}>
              {START_OPTIONS.filter((o) => o.group === g).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div class="sb-field">
        <span>Schub der Triebwerke</span>
        <div class="sb-seg" role="radiogroup" aria-label="Schubfaktor">
          {THRUST_FACTORS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={settings.thrust === k}
              class={settings.thrust === k ? 'on' : ''}
              onClick={() => set({ thrust: k })}
            >
              {k}×
            </button>
          ))}
        </div>
      </div>
      <Switch
        label="Unendlich Treibstoff"
        hint="Die Tanks werden nie leer."
        on={settings.fuel}
        onChange={(fuel) => set({ fuel })}
      />
      <Switch
        label="Unzerstörbar"
        hint="Kein Absturz, kein Verglühen – jede Berührung ist eine Landung."
        on={settings.indestructible}
        onChange={(indestructible) => set({ indestructible })}
      />
      <Switch
        label="Hitze beim Wiedereintritt"
        hint="Aus: Die Rakete wird in der Luft nicht heiß."
        on={settings.heat}
        onChange={(heat) => set({ heat })}
      />
      <Switch
        label="Luftwiderstand"
        hint="Aus: Die Luft bremst die Rakete nicht (Fallschirme wirken weiter)."
        on={settings.drag}
        onChange={(drag) => set({ drag })}
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
  const records = progressStore.load().rocketChallenges ?? {};
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
                  <div class="challenge-stars" role="img" aria-label={`${n} von 3 Sternen`}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} class={i < n ? 'on' : ''}>
                        ★
                      </span>
                    ))}
                  </div>
                  <h4>{c.title}</h4>
                  <p class="small challenge-brief">{c.brief}</p>
                  <p class="small muted">
                    {c.computer ? 'Bordcomputer erlaubt' : 'Ohne Bordcomputer'}
                  </p>
                  {records[c.id]?.text && (
                    <p class="challenge-best">Bestes Ergebnis: {records[c.id]!.text}</p>
                  )}
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
  sandbox,
  onReset,
}: {
  goals: readonly string[];
  stars: Record<string, number>;
  paint: string;
  onPaint: (id: string) => void;
  satellites: Satellite[];
  onSatellites: (s: Satellite[]) => void;
  sandbox: boolean;
  onReset: () => void;
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
                <li key={q.id} class={goals.includes(q.id) ? 'done' : ''}>
                  <span aria-hidden="true">{goals.includes(q.id) ? '★' : '☆'}</span>
                  <span class="mc-goal">
                    {q.title}
                    <small>{q.text}</small>
                  </span>
                  <span class="pts">{q.points}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {[false, true].map((sb) => {
        const list = satellites.filter((q) => !!q.sandbox === sb);
        if (list.length === 0) return null;
        return (
          <div key={String(sb)} class="mc-sats">
            <h4>
              {sb ? 'Satelliten aus dem Sandkasten' : 'Deine Satelliten'} ({list.length})
            </h4>
            {sb && (
              <p class="small muted">
                Sie kreisen nur in Sandkasten-Flügen und bringen keine Punkte.
              </p>
            )}
            <ul>
              {list.map((s) => {
                const b = bodyById(s.body);
                const { peri, apo } = apsides(s.el);
                return (
                  <li key={s.id}>
                    🛰 {s.name} · um {b.name} · {km(peri - b.radius)} – {km(apo - b.radius)}
                    <ConfirmButton
                      class="btn small ghost"
                      label="Abschalten"
                      confirm="Wirklich?"
                      onConfirm={() => onSatellites(satellites.filter((q) => q !== s))}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div class="mc-paints" role="radiogroup" aria-label="Lackierung">
        <span class="small muted">Lackierung:</span>
        {PAINTS.map((p) => {
          const locked = !sandbox && points < p.points;
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
              {locked ? `🔒 ${p.name} · ab ${p.points} Punkten` : p.name}
            </button>
          );
        })}
      </div>
      <div class="mc-reset">
        <p class="small muted">
          Neu anfangen: Punkte, Sterne, Satelliten und Spielstände der Raketenwerft werden gelöscht.
          Deine Raketen im Hangar bleiben.
        </p>
        <ConfirmButton
          class="btn small"
          label="Karriere zurücksetzen"
          confirm="Wirklich alles löschen?"
          onConfirm={onReset}
        />
      </div>
    </section>
  );
}
