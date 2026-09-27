import { AU, DAY, KM, YEAR } from '../physics';

const de = (v: number, digits = 0): string =>
  v.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export function fmt(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return v === Infinity ? '∞' : '–';
  return de(v, digits);
}

/** Zahl mit sinnvoller Anzahl gültiger Stellen. */
export function sig(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return v === Infinity ? '∞' : '–';
  if (v === 0) return '0';
  const mag = Math.floor(Math.log10(Math.abs(v)));
  const decimals = Math.max(0, digits - 1 - mag);
  return de(Number(v.toPrecision(digits)), Math.min(decimals, 8));
}

/** Wissenschaftliche Schreibweise: 1,23 · 10⁻⁶ */
export function sci(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '–';
  if (v === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(v)));
  if (exp >= -2 && exp <= 4) return sig(v, digits + 1);
  const mant = v / 10 ** exp;
  return `${de(mant, digits)} · 10${superscript(exp)}`;
}

const SUP: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

export function superscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('');
}

export function km(m: number, digits = 0): string {
  return `${fmt(m / KM, digits)} km`;
}

/** Abstand in km oder AE – je nachdem, was lesbarer ist. */
export function distance(m: number): string {
  if (!Number.isFinite(m)) return '–';
  if (Math.abs(m) >= 0.05 * AU) return `${sig(m / AU, 3)} AE`;
  return km(m);
}

/** Zeitdauer im Nominativ: "12,3 Tage", "4,5 Jahre". */
export function duration(s: number): string {
  if (!Number.isFinite(s)) return '–';
  const a = Math.abs(s);
  if (a < 2 * DAY) return `${de(s / 3600, 1)} h`;
  if (a < YEAR) return `${de(s / DAY, 1)} Tage`;
  return `${de(s / YEAR, a < 100 * YEAR ? 2 : 1)} Jahre`;
}

export function speed(mps: number): string {
  return `${sig(mps / KM, 3)} km/s`;
}

export function percent(v: number, digits = 1): string {
  return `${de(v * 100, digits)} %`;
}

/** Zehnerpotenz als Achsenbeschriftung: 10⁻⁶ (für logarithmische Achsen). */
export function pow10(v: number): string {
  return `10${superscript(Math.round(Math.log10(v)))}`;
}
