import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

export interface Size {
  width: number;
  height: number;
}

/** Beobachtet die Größe eines Elements (CSS-Pixel). */
export function useElementSize<T extends HTMLElement>(): [{ current: T | null }, Size] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (): void => {
      const r = el.getBoundingClientRect();
      setSize((s) =>
        Math.abs(s.width - r.width) < 0.5 && Math.abs(s.height - r.height) < 0.5
          ? s
          : { width: r.width, height: r.height },
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/**
 * Bereitet einen Canvas für die gegebene CSS-Größe vor (scharf auf HiDPI-Bildschirmen) und
 * liefert den Kontext mit Transformation auf CSS-Pixel.
 */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  quality = 1,
  /** Deckend (malt jedes Bild ganz aus): Der Browser muss die Fläche dann nicht überblenden. */
  opaque = false,
): CanvasRenderingContext2D | null {
  // Mehr als doppelte Pixeldichte sieht man auf einem bewegten Bild nicht, kostet aber auf
  // Handys (dreifache Dichte) mehr als doppelt so viel Grafikleistung. `quality` < 1 senkt die
  // Auflösung weiter, wenn ein Gerät nicht hinterherkommt (nie unter 0,75 Pixel je CSS-Pixel).
  const dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2) * quality);
  const w = Math.max(1, Math.round(width * dpr));
  const h = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d', opaque ? { alpha: false } : undefined);
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Ruft `callback(dtSeconds)` in jedem Bild auf, solange `active` gilt. */
export function useAnimationFrame(callback: (dt: number) => void, active: boolean): void {
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!active) return;
    let last = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      cb.current(dt);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
}

export interface ThemeColors {
  ink: string;
  ink2: string;
  ink3: string;
  surface: string;
  surface2: string;
  grid: string;
  axis: string;
  accent: string;
  series: string[];
  ok: string;
  warn: string;
  fail: string;
  fontUi: string;
  fontMono: string;
}

function readColors(): ThemeColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string): string => s.getPropertyValue(name).trim();
  return {
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    surface: v('--surface'),
    surface2: v('--surface-2'),
    grid: v('--grid'),
    axis: v('--axis'),
    accent: v('--accent'),
    series: [1, 2, 3, 4, 5].map((i) => v(`--series-${i}`)),
    ok: v('--ok'),
    warn: v('--warn'),
    fail: v('--fail'),
    fontUi: v('--font-ui'),
    fontMono: v('--font-mono'),
  };
}

/** Aktuelle Theme-Farben für Canvas-Zeichnungen; aktualisiert sich bei Theme-Wechsel. */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(readColors);
  useEffect(() => {
    const update = (): void => setColors(readColors());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    // Webfonts können nach dem ersten Zeichnen eintreffen.
    void document.fonts?.ready.then(update);
    return () => {
      mq.removeEventListener('change', update);
      mo.disconnect();
    };
  }, []);
  return colors;
}

/** Zustand, der im localStorage gemerkt wird (fehlertolerant). */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw) as unknown;
      if (typeof initial === 'object' && initial !== null && !Array.isArray(initial)) {
        return typeof parsed === 'object' && parsed !== null ? { ...initial, ...parsed } : initial;
      }
      return typeof parsed === typeof initial ? (parsed as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ohne Speicher geht es auch.
    }
  }, [key, value]);
  return [value, setValue];
}
