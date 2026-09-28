import type { ComponentChildren } from 'preact';
import { useErrorBoundary } from 'preact/hooks';

/**
 * Fängt Fehler beim Zeichnen der Kinder ab: Statt einer leeren Seite erscheint ein Hinweis mit
 * „Nochmal versuchen“. `onReset` kann dabei kaputte Daten verwerfen.
 */
export function ErrorBoundary({
  children,
  where,
  onReset,
  onClose,
}: {
  children: ComponentChildren;
  /** Was nicht geklappt hat („Die Raketenwerft“, „Diese Seite“). */
  where: string;
  onReset?: () => void;
  onClose?: () => void;
}) {
  const state = useErrorBoundary((e: unknown) => console.error(e)) as [unknown, () => void];
  const [error, reset] = state;
  if (!error) return <>{children}</>;
  return (
    <div class="error-box" role="alert">
      <h2>Da ist etwas schiefgegangen</h2>
      <p>{where} ist auf einen Fehler gestoßen. Deine gespeicherten Fortschritte sind noch da.</p>
      <p class="small muted">{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
      <div class="row">
        <button
          type="button"
          class="btn primary"
          onClick={() => {
            onReset?.();
            reset();
          }}
        >
          Nochmal versuchen
        </button>
        {onClose && (
          <button type="button" class="btn" onClick={onClose}>
            Schließen
          </button>
        )}
      </div>
    </div>
  );
}
