import { useEffect, useMemo, useRef } from 'preact/hooks';
import { CHAPTERS, PROBLEM_QUESTION } from '../app/content';
import { MISSIONS } from '../missions/missions';
import { progressStore } from '../missions/progress';
import { Stars } from '../missions/Stars';
import { REAL_PARAMS } from '../physics';
import { drawRocket } from '../rocket/draw';
import { TEMPLATES } from '../rocket/parts';
import { Simulation } from '../sim/Simulation';
import { SpaceCanvas } from '../sim/SpaceCanvas';
import { DEFAULT_VIEW } from '../sim/view';
import { LinkButton } from '../ui/LinkButton';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { Icon } from '../ui/Icon';

/** Bild für den Hinweis auf die Raketenwerft: Rakete über dem Erdrand, Mond im Hintergrund. */
function RocketArt() {
  const [box, size] = useElementSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const { width: W, height: H } = size;
    if (!c || W === 0) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let id = 0;
    const draw = (now: number): void => {
      const ctx = prepareCanvas(c, W, H);
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        const x = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1;
        const y = (((Math.sin(i * 78.233) * 12345.678) % 1) + 1) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * (((i * 7) % 10) / 10)})`;
        ctx.fillRect(x * W, y * H * 0.8, 1.4, 1.4);
      }
      ctx.fillStyle = '#b6bbc4';
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.2, 18, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(W * 0.3, H * 2.4, H * 1.9, W * 0.3, H * 2.4, H * 2.1);
      g.addColorStop(0, '#2764b8');
      g.addColorStop(0.8, '#3f8fd8');
      g.addColorStop(1, 'rgba(120,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(W * 0.3, H * 2.4, H * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(W * 0.52, H * 0.78);
      ctx.rotate(0.5 + (calm ? 0 : 0.03 * Math.sin(now / 900)));
      const scale = (H * 0.62) / 36;
      ctx.scale(scale, -scale);
      drawRocket(ctx, TEMPLATES[2]!.parts, {
        throttle: 1,
        air: 0.1,
        chuteOpen: 0,
        time: now / 1000,
      });
      ctx.restore();
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [size]);
  return (
    <div ref={box} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}

const HERO_VIEW = { ...DEFAULT_VIEW, frame: 'rotating' as const, labels: true, trailSpan: 0 };

export function HomePage() {
  const sim = useRef<Simulation | null>(
    new Simulation({
      ...REAL_PARAMS,
      particles: { count: 160, innerKm: 60_000, outerKm: 1_400_000, retrograde: false },
    }),
  );
  const dayLabel = useRef<HTMLSpanElement>(null);
  const onFrame = (dt: number): void => {
    const s = sim.current;
    if (!s) return;
    // Ein Tag pro Sekunde; die Teilchenwolke zeigt, wo die Sonne Umlaufbahnen zerstört.
    s.advance(86_400 * dt, 20_000);
    if (s.pending) s.acknowledge();
    if (dayLabel.current) dayLabel.current.textContent = `Tag ${Math.floor(s.time / 86_400)}`;
  };
  const progress = useMemo(() => progressStore.load(), []);
  const stars = MISSIONS.reduce((s, m) => s + (progress.stars[m.id] ?? 0), 0);

  return (
    <div class="home">
      <section class="hero">
        <div class="hero-text">
          <div class="eyebrow">Seminararbeit Astronomie · Bahnstabilität</div>
          <h1 class="hero-title">Orbitlabor</h1>
          <blockquote class="problem">
            <span class="small muted">Problemfrage</span>
            <p>„{PROBLEM_QUESTION}“</p>
          </blockquote>
          <div class="btn-row">
            <LinkButton to="simulator" primary>
              Simulator starten
            </LinkButton>
            <LinkButton to="kapitel-1">Mit Kapitel 1 beginnen</LinkButton>
          </div>
        </div>
        <div class="hero-visual">
          <span class="hero-day" ref={dayLabel} aria-hidden="true">
            Tag 0
          </span>
          <SpaceCanvas
            sim={sim}
            view={HERO_VIEW}
            radius={2.1e9}
            cameraKey={0}
            onFrame={onFrame}
            shape="square"
            ariaLabel="Erde und Mond im mitrotierenden System mit einer Wolke aus Testteilchen"
          />
          <p class="small muted">
            Live-Simulation (1 Tag pro Sekunde): 160 Testteilchen um die Erde. Die Sonne (links,
            außerhalb des Bildes) entreißt alle jenseits von etwa 0,48 Hill-Radien – der Mond kreist
            weit innerhalb.
          </p>
        </div>
      </section>

      <section class="answer" aria-labelledby="kurzantwort">
        <h2 id="kurzantwort">Die Antwort in drei Sätzen</h2>
        <div class="answer-grid">
          <div class="answer-card">
            <span class="chip ok">
              <Icon name="check" /> stabil
            </span>
            <p>
              Ein Mond bleibt, solange er innerhalb von etwa <strong>0,48 Hill-Radien</strong>{' '}
              kreist (rückläufig 0,92). Unser Mond liegt bei 0,26 – das Jacobi-Kriterium beweist,
              dass er die Erdumgebung nie verlassen kann.
            </p>
            <a href="#kapitel-5">Kapitel 5 · Hill-Sphäre</a>
          </div>
          <div class="answer-card">
            <span class="chip fail">
              <Icon name="fail" /> Absturz
            </span>
            <p>
              Erst wenn er über <strong>70 % seiner Geschwindigkeit</strong> verlöre, käme er der
              Erde näher als die Roche-Grenze und würde zerrissen; bei 80 % schlüge er ein.
            </p>
            <a href="#kapitel-8">Kapitel 8 · Stabilitätsfälle</a>
          </div>
          <div class="answer-card">
            <span class="chip warn">
              <Icon name="warn" /> Flucht
            </span>
            <p>
              Entkommen würde er mit <strong>19 % mehr Tempo</strong>, auf der halben Entfernung zur
              Sonne oder bei 6,5-facher Sonnenmasse – dann öffnet sich das Tor bei L1/L2.
            </p>
            <a href="#stabilitaetskarte">Zur Stabilitätskarte</a>
          </div>
        </div>
      </section>

      <a class="rocket-banner" href="#rakete">
        <div class="stack" style={{ gap: '10px' }}>
          <div class="eyebrow" style={{ color: '#e2a846' }}>
            Neu · Spiel
          </div>
          <h2>Raketenwerft: Bau dir deinen Weg durchs Sonnensystem</h2>
          <p>
            Rakete aus Tanks, Triebwerken, Boostern und Stufen bauen, an der Raumstation andocken,
            auf dem Mond landen und zum Mars fliegen – mit echter Schwerkraft von Sonne, Planeten
            und Monden. 22 Ziele, Ränge und Lackierungen; mit Hilfe-Pilot für den Anfang.
          </p>
          <span class="btn primary" style={{ justifySelf: 'start' }}>
            Jetzt spielen <Icon name="arrow" />
          </span>
        </div>
        <RocketArt />
      </a>

      <section aria-labelledby="kapitel">
        <h2 id="kapitel">Der Weg durch die Arbeit</h2>
        <ol class="chapter-list">
          {CHAPTERS.map((c) => (
            <li key={c.n}>
              <a href={`#kapitel-${c.n}`}>
                <span class="chapter-num">{c.n}</span>
                <span>
                  <strong>{c.title}</strong>
                  <span class="small muted">{c.question}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section class="tools" aria-labelledby="werkzeuge">
        <h2 id="werkzeuge">Werkzeuge und Spiele</h2>
        <div class="grid-3">
          <a class="tool-card" href="#simulator">
            <h3>Simulator</h3>
            <p class="small muted">
              Alle Parameter frei einstellbar, drei Bezugssysteme, Messwerte, Diagramme und Export.
            </p>
          </a>
          <a class="tool-card" href="#stabilitaetskarte">
            <h3>Stabilitätskarte</h3>
            <p class="small muted">
              Tausende Simulationen als Karte: Wo bleibt der Mond, wo stürzt er ab, wo entkommt er?
            </p>
          </a>
          <a class="tool-card" href="#lagrange-labor">
            <h3>Lagrange-Labor</h3>
            <p class="small muted">
              Potentiallandschaft, Nullgeschwindigkeitskurven und Teilchen im rotierenden System.
            </p>
          </a>
          <a class="tool-card" href="#rakete">
            <h3>Raketenwerft</h3>
            <p class="small muted">
              Rakete bauen, andocken, auf Mond und Mars landen – im verkleinerten Sonnensystem mit
              echter Schwerkraft, Luftwiderstand und Hitze.
            </p>
          </a>
          <a class="tool-card" href="#spiel">
            <h3>Lunas Sternenreise</h3>
            <p class="small muted">
              Das Spiel für Jüngere: Schleudere den kleinen Mond Luna in eine Umlaufbahn und sammle
              Sterne. Sechs Level mit echter Schwerkraft.
            </p>
          </a>
          <a class="tool-card" href="#missionen">
            <h3>Missionen</h3>
            <p class="small muted">
              Neun Aufträge, darunter die Steuerung einer Sonde am instabilen Punkt L1.
            </p>
            <Stars count={Math.min(3, Math.floor(stars / 9))} />
            <span class="small muted">
              {stars} von {MISSIONS.length * 3} Sternen
            </span>
          </a>
          <a class="tool-card" href="#quiz">
            <h3>Quiz</h3>
            <p class="small muted">21 Fragen zu allen Kapiteln mit Erklärungen.</p>
          </a>
          <a class="tool-card" href="#methodik">
            <h3>Methodik & Validierung</h3>
            <p class="small muted">
              Wie genau rechnet der Simulator? Vergleich mit Messwerten und Integratoren.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
