import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import { SHOW_TOOLS, SHOWN_CHAPTERS, VISIBLE_CHAPTERS, PROBLEM_QUESTION } from '../app/content';
import { MISSIONS } from '../missions/missions';
import { progressStore } from '../missions/progress';
import { REAL_PARAMS } from '../physics';
import { RocketArt } from '../rocket/RocketArt';
import { Simulation } from '../sim/Simulation';
import { SpaceCanvas } from '../sim/SpaceCanvas';
import { DEFAULT_VIEW } from '../sim/view';
import { LinkButton } from '../ui/LinkButton';
import { Icon, type IconName } from '../ui/Icon';
import { CHALLENGE_COUNT, GOAL_COUNT } from '../rocket/counts';
import { QUESTIONS } from '../quiz/questions';

const HERO_VIEW = { ...DEFAULT_VIEW, frame: 'rotating' as const, labels: true, trailSpan: 0 };

function Tile({
  to,
  icon,
  title,
  meta,
  children,
}: {
  to: string;
  icon: IconName;
  title: string;
  meta?: string;
  children: ComponentChildren;
}) {
  return (
    <a class="tile" href={`#${to}`}>
      <span class="tile-icon">
        <Icon name={icon} />
      </span>
      <span class="tile-text">
        <strong>
          {title}
          {meta && <span class="tile-meta">{meta}</span>}
        </strong>
        <span>{children}</span>
      </span>
    </a>
  );
}

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
            {SHOW_TOOLS && (
              <LinkButton to="simulator" primary>
                Simulator starten
              </LinkButton>
            )}
            <LinkButton to="kapitel-2" primary={!SHOW_TOOLS}>
              Mit Kapitel 2 beginnen
            </LinkButton>
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
            {SHOWN_CHAPTERS.has(5) && <a href="#kapitel-5">Kapitel 5 · Hill-Sphäre</a>}
          </div>
          <div class="answer-card">
            <span class="chip fail">
              <Icon name="fail" /> Absturz
            </span>
            <p>
              Erst wenn er über <strong>70 % seiner Geschwindigkeit</strong> verlöre, käme er der
              Erde näher als die Roche-Grenze und würde zerrissen; bei 80 % schlüge er ein.
            </p>
            {SHOWN_CHAPTERS.has(8) && <a href="#kapitel-8">Kapitel 8 · Stabilitätsfälle</a>}
          </div>
          <div class="answer-card">
            <span class="chip warn">
              <Icon name="warn" /> Flucht
            </span>
            <p>
              Entkommen würde er mit <strong>19 % mehr Tempo</strong>, auf der halben Entfernung zur
              Sonne oder bei 6,5-facher Sonnenmasse – dann öffnet sich das Tor bei L1/L2.
            </p>
            {SHOW_TOOLS && <a href="#stabilitaetskarte">Zur Stabilitätskarte</a>}
          </div>
        </div>
      </section>

      <section class="home-section" aria-labelledby="kapitel">
        <div class="section-head">
          <h2 id="kapitel">Der Weg durch die Arbeit</h2>
          <a class="more" href="#kapitel-2">
            Von vorn lesen <Icon name="arrow" />
          </a>
        </div>
        <ol class="chapter-list">
          {VISIBLE_CHAPTERS.map((c) => (
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

      {SHOW_TOOLS && (
        <section class="home-section" aria-labelledby="werkzeuge">
          <div class="section-head">
            <h2 id="werkzeuge">Selbst ausprobieren</h2>
          </div>
          <div class="tile-grid">
            <Tile to="simulator" icon="orbit" title="Simulator">
              Erde, Mond und Sonne mit allen Parametern, drei Bezugssystemen, Messwerten und Export.
            </Tile>
            <Tile to="stabilitaetskarte" icon="grid" title="Stabilitätskarte">
              Tausende Simulationen als Karte: Wo bleibt der Mond, wo stürzt er ab, wo entkommt er?
            </Tile>
            <Tile to="lagrange-labor" icon="lagrange" title="Lagrange-Labor">
              Potentiallandschaft, Nullgeschwindigkeitskurven und Teilchen im rotierenden System.
            </Tile>
          </div>
        </section>
      )}

      <section class="home-section" aria-labelledby="spielen">
        <div class="section-head">
          <h2 id="spielen">Spielen und üben</h2>
        </div>
        <a class="rocket-banner" href="#rakete">
          <div class="rocket-banner-text">
            <div class="eyebrow">Raketenwerft</div>
            <h3>Bau dir deinen Weg durchs Sonnensystem</h3>
            <p>
              Rakete bauen, an der Raumstation andocken, auf Mond, Mars und Europa landen – mit
              echter Schwerkraft, Bordcomputer, {CHALLENGE_COUNT} Herausforderungen und {GOAL_COUNT}{' '}
              Zielen.
            </p>
            <span class="btn primary">
              Jetzt spielen <Icon name="arrow" />
            </span>
          </div>
          <RocketArt />
        </a>
        <div class="tile-grid">
          <Tile to="spiel" icon="moon" title="Lunas Sternenreise">
            Für Jüngere: Schleudere den Mond Luna in eine Umlaufbahn und sammle Sterne.
          </Tile>
          <Tile
            to="missionen"
            icon="flag"
            title="Missionen"
            meta={`${stars} / ${MISSIONS.length * 3} ★`}
          >
            Neun Aufträge an den Grenzen der Stabilität, bis zu drei Sterne pro Auftrag.
          </Tile>
          <Tile to="quiz" icon="quiz" title="Quiz">
            {QUESTIONS.length} Fragen zu allen Kapiteln, jede mit Erklärung.
          </Tile>
        </div>
      </section>
    </div>
  );
}
