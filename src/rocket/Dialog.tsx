import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/**
 * Setzt alle Geschwister von `el` und seinen Vorfahren auf `inert`: Nur `el` bleibt bedienbar.
 * Gibt eine Funktion zurück, die das wieder aufhebt.
 */
export function isolate(el: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  for (let node: HTMLElement | null = el; node?.parentElement; node = node.parentElement) {
    for (const sib of Array.from(node.parentElement.children)) {
      if (sib !== node && sib instanceof HTMLElement && !sib.inert) {
        sib.inert = true;
        changed.push(sib);
      }
    }
    if (node.parentElement === document.body) break;
  }
  return () => changed.forEach((s) => (s.inert = false));
}

/**
 * Dialog über dem Spiel. Beim Öffnen hat der Hauptknopf den Fokus, das HUD darunter ist gesperrt
 * (Tab und Klick erreichen es nicht). Beim Schließen geht der Fokus an den Knopf, der den Dialog
 * geöffnet hat.
 */
export function Dialog({
  class: cls = '',
  label,
  children,
}: {
  class?: string;
  label: string;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const release = isolate(el);
    el.querySelector<HTMLElement>('.primary')?.focus({ preventScroll: true });
    return () => {
      release();
      opener?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div ref={ref} class={`rocket-overlay ${cls}`} role="dialog" aria-label={label}>
      {children}
    </div>
  );
}
