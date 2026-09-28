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

function clockParts(t: number): { d: number; h: number; m: number; sec: number } {
  const s = Math.max(0, Math.floor(t));
  return {
    d: Math.floor(s / 86_400),
    h: Math.floor((s % 86_400) / 3600),
    m: Math.floor((s % 3600) / 60),
    sec: s % 60,
  };
}

const two = (n: number): string => String(n).padStart(2, '0');

/** Uhrzeit-Dauer („04:12“, „1:04:12“, „3 Tage 01:04:12“). */
export function clock(t: number): string {
  if (!Number.isFinite(t)) return '–';
  const { d, h, m, sec } = clockParts(t);
  return d > 0
    ? `${d} ${d === 1 ? 'Tag' : 'Tage'} ${two(h)}:${two(m)}:${two(sec)}`
    : h > 0
      ? `${h}:${two(m)}:${two(sec)}`
      : `${two(m)}:${two(sec)}`;
}

/** Wie `clock`, aber nach „in“ (Dativ): „in 3 Tagen 01:04:12“. */
export function clockIn(t: number): string {
  if (!Number.isFinite(t)) return '–';
  const { d } = clockParts(t);
  return d > 1 ? clock(t).replace(' Tage ', ' Tagen ') : clock(t);
}

/** Missionsuhr für enge Anzeigen: ab einem Tag ohne Sekunden („110 Tg. 01:22“). */
export function missionClock(t: number): string {
  if (!Number.isFinite(t)) return '–';
  const { d, h, m } = clockParts(t);
  return d > 0 ? `${d} Tg. ${two(h)}:${two(m)}` : clock(t);
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

/** Sehr kurze Zeitangabe für enge Anzeigen („12:30“, „5 h“, „3 Tg.“). */
export function shortTime(t: number): string {
  if (!Number.isFinite(t)) return '–';
  const s = Math.max(0, Math.round(t));
  if (s < 3600) return `${two(Math.floor(s / 60))}:${two(s % 60)}`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86_400)} Tg.`;
}
