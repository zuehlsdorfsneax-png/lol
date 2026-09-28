import { useEffect, useState } from 'preact/hooks';

/**
 * Knopf für Unumkehrbares: Das erste Antippen fragt nach („Wirklich …?“), erst das zweite führt
 * aus. Nach ein paar Sekunden ohne zweites Antippen ist die Nachfrage vergessen.
 */
export function ConfirmButton({
  label,
  confirm,
  onConfirm,
  class: cls = 'btn',
}: {
  label: string;
  confirm: string;
  onConfirm: () => void;
  class?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      class={`${cls} ${armed ? 'danger' : ''}`}
      aria-live="polite"
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirm : label}
    </button>
  );
}
