import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { HomePage } from '../pages/HomePage';
import { Icon } from '../ui/Icon';
import { CHAPTERS } from './content';
import { useRoute, type Route } from './router';

function BrandMark() {
  return (
    <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
      <ellipse
        cx="20"
        cy="20"
        rx="17"
        ry="10"
        fill="none"
        stroke="var(--line-strong)"
        stroke-width="1.2"
        transform="rotate(-18 20 20)"
      />
      <circle cx="20" cy="20" r="5" fill="var(--accent)" />
      <circle cx="34.5" cy="13.5" r="3" fill="var(--series-1)" />
      <circle cx="34.5" cy="13.5" r="6" fill="none" stroke="var(--ink-3)" stroke-width="0.8" />
      <circle cx="39" cy="15.5" r="1.3" fill="var(--ink-2)" />
    </svg>
  );
}

interface NavItem {
  to: string;
  label: string;
  num?: string;
  active: (r: Route) => boolean;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Werkzeuge',
    items: [
      { to: 'simulator', label: 'Simulator', active: (r) => r.page === 'simulator' },
      { to: 'stabilitaetskarte', label: 'Stabilitätskarte', active: (r) => r.page === 'karte' },
      { to: 'lagrange-labor', label: 'Lagrange-Labor', active: (r) => r.page === 'lagrange' },
    ],
  },
  {
    title: 'Kapitel',
    items: CHAPTERS.map((c) => ({
      to: `kapitel-${c.n}`,
      label: c.title,
      num: String(c.n),
      active: (r: Route) => r.page === 'kapitel' && r.param === String(c.n),
    })),
  },
  {
    title: 'Spielen',
    items: [
      { to: 'rakete', label: 'Raketenwerft', active: (r) => r.page === 'rakete' },
      { to: 'spiel', label: 'Lunas Sternenreise', active: (r) => r.page === 'spiel' },
      {
        to: 'missionen',
        label: 'Missionen',
        active: (r) => r.page === 'missionen' || r.page === 'mission',
      },
      { to: 'quiz', label: 'Quiz', active: (r) => r.page === 'quiz' },
    ],
  },
  {
    title: 'Anhang',
    items: [
      { to: 'methodik', label: 'Methodik & Validierung', active: (r) => r.page === 'methodik' },
      { to: 'quellen', label: 'Quellen & Formeln', active: (r) => r.page === 'quellen' },
      { to: 'begriffe', label: 'Begriffe A–Z', active: (r) => r.page === 'begriffe' },
      { to: 'download', label: 'Download für Windows', active: (r) => r.page === 'download' },
    ],
  },
];

/**
 * Seiten werden erst geladen, wenn man sie öffnet – so startet die App schneller.
 * Die Startseite ist direkt enthalten.
 */
type Loader = () => Promise<ComponentType<{ route: Route }>>;

const PAGES: Partial<Record<Route['page'], Loader>> = {
  simulator: () =>
    import('../pages/SimulatorPage').then((m) => ({ route }: { route: Route }) => (
      <m.SimulatorPage preset={route.param} />
    )),
  karte: () =>
    import('../pages/StabilityMapPage').then((m) => ({ route }: { route: Route }) => (
      <m.StabilityMapPage preset={route.param} />
    )),
  lagrange: () =>
    import('../pages/LagrangePage').then((m) => ({ route }: { route: Route }) => (
      <m.LagrangePage preset={route.param} />
    )),
  kapitel: () =>
    import('../pages/ChapterPage').then((m) => ({ route }: { route: Route }) => (
      <m.ChapterPage n={Number(route.param)} />
    )),
  missionen: () => import('../pages/MissionsPage').then((m) => () => <m.MissionsPage />),
  mission: () =>
    import('../pages/MissionPage').then((m) => ({ route }: { route: Route }) => (
      <m.MissionPage id={route.param ?? ''} />
    )),
  quiz: () => import('../pages/QuizPage').then((m) => () => <m.QuizPage />),
  spiel: () => import('../pages/KidsPage').then((m) => () => <m.KidsPage />),
  rakete: () => import('../pages/RocketPage').then((m) => () => <m.RocketPage />),
  download: () => import('../pages/DownloadPage').then((m) => () => <m.DownloadPage />),
  begriffe: () => import('../pages/GlossaryPage').then((m) => () => <m.GlossaryPage />),
  methodik: () => import('../pages/MethodsPage').then((m) => () => <m.MethodsPage />),
  quellen: () => import('../pages/SourcesPage').then((m) => () => <m.SourcesPage />),
};

