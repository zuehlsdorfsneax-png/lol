import { useEffect, useState } from 'preact/hooks';

export type PageId =
  | 'start'
  | 'simulator'
  | 'karte'
  | 'lagrange'
  | 'kapitel'
  | 'missionen'
  | 'mission'
  | 'quiz'
  | 'spiel'
  | 'rakete'
  | 'download'
  | 'begriffe'
  | 'methodik'
  | 'quellen'
  | 'unbekannt';

export interface Route {
  page: PageId;
  /** Zusatz, z. B. Kapitelnummer, Voreinstellung oder Missions-ID. */
  param: string | null;
}

/**
 * Routen sind einfache Hash-Token (nur Buchstaben, Ziffern, Bindestrich), damit Links auch
 * dort funktionieren, wo Abfrageparameter entfernt werden: #simulator, #sim-absturz,
 * #kapitel-3, #mission-flucht …
 */
export function parseHash(hash: string): Route {
  const token = decodeURIComponent(hash.replace(/^#/, '')).trim();
  if (token === '' || token === 'start') return { page: 'start', param: null };
  if (token === 'simulator') return { page: 'simulator', param: null };
  if (token.startsWith('sim-')) return { page: 'simulator', param: token.slice(4) };
  if (token === 'stabilitaetskarte' || token === 'karte') return { page: 'karte', param: null };
  if (token.startsWith('karte-')) return { page: 'karte', param: token.slice(6) };
  if (token === 'lagrange-labor' || token === 'lagrange') return { page: 'lagrange', param: null };
  if (token.startsWith('lagrange-')) return { page: 'lagrange', param: token.slice(9) };
  if (token.startsWith('kapitel-')) {
    // Nur Kapitel 1 bis 9 – alles andere ist eine unbekannte Seite, nicht still Kapitel 1.
    const n = token.slice(8);
    return /^[1-9]$/.test(n) ? { page: 'kapitel', param: n } : { page: 'unbekannt', param: token };
  }
  if (token === 'missionen') return { page: 'missionen', param: null };
  if (token.startsWith('mission-')) return { page: 'mission', param: token.slice(8) };
  if (token === 'quiz') return { page: 'quiz', param: null };
  if (token === 'spiel') return { page: 'spiel', param: null };
  if (token === 'rakete') return { page: 'rakete', param: null };
  if (token === 'download') return { page: 'download', param: null };
  if (token === 'begriffe') return { page: 'begriffe', param: null };
  if (token === 'methodik') return { page: 'methodik', param: null };
  if (token === 'quellen') return { page: 'quellen', param: null };
  return { page: 'unbekannt', param: token };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = (): void => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(token: string): void {
  location.hash = token;
}
