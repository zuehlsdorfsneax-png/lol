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
  | 'methodik'
  | 'quellen';

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
  if (token === 'stabilitaetskarte') return { page: 'karte', param: null };
  if (token.startsWith('karte-')) return { page: 'karte', param: token.slice(6) };
  if (token === 'lagrange-labor') return { page: 'lagrange', param: null };
  if (token.startsWith('lagrange-')) return { page: 'lagrange', param: token.slice(9) };
  if (token.startsWith('kapitel-')) return { page: 'kapitel', param: token.slice(8) };
  if (token === 'missionen') return { page: 'missionen', param: null };
  if (token.startsWith('mission-')) return { page: 'mission', param: token.slice(8) };
  if (token === 'quiz') return { page: 'quiz', param: null };
  if (token === 'spiel') return { page: 'spiel', param: null };
  if (token === 'methodik') return { page: 'methodik', param: null };
  if (token === 'quellen') return { page: 'quellen', param: null };
  return { page: 'start', param: null };
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