const loaded = new Map<Route['page'], ComponentType<{ route: Route }>>();

function Page({ route }: { route: Route }) {
  const load = PAGES[route.page];
  const [, setVersion] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!load || loaded.has(route.page)) return;
    let alive = true;
    setFailed(false);
    load()
      .then((c) => {
        loaded.set(route.page, c);
        if (alive) setVersion((v) => v + 1);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [route.page]);
  if (!load) return <HomePage />;
  const C = loaded.get(route.page);
  if (C) return <C route={route} />;
  return (
    <div class="page-loading" role="status">
      {failed ? (
        <>
          Die Seite konnte nicht geladen werden.{' '}
          <button type="button" class="btn small" onClick={() => location.reload()}>
            Neu laden
          </button>
        </>
      ) : (
        'Lädt …'
      )}
    </div>
  );
}

const PAGE_TITLES: Record<Route['page'], string> = {
  start: 'Bahnstabilität im Drei-Körper-System',
  simulator: 'Simulator',
  karte: 'Stabilitätskarte',
  lagrange: 'Lagrange-Labor',
  kapitel: 'Kapitel',
  missionen: 'Missionen',
  mission: 'Mission',
  quiz: 'Quiz',
  spiel: 'Lunas Sternenreise',
  rakete: 'Raketenwerft',
  download: 'Download für Windows',
  begriffe: 'Begriffe A–Z',
  methodik: 'Methodik & Validierung',
  quellen: 'Quellen & Formeln',
};

function titleFor(route: Route): string {
  if (route.page === 'kapitel') {
    const c = CHAPTERS.find((x) => String(x.n) === route.param);
    if (c) return `Kapitel ${c.n}: ${c.title}`;
  }
  return PAGE_TITLES[route.page];
}

export function App() {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    setOpen(false);
    document.title = `${titleFor(route)} · Orbitlabor`;
    // Nach einem Seitenwechsel landet der Fokus am Seitenanfang (wichtig für Screenreader).
    if (!first.current) main.current?.focus({ preventScroll: true });
    first.current = false;
  }, [route]);

  return (
    <div class="app">
      <button type="button" class="skip-link" onClick={() => main.current?.focus()}>
        Zum Inhalt springen
      </button>
      <div class="topbar">
        <button
          type="button"
          class="btn icon ghost"
          aria-label="Menü öffnen"
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" />
        </button>
        <a class="brand" href="#start">
          <BrandMark />
          <span class="brand-name">Orbitlabor</span>
        </a>
      </div>
      <div class={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <nav class={`sidebar ${open ? 'open' : ''}`} aria-label="Hauptnavigation">
        <a class="brand" href="#start">
          <BrandMark />
          <span>
            <div class="brand-name">Orbitlabor</div>
            <div class="brand-sub">Bahnstabilität im Drei-Körper-System</div>
          </span>
        </a>
        {GROUPS.map((g) => (
          <div class="nav-group" key={g.title}>
            <div class="nav-group-title">{g.title}</div>
            {g.items.map((item) => (
              <a
                key={item.to}
                class="nav-link"
                href={`#${item.to}`}
                aria-current={item.active(route) ? 'page' : undefined}
              >
                {item.num && <span class="nav-num">{item.num}</span>}
                {item.label}
              </a>
            ))}
          </div>
        ))}
        <div class="sidebar-foot">
          Seminararbeit Astronomie · Eigenanteil: digitale Drei-Körper-Simulation
        </div>
      </nav>
      <main class="main" id="inhalt" ref={main} tabIndex={-1}>
        <Page route={route} />
      </main>
    </div>
  );
}
