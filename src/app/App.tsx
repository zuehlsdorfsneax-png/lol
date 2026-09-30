import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { HomePage } from '../pages/HomePage';
import { Icon, type IconName } from '../ui/Icon';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { usePersistentState } from '../ui/hooks';
import { useTheme, type ThemeChoice } from '../ui/theme';
import { findMission } from '../missions/missions';
import { CHAPTERS, SHOW_SIMULATOR, SHOW_TOOLS, VISIBLE_CHAPTERS } from './content';
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
  icon?: IconName;
  num?: string;
  active: (r: Route) => boolean;
}

interface NavGroup {
  id: string;
  title: string;
  /** Einklappbar; eingeklappt ab Werk, solange keine Seite der Gruppe offen ist. */
  collapsible?: boolean;
  items: NavItem[];
}

/** Kurze Titel für die Seitenleiste, damit nichts umbricht. */
const SHORT: Record<number, string> = { 7: 'Hohle-Mond-Theorie', 8: 'Eigene Simulation' };

const GROUPS: NavGroup[] = [
  {
    id: 'werkzeuge',
    title: 'Werkzeuge',
    items: [
      { to: 'simulator', label: 'Simulator', icon: 'orbit', active: (r) => r.page === 'simulator' },
      {
        to: 'stabilitaetskarte',
        label: 'Stabilitätskarte',
        icon: 'grid',
        active: (r) => r.page === 'karte',
      },
      {
        to: 'lagrange-labor',
        label: 'Lagrange-Labor',
        icon: 'lagrange',
        active: (r) => r.page === 'lagrange',
      },
    ],
  },
  {
    id: 'kapitel',
    title: 'Kapitel',
    collapsible: true,
    items: VISIBLE_CHAPTERS.map((c) => ({
      to: `kapitel-${c.n}`,
      label: SHORT[c.n] ?? c.title,
      num: String(c.n),
      active: (r: Route) => r.page === 'kapitel' && r.param === String(c.n),
    })),
  },
  {
    id: 'spielen',
    title: 'Spielen',
    items: [
      { to: 'rakete', label: 'Raketenwerft', icon: 'rocket', active: (r) => r.page === 'rakete' },
      { to: 'spiel', label: 'Lunas Sternenreise', icon: 'moon', active: (r) => r.page === 'spiel' },
      {
        to: 'missionen',
        label: 'Missionen',
        icon: 'flag',
        active: (r) => r.page === 'missionen' || r.page === 'mission',
      },
      { to: 'quiz', label: 'Quiz', icon: 'quiz', active: (r) => r.page === 'quiz' },
    ],
  },
  {
    id: 'anhang',
    title: 'Anhang',
    collapsible: true,
    items: [
      {
        to: 'methodik',
        label: 'Methodik & Validierung',
        icon: 'flask',
        active: (r) => r.page === 'methodik',
      },
      {
        to: 'quellen',
        label: 'Quellen & Formeln',
        icon: 'sigma',
        active: (r) => r.page === 'quellen',
      },
      { to: 'begriffe', label: 'Begriffe A–Z', icon: 'list', active: (r) => r.page === 'begriffe' },
      {
        to: 'download',
        label: 'Download für Windows',
        icon: 'download',
        active: (r) => r.page === 'download',
      },
    ],
  },
];

const THEMES: { id: ThemeChoice; icon: IconName; label: string }[] = [
  { id: 'auto', icon: 'auto', label: 'Wie das System' },
  { id: 'light', icon: 'sun', label: 'Hell' },
  { id: 'dark', icon: 'dark', label: 'Dunkel' },
];

function ThemeSwitch() {
  const [theme, setTheme] = useTheme();
  return (
    <div class="theme-switch" role="radiogroup" aria-label="Farbschema">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          title={t.label}
          aria-label={t.label}
          onClick={() => setTheme(t.id)}
        >
          <Icon name={t.icon} />
        </button>
      ))}
    </div>
  );
}

function NavLink({ item, route }: { item: NavItem; route: Route }) {
  return (
    <a class="nav-link" href={`#${item.to}`} aria-current={item.active(route) ? 'page' : undefined}>
      {item.num ? <span class="nav-num">{item.num}</span> : item.icon && <Icon name={item.icon} />}
      <span class="nav-label">{item.label}</span>
    </a>
  );
}

