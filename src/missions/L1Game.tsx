import { useEffect, useRef, useState } from 'preact/hooks';
import { Input } from '../engine';
import { AU, DAY, EARTH, SUN, YEAR, lagrangePoints, potentialGradient } from '../physics';
import { CanvasBox } from '../ui/CanvasBox';
import { Callout, StatusChip } from '../ui/content';
import { fmt } from '../ui/format';
import { Icon } from '../ui/Icon';
import type { SpecialMission } from './missions';
import { progressStore, recordStars } from './progress';
import { playFailure, playSuccess } from './sound';
import { StarRules } from './StarRules';
import { Stars } from './Stars';

const MU = EARTH.mass / (EARTH.mass + SUN.mass);
const L1X = lagrangePoints(MU)[0]!.x;
/** Normierte Zeiteinheit (Jahr / 2π) in Sekunden. */
const TIME_UNIT = YEAR / (2 * Math.PI);
/** Normierte Geschwindigkeitseinheit in m/s. */
const SPEED_UNIT = (2 * Math.PI * AU) / YEAR;
/** Spieltempo: normierte Zeiteinheiten pro echter Sekunde (1 Jahr ≈ 39 s). */
const TIME_SCALE = 0.16;
const THRUST = 0.03;
const FUEL = 0.05;
const ZONE = 0.0015;
const GOAL = 2 * Math.PI;
const VIEW_HALF = 0.0058;

type State = [number, number, number, number];
type Phase = 'ready' | 'playing' | 'won' | 'lost';

function deriv(s: State, ax: number, ay: number): State {
  const [gx, gy] = potentialGradient(MU, s[0], s[1]);
  return [s[2], s[3], 2 * s[3] + gx + ax, -2 * s[2] + gy + ay];
}

function step(s: State, dt: number, ax: number, ay: number): State {
  const add = (a: State, k: State, f: number): State => [
    a[0] + k[0] * f,
    a[1] + k[1] * f,
    a[2] + k[2] * f,
    a[3] + k[3] * f,
  ];
  const k1 = deriv(s, ax, ay);
  const k2 = deriv(add(s, k1, dt / 2), ax, ay);
  const k3 = deriv(add(s, k2, dt / 2), ax, ay);
  const k4 = deriv(add(s, k3, dt), ax, ay);
  return [0, 1, 2, 3].map(
    (i) => s[i]! + (dt / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!),
  ) as State;
}

function startState(): State {
  const a = Math.random() * Math.PI * 2;
  return [L1X + 3e-5 * Math.cos(a), 3e-5 * Math.sin(a), 0, 0];
}

const BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  start: ['Space', 'Enter'],
};

