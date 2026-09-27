import { useEffect, useRef, useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { playFailure, playSuccess, sound } from '../missions/sound';
import { Stars } from '../missions/Stars';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { Icon } from '../ui/Icon';
import {
  EARTH,
  HEIGHT,
  LEVELS,
  LUNA_R,
  MAX_LAUNCH,
  STAR_R,
  WIDTH,
  buddyPosition,
  collision,
  starsFor,
  step,
  type Crash,
  type Level,
  type State,
} from './levels';

type Phase = 'aim' | 'fly' | 'win' | 'fail';

const PULL = 2.2;
const FAIL_TEXT: Record<Exclude<Crash, null> | 'timeout', string> = {
  earth: 'Plumps! Luna ist auf die Erde gefallen. Gib ihr mehr Schwung zur Seite!',
  rock: 'Autsch, ein Felsbrocken! Versuch eine andere Bahn.',
  buddy: 'Bumm! Luna und Pip sind zusammengestoßen.',
  lost: 'Tschüss, Luna! Sie war zu schnell und ist ins Weltall geflogen. Etwas weniger Schwung!',
  timeout: 'Fast! Ein paar Sterne fehlen noch. Probier eine etwas andere Bahn.',
};

/** Pseudozufällige, aber feste Hintergrundsterne. */
const BG = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number): number =>
    (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  return { x: r(1) * WIDTH, y: r(2) * HEIGHT, s: 0.6 + r(3) * 1.6, p: r(4) * 6 };
});

function starShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  R: number,
  rot: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * 0.45;
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function LunaGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level: Level = LEVELS[levelIndex]!;
  const [phase, setPhase] = useState<Phase>('aim');
  const [message, setMessage] = useState('');
  const [tries, setTries] = useState(0);
  const [help, setHelp] = useState(false);
  const [earned, setEarned] = useState<Record<string, number>>(() => progressStore.load().kids);
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef({
    s: { ...level.start, vx: 0, vy: 0, t: 0 },
    stars: starsFor(level),
    got: new Set<number>(),
    trail: [] as number[],
    aim: null as null | { x: number; y: number },
    angle: 0,
    prevAngle: 0,
    flash: 0,
  });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const levelRef = useRef(level);
  levelRef.current = level;
  const helpRef = useRef(help);
  helpRef.current = help;

  const reset = (lv: Level = level): void => {
    game.current = {
      s: { ...lv.start, vx: 0, vy: 0, t: 0 },
      stars: starsFor(lv),
      got: new Set(),
      trail: [],
      aim: null,
      angle: 0,
      prevAngle: Math.atan2(lv.start.y - EARTH.y, lv.start.x - EARTH.x),
      flash: 0,
    };
    setPhase('aim');
    setMessage('');
  };

  useEffect(() => {
    reset(level);
    setTries(0);
    setHelp(false);
  }, [levelIndex]);

  const finish = (won: boolean, text: string): void => {
    setPhase(won ? 'win' : 'fail');
    setMessage(text);
    if (won) {
      const stars = tries <= 2 ? 3 : tries <= 4 ? 2 : 1;
      playSuccess(stars);
      const p = progressStore.update((prev) => ({
        ...prev,
        kids: { ...prev.kids, [level.id]: Math.max(prev.kids[level.id] ?? 0, stars) },
      }));
      setEarned(p.kids);
    } else {
      playFailure();
    }
  };

  // Spielschleife.
  useEffect(() => {
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = game.current;
      const lv = levelRef.current;
      if (phaseRef.current === 'fly') {
        const steps = Math.round(dt / (1 / 240)) || 1;
        for (let k = 0; k < steps && phaseRef.current === 'fly'; k++) {
          g.s = step(lv, g.s);
          g.stars.forEach((st, i) => {
            if (!g.got.has(i) && Math.hypot(g.s.x - st.x, g.s.y - st.y) < STAR_R + LUNA_R) {
              g.got.add(i);
              g.flash = 1;
              sound.tone(660 + g.got.size * 90, 0.12, 'triangle', 0.12);
            }
          });
          if (g.got.size === g.stars.length) {
            finish(true, `Super! Alle ${g.stars.length} Sterne eingesammelt!`);
            phaseRef.current = 'win';
            break;
          }
          const c = collision(lv, g.s);
          if (c) {
            finish(false, FAIL_TEXT[c]);
            phaseRef.current = 'fail';
            break;
          }
          const a = Math.atan2(g.s.y - EARTH.y, g.s.x - EARTH.x);
          let d = a - g.prevAngle;
          if (d > Math.PI) d -= 2 * Math.PI;
          if (d < -Math.PI) d += 2 * Math.PI;
          g.angle += d;
          g.prevAngle = a;
          if (Math.abs(g.angle) > lv.maxLaps * 2 * Math.PI) {
            finish(false, FAIL_TEXT.timeout);
            phaseRef.current = 'fail';
            break;
          }
        }
        g.trail.push(g.s.x, g.s.y);
        if (g.trail.length > 600) g.trail.splice(0, 2);
      }
      g.flash = Math.max(0, g.flash - dt * 2);
      draw(now / 1000);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  });

  const scale = size.width / WIDTH;

  function draw(time: number): void {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const ctx = prepareCanvas(canvas, size.width, size.width * (HEIGHT / WIDTH));
    if (!ctx) return;
    ctx.scale(scale, scale);
    const g = game.current;
    const lv = levelRef.current;

    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, '#1b1450');
    bg.addColorStop(1, '#0a1a3f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const b of BG) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 2 + b.p);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (lv.tide) {
      // Sonne am linken Rand.
      const sg = ctx.createRadialGradient(-40, EARTH.y, 10, -40, EARTH.y, 120);
      sg.addColorStop(0, '#ffe27a');
      sg.addColorStop(1, 'rgba(255, 180, 60, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, EARTH.y - 140, 90, 280);
      ctx.fillStyle = '#fff3c2';
      ctx.font = 'bold 14px Jost, system-ui, sans-serif';
      ctx.fillText('Sonne', 8, EARTH.y - 70);
    }

    // Hilfe: Lösungsbahn ganz blass.
    if (helpRef.current && phaseRef.current === 'aim') {
      drawPath(ctx, lv, lv.solution.vx, lv.solution.vy, 1400, 'rgba(255, 255, 255, 0.18)');
    }

    // Erde mit Gesicht.
    ctx.fillStyle = '#3f8cff';
    ctx.beginPath();
    ctx.arc(EARTH.x, EARTH.y, EARTH.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4fd07a';
    for (const [dx, dy, r] of [
      [-14, -12, 12],
      [12, 8, 14],
      [-4, 20, 8],
    ] as const) {
      ctx.beginPath();
      ctx.arc(EARTH.x + dx, EARTH.y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#10204a';
    ctx.beginPath();
    ctx.arc(EARTH.x - 11, EARTH.y - 6, 4, 0, Math.PI * 2);
    ctx.arc(EARTH.x + 11, EARTH.y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10204a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(EARTH.x, EARTH.y + 4, 11, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Felsen.
    for (const r of lv.rocks) {
      ctx.fillStyle = '#8a6a52';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const rr = r.r * (0.82 + 0.18 * Math.sin(i * 2.3 + r.x));
        ctx.lineTo(r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6d5240';
      ctx.beginPath();
      ctx.arc(r.x - r.r * 0.25, r.y - r.r * 0.2, r.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sterne.
    g.stars.forEach((st, i) => {
      if (g.got.has(i)) return;
      ctx.fillStyle = '#ffd54a';
      ctx.shadowColor = '#ffd54a';
      ctx.shadowBlur = 12;
      starShape(ctx, st.x, st.y, STAR_R, time * 1.5 + i);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Pip.
    const b = buddyPosition(lv, g.s.t);
    if (b && lv.buddy) {
      ctx.fillStyle = '#ff9fc2';
      ctx.beginPath();
      ctx.arc(b.x, b.y, lv.buddy.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a1830';
      ctx.beginPath();
      ctx.arc(b.x - 3, b.y - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(b.x + 3, b.y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd6e7';
      ctx.font = 'bold 12px Jost, system-ui, sans-serif';
      ctx.fillText('Pip', b.x + 12, b.y - 8);
    }

    // Spur.
    for (let i = 0; i < g.trail.length; i += 2) {
      ctx.globalAlpha = (i / g.trail.length) * 0.7;
      ctx.fillStyle = '#c9d6ff';
      ctx.beginPath();
      ctx.arc(g.trail[i]!, g.trail[i + 1]!, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Zielen: Gummiband und Vorschau.
    if (phaseRef.current === 'aim' && g.aim) {
      const v = launchVelocity(g.s, g.aim);
      drawPath(ctx, lv, v.vx, v.vy, lv.preview, 'rgba(255, 255, 255, 0.75)');
      ctx.strokeStyle = '#ff8fb1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(g.s.x, g.s.y);
      ctx.lineTo(g.aim.x, g.aim.y);
      ctx.stroke();
      const power = Math.hypot(v.vx, v.vy) / MAX_LAUNCH;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Jost, system-ui, sans-serif';
      ctx.fillText(`Schwung: ${Math.round(power * 100)} %`, g.aim.x + 12, g.aim.y + 4);
    }

    // Luna.
    const { x, y, vx, vy } = g.s;
    const glow = g.flash;
    if (glow > 0) {
      ctx.fillStyle = `rgba(255, 230, 120, ${glow * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, LUNA_R + 14 * glow, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e3e6ee';
    ctx.beginPath();
    ctx.arc(x, y, LUNA_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b9bfcc';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, 2.5, 0, Math.PI * 2);
    ctx.arc(x - 6, y + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    const sp = Math.hypot(vx, vy) || 1;
    const lx = phaseRef.current === 'fly' ? (vx / sp) * 1.6 : 0;
    const ly = phaseRef.current === 'fly' ? (vy / sp) * 1.6 : 0;
    ctx.fillStyle = '#1b1450';
    ctx.beginPath();
    ctx.arc(x - 4 + lx, y - 3 + ly, 1.9, 0, Math.PI * 2);
    ctx.arc(x + 4 + lx, y - 3 + ly, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 170, 0.6)';
    ctx.beginPath();
    ctx.arc(x - 7, y + 2, 2, 0, Math.PI * 2);
    ctx.arc(x + 7, y + 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Anzeige.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Jost, system-ui, sans-serif';
    ctx.fillText(`★ ${g.got.size} / ${g.stars.length}`, 16, 30);
    if (phaseRef.current === 'aim' && !g.aim) {
      ctx.font = '15px Jost, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('Luna antippen, nach hinten ziehen, loslassen!', x - 150, y - 26);
    }
  }

  const toGame = (e: PointerEvent): { x: number; y: number } => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * WIDTH,
      y: ((e.clientY - r.top) / r.height) * HEIGHT,
    };
  };

  const onDown = (e: PointerEvent): void => {
    if (phaseRef.current !== 'aim') return;
    sound.unlock();
    const p = toGame(e);
    const g = game.current;
    if (Math.hypot(p.x - g.s.x, p.y - g.s.y) > 70) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    g.aim = p;
  };
  const onMove = (e: PointerEvent): void => {
    if (game.current.aim) game.current.aim = toGame(e);
  };
  const onUp = (): void => {
    const g = game.current;
    if (!g.aim || phaseRef.current !== 'aim') return;
    const v = launchVelocity(g.s, g.aim);
    g.aim = null;
    if (Math.hypot(v.vx, v.vy) < 15) return;
    g.s = { ...g.s, vx: v.vx, vy: v.vy };
    setTries((t) => t + 1);
    setPhase('fly');
  };

  const total = LEVELS.reduce((s, l) => s + (earned[l.id] ?? 0), 0);

  return (
    <div class="stack" style={{ gap: '14px' }}>
      <div class="level-row" role="tablist" aria-label="Level">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={i === levelIndex}
            class={`level-btn ${i === levelIndex ? 'on' : ''}`}
            onClick={() => setLevelIndex(i)}
          >
            <span class="level-num">{l.id}</span>
            <Stars count={earned[l.id] ?? 0} size={12} label={false} />
          </button>
        ))}
        <span class="small muted" style={{ marginLeft: 'auto' }}>
          {total} von {LEVELS.length * 3} Sternen
        </span>
      </div>

      <div class="kid-bubble">
        <strong>
          Level {level.id}: {level.name}
        </strong>
        <p>{level.intro}</p>
      </div>

      <div ref={wrapRef} class="kid-stage" style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: `${size.width * (HEIGHT / WIDTH)}px`,
            display: 'block',
            touchAction: 'none',
            borderRadius: '18px',
          }}
          role="img"
          aria-label="Spielfeld: Luna, die Erde und Sterne"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {(phase === 'win' || phase === 'fail') && (
          <div class="kid-result" role="status">
            {phase === 'win' && <Stars count={tries <= 2 ? 3 : tries <= 4 ? 2 : 1} size={34} />}
            <p class="kid-result-text">{message}</p>
            {phase === 'win' && (
              <p class="kid-fact">
                <strong>Wusstest du? </strong>
                {level.fact}
              </p>
            )}
            <div class="btn-row" style={{ justifyContent: 'center' }}>
              <button type="button" class="btn" onClick={() => reset()}>
                <Icon name="reset" /> Nochmal
              </button>
              {phase === 'win' && levelIndex < LEVELS.length - 1 && (
                <button
                  type="button"
                  class="btn primary"
                  onClick={() => setLevelIndex(levelIndex + 1)}
                >
                  Nächstes Level <Icon name="arrow" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div class="btn-row">
        <button type="button" class="btn" onClick={() => reset()} disabled={phase === 'aim'}>
          <Icon name="reset" /> Neu starten
        </button>
        <button type="button" class="btn ghost" onClick={() => setHelp((h) => !h)}>
          {help ? 'Hilfe ausblenden' : 'Hilfe: Wo geht es lang?'}
        </button>
        <span class="small muted">Versuche: {tries}</span>
      </div>
    </div>
  );
}

function launchVelocity(s: State, aim: { x: number; y: number }): { vx: number; vy: number } {
  let vx = (s.x - aim.x) * PULL;
  let vy = (s.y - aim.y) * PULL;
  const v = Math.hypot(vx, vy);
  if (v > MAX_LAUNCH) {
    vx *= MAX_LAUNCH / v;
    vy *= MAX_LAUNCH / v;
  }
  return { vx, vy };
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  lv: Level,
  vx: number,
  vy: number,
  steps: number,
  color: string,
): void {
  let s: State = { ...lv.start, vx, vy, t: 0 };
  ctx.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    s = step(lv, s);
    if (collision(lv, s)) break;
    if (i % 10 === 0) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
