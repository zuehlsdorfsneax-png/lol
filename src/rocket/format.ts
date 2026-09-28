/** Zahlen, Strecken und Zeiten für die Anzeigen der Raketenwerft. */

export const fmt = (x: number, d = 0): string =>
  // Kein „-0“: sehr kleine Werte werden als 0 angezeigt.
  (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toLocaleString('de-DE', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export function km(m: number): string {
  if (!Number.isFinite(m)) return '∞';
  if (Math.abs(m) >= 1e9)
    return `${(m / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. km`;
  return `${Math.round(m / 1000).toLocaleString('de-DE')} km`;
}

export function distance(m: number): string {
  if (!Number.isFinite(m)) return '∞';
  if (Math.abs(m) < 10_000) return `${fmt(m)} m`;
  if (Math.abs(m) >= 1e9) return km(m);
  return `${fmt(m / 1000, Math.abs(m) < 100_000 ? 1 : 0)} km`;
}

export function clock(t: number): string {
  if (!Number.isFinite(t)) return '–';
  const s = Math.max(0, Math.floor(t));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number): string => String(n).padStart(2, '0');
  return d > 0
    ? `${d} ${d === 1 ? 'Tag' : 'Tage'} ${two(h)}:${two(m)}:${two(sec)}`
    : h > 0
      ? `${h}:${two(m)}:${two(sec)}`
      : `${two(m)}:${two(sec)}`;
}

/** Kurze Dauer in Worten („3 min 20 s“, „2 Tage 4 h“). */
export function duration(t: number): string {
  if (!Number.isFinite(t)) return '–';
  const s = Math.max(0, Math.round(t));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  const d = Math.floor(s / 86_400);
  return `${d} ${d === 1 ? 'Tag' : 'Tage'} ${Math.floor((s % 86_400) / 3600)} h`;
}
