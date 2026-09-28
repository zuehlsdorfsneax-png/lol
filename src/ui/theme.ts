import { useState } from 'preact/hooks';

export type ThemeChoice = 'auto' | 'light' | 'dark';

const KEY = 'orbitlabor-theme';

/**
 * Was beim Start auf <html data-theme> stand. Eingebettete Seiten (z. B. ein Artefakt) setzen das
 * Attribut schon selbst; „Automatisch“ stellt genau diesen Zustand wieder her.
 */
let initial: string | null = null;

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function apply(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'auto') {
    if (initial === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', initial);
  } else {
    root.setAttribute('data-theme', choice);
  }
}

/** Vor dem ersten Zeichnen aufrufen, damit die Seite nicht kurz im falschen Theme aufblitzt. */
export function initTheme(): void {
  initial = document.documentElement.getAttribute('data-theme');
  apply(read());
}

/** Wahl übernehmen und merken. */
export function chooseTheme(c: ThemeChoice): void {
  apply(c);
  try {
    if (c === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, c);
  } catch {
    // Ohne Speicher gilt die Wahl nur bis zum Neuladen.
  }
}

export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(read);
  const set = (c: ThemeChoice): void => {
    setChoice(c);
    chooseTheme(c);
  };
  return [choice, set];
}