export function L1Game({ mission }: { mission: SpecialMission }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [best, setBest] = useState(() => progressStore.load().stars[mission.id] ?? 0);
  const [result, setResult] = useState<{ stars: number; time: number; fuel: number } | null>(null);
  const game = useRef({
    s: startState(),
    t: 0,
    fuel: FUEL,
    trail: [] as number[],
    thrust: [0, 0] as [number, number],
  });
  const touch = useRef({ left: false, right: false, up: false, down: false });
  const input = useRef(new Input(BINDINGS));
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [, setTick] = useState(0);

  useEffect(() => {
    // Nur Tastatur: Zeiger-Ereignisse laufen über die Knöpfe, daher ein unsichtbares Element.
    return input.current.attach(document.createElement('div'), () => ({ x: 0, y: 0 }));
  }, []);

  const start = (): void => {
    game.current = { s: startState(), t: 0, fuel: FUEL, trail: [], thrust: [0, 0] };
    setResult(null);
    setPhase('playing');
  };

  const end = (won: boolean): void => {
    const g = game.current;
    const used = 1 - g.fuel / FUEL;
    const stars = g.t >= GOAL ? (used < 0.5 ? 3 : 2) : g.t >= GOAL / 2 ? 1 : 0;
    setResult({ stars, time: g.t, fuel: used });
    setPhase(won ? 'won' : 'lost');
    if (stars > 0) playSuccess(stars);
    else playFailure();
    const p = recordStars(mission.id, stars, `${fmt((g.t * TIME_UNIT) / DAY)} Tage`);
    setBest(p.stars[mission.id] ?? 0);
  };

  // Spielschleife: feste Teilschritte für eine stabile Integration.
  useEffect(() => {
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dtReal = Math.min((now - last) / 1000, 0.05);
      last = now;
      const inp = input.current;
      if (phaseRef.current !== 'playing' && inp.wasPressed('start')) start();
      if (phaseRef.current === 'playing') {
        const g = game.current;
        const tp = touch.current;
        let ax =
          (inp.isDown('right') || tp.right ? 1 : 0) - (inp.isDown('left') || tp.left ? 1 : 0);
        let ay = (inp.isDown('up') || tp.up ? 1 : 0) - (inp.isDown('down') || tp.down ? 1 : 0);
        const len = Math.hypot(ax, ay);
        if (len > 0 && g.fuel > 0) {
          ax = (ax / len) * THRUST;
          ay = (ay / len) * THRUST;
        } else {
          ax = 0;
          ay = 0;
        }
        g.thrust = [ax, ay];
        const total = dtReal * TIME_SCALE;
        const sub = Math.max(1, Math.ceil(total / 0.0005));
        const dt = total / sub;
        for (let i = 0; i < sub; i++) {
          g.s = step(g.s, dt, ax, ay);
          if (ax || ay) g.fuel = Math.max(0, g.fuel - THRUST * dt);
        }
        g.t += total;
        g.trail.push(g.s[0], g.s[1]);
        if (g.trail.length > 1200) g.trail.splice(0, 2);
        const off = Math.hypot(g.s[0] - L1X, g.s[1]);
        if (off > ZONE) end(false);
        else if (g.t >= GOAL) end(true);
      }
      inp.endStep();
      setTick((t) => (t + 1) % 1_000_000);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    const g = game.current;
    ctx.fillStyle = '#060a18';
    ctx.fillRect(0, 0, w, h);
    const scale = w / 2 / VIEW_HALF;
    const toS = (x: number, y: number): [number, number] => [
      w / 2 + (x - L1X) * scale,
      h / 2 - y * scale,
    ];
    // Zielzone.
    const [cx, cy] = toS(L1X, 0);
    ctx.fillStyle = 'rgba(60, 203, 134, 0.08)';
    ctx.strokeStyle = 'rgba(60, 203, 134, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ZONE * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2c46e';
    ctx.font = '12px Jost, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L1', cx, cy - 8);
    ctx.strokeStyle = '#f2c46e';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4 + 8);
    ctx.lineTo(cx + 4, cy + 4 + 8);
    ctx.moveTo(cx + 4, cy - 4 + 8);
    ctx.lineTo(cx - 4, cy + 4 + 8);
    ctx.stroke();
    // Richtungen.
    ctx.fillStyle = '#8f99b8';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText('← zur Sonne (148 Mio. km)', 12, h - 12);
    ctx.textAlign = 'right';
    ctx.fillText('zur Erde (1,5 Mio. km) →', w - 12, h - 12);
    ctx.textBaseline = 'top';
    ctx.fillText('↑ Bahnrichtung der Erde', w - 12, 12);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    // Vorhersage ohne Schub.
    let s = g.s;
    ctx.strokeStyle = 'rgba(255, 138, 122, 0.7)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(...toS(s[0], s[1]));
    for (let i = 0; i < 120; i++) {
      s = step(s, 0.005, 0, 0);
      ctx.lineTo(...toS(s[0], s[1]));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Spur.
    ctx.strokeStyle = 'rgba(143, 227, 255, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < g.trail.length; i += 2) {
      const [x, y] = toS(g.trail[i]!, g.trail[i + 1]!);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Sonde mit Triebwerksflamme.
    const [px, py] = toS(g.s[0], g.s[1]);
    const [tx, ty] = g.thrust;
    if (tx || ty) {
      const l = Math.hypot(tx, ty);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (tx / l) * 16, py + (ty / l) * 16);
      ctx.stroke();
    }
    ctx.fillStyle = '#f5f7ff';
    ctx.fillRect(px - 5, py - 3, 10, 6);
    ctx.fillStyle = '#4c9aff';
    ctx.fillRect(px - 11, py - 2, 5, 4);
    ctx.fillRect(px + 6, py - 2, 5, 4);
  };

  const g = game.current;
  const off = Math.hypot(g.s[0] - L1X, g.s[1]);
  const vRel = Math.hypot(g.s[2], g.s[3]);
  const pad = (dir: keyof typeof touch.current, label: string, symbol: string) => (
    <button
      type="button"
      aria-label={label}
      class={touch.current[dir] ? 'active' : ''}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        touch.current[dir] = true;
      }}
      onPointerUp={() => (touch.current[dir] = false)}
      onPointerCancel={() => (touch.current[dir] = false)}
    >
      {symbol}
    </button>
  );

  return (
    <div class="sim-layout">
      <div class="sim-main">
        <div class="space" style={{ position: 'relative' }}>
          <CanvasBox
            draw={draw}
            deps={[]}
            animate
            className="l1-canvas"
            label="Sonde am Lagrange-Punkt L1"
          />
          <div class="hud hud-tl">
            <div class="hud-row">
              <span>Zeit</span>
              <span>{fmt((g.t * TIME_UNIT) / DAY)} / 365 Tage</span>
            </div>
            <div class="hud-row">
              <span>Abstand zu L1</span>
              <span>{fmt((off * AU) / 1000)} km</span>
            </div>
            <div class="hud-row">
              <span>Geschwindigkeit</span>
              <span>{fmt(vRel * SPEED_UNIT)} m/s</span>
            </div>
          </div>
          {phase !== 'playing' && (
            <div class="result-card" role="status">
              {result ? (
                <>
                  <div class="row" style={{ justifyContent: 'space-between' }}>
                    <Stars count={result.stars} size={26} />
                    <StatusChip status={result.stars > 0 ? 'ok' : 'fail'}>
                      {phase === 'won' ? 'Jahr geschafft' : 'Zone verlassen'}
                    </StatusChip>
                  </div>
                  <p>
                    Gehalten: {fmt((result.time * TIME_UNIT) / DAY)} Tage · Treibstoff verbraucht:{' '}
                    {fmt(result.fuel * 100)} %
                  </p>
                </>
              ) : (
                <p>
                  Steuere mit den Pfeiltasten (oder WASD bzw. den Knöpfen). Die rote Linie zeigt,
                  wohin die Sonde ohne Schub driftet. Leertaste oder „Start“ beginnt.
                </p>
              )}
              <div class="btn-row">
                <button type="button" class="btn primary" onClick={start}>
                  <Icon name="play" filled /> {result ? 'Nochmal' : 'Start'}
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
          <h3>Triebwerk</h3>
          <div class="pad-buttons">
            <span />
            {pad('up', 'Schub nach oben', '▲')}
            <span />
            {pad('left', 'Schub nach links', '◀')}
            {pad('down', 'Schub nach unten', '▼')}
            {pad('right', 'Schub nach rechts', '▶')}
          </div>
          <div class="field">
            <div class="field-head">
              <span class="field-label">Treibstoff</span>
              <span class="field-value">{fmt((g.fuel / FUEL) * 100)} %</span>
            </div>
            <div class="meter">
              <div style={{ width: `${(g.fuel / FUEL) * 100}%` }} />
            </div>
          </div>
          <p class="small muted">
            Tipp: Gib nur Schub, wenn die rote Vorhersagelinie die Zone verlässt – und zwar entgegen
            der Stelle, an der sie hinausläuft. Kurze Stöße sparen Treibstoff; die Coriolis-Kraft
            lenkt jeden Schub etwas zur Seite.
          </p>
        </section>
        <section class="panel panel-pad">
          <h3>Auftrag</h3>
          <p class="small">{mission.goal}</p>
          <StarRules rules={mission.starRules} stars={best} />
        </section>
      </aside>
    </div>
  );
}
