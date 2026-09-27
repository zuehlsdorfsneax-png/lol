import { useMemo, useRef } from 'preact/hooks';
import { CHAPTERS, PROBLEM_QUESTION } from '../app/content';
import { MISSIONS } from '../missions/missions';
import { progressStore } from '../missions/progress';
import { Stars } from '../missions/Stars';
import { REAL_PARAMS } from '../physics';
import { Simulation } from '../sim/Simulation';
import { SpaceCanvas } from '../sim/SpaceCanvas';
import { DEFAULT_VIEW } from '../sim/view';
import { LinkButton } from '../ui/content';
import { Icon } from '../ui/Icon';

const HERO_VIEW = { ...DEFAULT_VIEW, frame: 'rotating' as const, labels: true, trailSpan: 0 };

export function HomePage() {
  const sim = useRef<Simulation | null>(
    new Simulation({
      ...REAL_PARAMS,
      particles: { count: 160, innerKm: 60_000, outerKm: 1_400_000, retrograde: false },
    }),
  );
  const onFrame = (dt: number): void => {
    // Ein Tag pro Sekunde; die Teilchenwolke zeigt, wo die Sonne Umlaufbahnen zerstört.
    sim.current?.advance(86_400 * dt, 3000);
    if (sim.current?.pending) sim.current.acknowledge();
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
            <p class="small muted">18 Fragen zu allen Kapiteln mit Erklärungen.</p>
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
