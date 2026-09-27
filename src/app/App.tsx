import { useEffect, useState } from 'preact/hooks';
import { ChapterPage } from '../pages/ChapterPage';
import { HomePage } from '../pages/HomePage';
import { DownloadPage } from '../pages/DownloadPage';
import { KidsPage } from '../pages/KidsPage';
import { LagrangePage } from '../pages/LagrangePage';
import { MethodsPage } from '../pages/MethodsPage';
import { MissionPage } from '../pages/MissionPage';
import { MissionsPage } from '../pages/MissionsPage';
import { QuizPage } from '../pages/QuizPage';
import { RocketPage } from '../pages/RocketPage';
import { SimulatorPage } from '../pages/SimulatorPage';
import { SourcesPage } from '../pages/SourcesPage';
import { StabilityMapPage } from '../pages/StabilityMapPage';
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
      { to: 'download', label: 'Download für Windows', active: (r) => r.page === 'download' },
    ],
  },
];

function Page({ route }: { route: Route }) {
  switch (route.page) {
    case 'simulator':
      return <SimulatorPage preset={route.param} />;
    case 'karte':
      return <StabilityMapPage preset={route.param} />;
    case 'lagrange':
      return <LagrangePage preset={route.param} />;
    case 'kapitel':
      return <ChapterPage n={Number(route.param)} />;
    case 'missionen':
      return <MissionsPage />;
    case 'mission':
      return <MissionPage id={route.param ?? ''} />;
    case 'quiz':
      return <QuizPage />;
    case 'spiel':
      return <KidsPage />;
    case 'rakete':
      return <RocketPage />;
    case 'download':
      return <DownloadPage />;
    case 'methodik':
      return <MethodsPage />;
    case 'quellen':
      return <SourcesPage />;
    default:
      return <HomePage />;
  }
}

export function App() {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [route]);

  return (
    <div class="app">
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
      <main class="main" id="inhalt">
        <Page route={route} />
      </main>
    </div>
  );
}
