import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import {
  SHOW_SIMULATOR,
  SHOW_TOOLS,
  SHOWN_CHAPTERS,
  VISIBLE_CHAPTERS,
  PROBLEM_QUESTION,
} from '../app/content';
import { MISSIONS } from '../missions/missions';
import { progressStore } from '../missions/progress';
import { REAL_PARAMS } from '../physics';
import { RocketArt } from '../rocket/RocketArt';
import { Simulation } from '../sim/Simulation';
import { SpaceCanvas } from '../sim/SpaceCanvas';
import { DEFAULT_VIEW } from '../sim/view';
import { LinkButton } from '../ui/LinkButton';
import { Icon } from '../ui/Icon';
import { CHALLENGE_COUNT, GOAL_COUNT } from '../rocket/counts';
import { QUESTIONS } from '../quiz/questions';

const HERO_VIEW = { ...DEFAULT_VIEW, frame: 'rotating' as const, labels: true, trailSpan: 0 };

/** Zeile im Inhaltsverzeichnis der Startseite: Marke links, Titel und Leitfrage, Pfeil rechts. */
function TocRow({
  to,
  mark,
  title,
  meta,
  children,
}: {
  to: string;
  mark: ComponentChildren;
  title: string;
  meta?: string;
  children: ComponentChildren;
}) {
  return (
    <li>
      <a class="toc-row" href={`#${to}`}>
        <span class="toc-mark">{mark}</span>
        <span class="toc-text">
          <strong>{title}</strong>
          <span>{children}</span>
        </span>
        {meta && <span class="toc-meta">{meta}</span>}
      </a>
    </li>
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
          <div class="eyebrow">Seminararbeit Astronomie</div>
          <h1 class="hero-title">Orbitlabor</h1>
          <blockquote class="problem">
            <span class="problem-label">Problemfrage</span>
            <p>„{PROBLEM_QUESTION}“</p>
          </blockquote>
          <div class="btn-row">
            {(SHOW_TOOLS || SHOW_SIMULATOR) && (
              <LinkButton to="simulator" primary>
                Simulator starten
              </LinkButton>
            )}
            <LinkButton to="kapitel-2" primary={!(SHOW_TOOLS || SHOW_SIMULATOR)}>
              Mit Kapitel 2 beginnen
            </LinkButton>
          </div>
        </div>
        <figure class="plate hero-visual">
          <div class="plate-canvas">
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
          </div>
          <figcaption>
            <span class="fig-num">Abb. 1</span> Live-Simulation, 1 Tag pro Sekunde: 160 Testteilchen
            um die Erde. Die Sonne (links, außerhalb des Bildes) entreißt alle jenseits von etwa
            0,48 Hill-Radien; der Mond kreist bei 0,26.
          </figcaption>
        </figure>
      </section>

      <section class="home-section" aria-labelledby="kurzantwort">
        <h2 id="kurzantwort">Die Antwort in drei Sätzen</h2>
        <ol class="theses">
          <li class="ok">
            <span class="thesis-label">
              <Icon name="check" /> Stabil
            </span>
            <p>
              Ein Mond bleibt, solange er innerhalb von etwa <strong>0,48 Hill-Radien</strong>{' '}
              kreist (rückläufig 0,92). Unser Mond liegt bei 0,26 – das Jacobi-Kriterium beweist,
              dass er die Erdumgebung nie verlassen kann.
              {SHOWN_CHAPTERS.has(5) && (
                <>
                  {' '}
                  <a href="#kapitel-5">Kapitel 5</a>
                </>
              )}
            </p>
          </li>
          <li class="fail">
            <span class="thesis-label">
              <Icon name="fail" /> Absturz
            </span>
            <p>
              Erst wenn er über <strong>70 % seiner Geschwindigkeit</strong> verlöre, käme er der
              Erde näher als die Roche-Grenze und würde zerrissen; bei 80 % schlüge er ein.
              {SHOWN_CHAPTERS.has(8) && (
                <>
                  {' '}
                  <a href="#kapitel-8">Kapitel 8</a>
                </>
              )}
            </p>
          </li>
          <li class="warn">
            <span class="thesis-label">
              <Icon name="warn" /> Flucht
            </span>
            <p>
              Entkommen würde er mit <strong>19 % mehr Tempo</strong>, auf der halben Entfernung zur
              Sonne oder bei 6,5-facher Sonnenmasse – dann öffnet sich das Tor bei L1/L2.
              {SHOW_TOOLS && (
                <>
                  {' '}
                  <a href="#stabilitaetskarte">Stabilitätskarte</a>
                </>
              )}
            </p>
          </li>
        </ol>
      </section>

      <section class="home-section" aria-labelledby="inhalt">
        <div class="section-head">
          <h2 id="inhalt">Inhalt</h2>
          <a class="more" href="#kapitel-2">
            Von vorn lesen
          </a>
        </div>
        <ol class="toc">
          {VISIBLE_CHAPTERS.map((c) => (
            <TocRow key={c.n} to={`kapitel-${c.n}`} mark={c.n} title={c.title}>
              {c.question}
            </TocRow>
          ))}
          {(SHOW_TOOLS || SHOW_SIMULATOR) && (
            <TocRow to="simulator" mark={<Icon name="orbit" />} title="Drei-Körper-Simulator">
              Erde, Mond und Sonne mit allen Parametern, drei Bezugssystemen, Messwerten und Export.
            </TocRow>
          )}
          {SHOW_TOOLS && (
            <>
              <TocRow to="stabilitaetskarte" mark={<Icon name="grid" />} title="Stabilitätskarte">
                Tausende Simulationen als Karte: Wo bleibt der Mond, wo stürzt er ab, wo entkommt
                er?
              </TocRow>
              <TocRow to="lagrange-labor" mark={<Icon name="lagrange" />} title="Lagrange-Labor">
                Potentiallandschaft, Nullgeschwindigkeitskurven und Teilchen im rotierenden System.
              </TocRow>
            </>
          )}
        </ol>
      </section>

      <section class="home-section" aria-labelledby="spielen">
        <h2 id="spielen">Spielen und üben</h2>
        <a class="rocket-banner" href="#rakete">
          <div class="rocket-banner-text">
            <div class="eyebrow">Raketenwerft</div>
            <h3>Bau dir deinen Weg durchs Sonnensystem</h3>
            <p>
              Rakete bauen, an der Raumstation andocken, auf Mond, Mars und Europa landen – mit
              echter Schwerkraft, Bordcomputer, {CHALLENGE_COUNT} Herausforderungen und {GOAL_COUNT}{' '}
              Zielen.
            </p>
            <span class="rocket-banner-cta">Raketenwerft öffnen</span>
          </div>
          <RocketArt />
        </a>
        <ol class="toc">
          <TocRow to="spiel" mark={<Icon name="moon" />} title="Lunas Sternenreise">
            Für Jüngere: Schleudere den Mond Luna in eine Umlaufbahn und sammle Sterne.
          </TocRow>
          <TocRow
            to="missionen"
            mark={<Icon name="flag" />}
            title="Missionen"
            meta={`${stars} / ${MISSIONS.length * 3} Sterne`}
          >
            Neun Aufträge an den Grenzen der Stabilität, bis zu drei Sterne pro Auftrag.
          </TocRow>
          <TocRow
            to="quiz"
            mark={<Icon name="quiz" />}
            title="Quiz"
            meta={`${QUESTIONS.length} Fragen`}
          >
            Fragen zu allen Kapiteln, jede mit Erklärung.
          </TocRow>
        </ol>
      </section>
    </div>
  );
}