function Navigation({ route }: { route: Route }) {
  const [open, setOpen] = usePersistentState<Record<string, boolean>>('orbitlabor-nav', {
    kapitel: true,
  });
  return (
    <>
      <a class="nav-link" href="#start" aria-current={route.page === 'start' ? 'page' : undefined}>
        <Icon name="home" />
        <span class="nav-label">Start</span>
      </a>
      {GROUPS.map((g) =>
        g.id !== 'werkzeuge' || SHOW_TOOLS
          ? g
          : { ...g, items: g.items.filter((i) => SHOW_SIMULATOR && i.to === 'simulator') },
      )
        .filter((g) => g.items.length > 0)
        .map((g) => {
          const here = g.items.some((i) => i.active(route));
          const expanded = !g.collapsible || here || open[g.id] === true;
          return (
            <div class="nav-group" key={g.id}>
              {g.collapsible ? (
                <button
                  type="button"
                  class="nav-group-title toggle"
                  aria-expanded={expanded}
                  disabled={here}
                  onClick={() => setOpen((o) => ({ ...o, [g.id]: !expanded }))}
                >
                  {g.title}
                  <Icon name="chevron" />
                </button>
              ) : (
                <div class="nav-group-title">{g.title}</div>
              )}
              {expanded &&
                g.items.map((item) => <NavLink key={item.to} item={item} route={route} />)}
            </div>
          );
        })}
    </>
  );
}

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
  if (route.page === 'unbekannt') return <NotFound token={route.param ?? ''} />;
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
  unbekannt: 'Seite nicht gefunden',
};

/** Unbekannte Adresse: sagen, was los ist, statt still die Startseite zu zeigen. */
function NotFound({ token }: { token: string }) {
  return (
    <div class="stack" style={{ gap: '14px', maxWidth: '640px' }}>
      <div class="eyebrow">Fehler 404</div>
      <h1>Diese Seite gibt es nicht</h1>
      <p>
        Die Adresse <code>#{token}</code> führt nirgendwohin. Vielleicht hilft die Startseite oder
        das Menü weiter.
      </p>
      <div class="btn-row">
        <a class="btn primary" href="#start">
          Zur Startseite
        </a>
        <a class="btn" href="#kapitel-2">
          Zu Kapitel 1
        </a>
      </div>
    </div>
  );
}

function titleFor(route: Route): string {
  if (route.page === 'kapitel') {
    const c = CHAPTERS.find((x) => String(x.n) === route.param);
    if (c) return `Kapitel ${c.n}: ${c.title}`;
  }
  if (route.page === 'mission') {
    const m = findMission(route.param ?? '');
    if (m) return `Mission: ${m.title}`;
  }
  return PAGE_TITLES[route.page];
}

export function App() {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const nav = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const first = useRef(true);
  // Offenes Handy-Menü: Esc schließt, der Fokus bleibt im Menü, der Rest ist so lange inaktiv.
  useEffect(() => {
    if (!open) return;
    const rest = [main.current, document.querySelector<HTMLElement>('.topbar')];
    for (const el of rest) if (el) el.inert = true;
    nav.current?.querySelector<HTMLElement>('a, button')?.focus();
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      for (const el of rest) if (el) el.inert = false;
      menuButton.current?.focus({ preventScroll: true });
    };
  }, [open]);
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
          aria-expanded={open}
          aria-controls="hauptnavigation"
          ref={menuButton}
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" />
        </button>
        <a class="brand" href="#start" aria-label="Orbitlabor – Startseite">
          <BrandMark />
        </a>
        <span class="topbar-title">{route.page === 'start' ? 'Orbitlabor' : titleFor(route)}</span>
      </div>
      <button
        type="button"
        class={`scrim ${open ? 'open' : ''}`}
        aria-label="Menü schließen"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <nav
        class={`sidebar ${open ? 'open' : ''}`}
        id="hauptnavigation"
        aria-label="Hauptnavigation"
        ref={nav}
      >
        <a class="brand" href="#start">
          <BrandMark />
          <span>
            <span class="brand-name">Orbitlabor</span>
            <span class="brand-sub">Seminararbeit Astronomie</span>
          </span>
        </a>
        <div class="nav-scroll">
          <Navigation route={route} />
        </div>
        <div class="sidebar-foot">
          <span>Darstellung</span>
          <ThemeSwitch />
        </div>
      </nav>
      <main class="main" id="inhalt" ref={main} tabIndex={-1}>
        <ErrorBoundary key={`${route.page}-${route.param ?? ''}`} where="Diese Seite">
          <Page route={route} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
