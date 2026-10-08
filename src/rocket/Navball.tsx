import { useEffect, useRef } from 'preact/hooks';
import { prepareCanvas } from '../ui/hooks';
import type { Flight, SasMode } from './flight';
import { drawNavball, pitch, type NavMarker } from './navballdraw';

export const SAS_MODES: readonly {
  mode: SasMode;
  icon: string;
  /** Kurzname unter dem Symbol (Touch-Geräte zeigen keinen Tooltip). */
  short: string;
  label: string;
  key: string;
}[] = [
  {
    mode: 'off',
    icon: '○',
    short: 'Frei',
    label: 'SAS aus: Lage frei (die Rakete hört nur auf dich)',
    key: '1',
  },
  {
    mode: 'prograde',
    icon: '⊙',
    short: 'Flug',
    label: 'Prograd: in Flugrichtung halten',
    key: '2',
  },
  {
    mode: 'retrograde',
    icon: '⊗',
    short: 'Gegen',
    label: 'Retrograd: gegen die Flugrichtung (zum Bremsen)',
    key: '3',
  },
  {
    mode: 'radialOut',
    icon: '⇡',
    short: 'Hoch',
    label: 'Radial nach außen: vom Körper weg',
    key: '4',
  },
  {
    mode: 'radialIn',
    icon: '⇣',
    short: 'Runter',
    label: 'Radial nach innen: zum Körper hin',
    key: '5',
  },
  { mode: 'target', icon: '◆', short: 'Ziel', label: 'Zum Ziel zeigen', key: '6' },
  {
    mode: 'maneuver',
    icon: '✎',
    short: 'Plan',
    label: 'Auf das geplante Manöver ausrichten',
    key: '7',
  },
];

interface Props {
  flight: { current: Flight };
  size: number;
  onSas: (mode: SasMode) => void;
}

/** Lageanzeige mit den SAS-Knöpfen darunter. */
export function Navball({ flight, size, onSas }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const markers = useRef<NavMarker[]>([]);
  const readout = useRef<HTMLSpanElement>(null);

  // Eigene Zeichenschleife: Die Anzeige soll flüssig mitdrehen, nicht nur 10-mal pro Sekunde.
  useEffect(() => {
    let id = 0;
    let lastText = '';
    let lastSig = '';
    // Auf 1/400 rad gerundet (am Rand der Anzeige weniger als ein Pixel): Nur neu zeichnen, wenn
    // sich Lage, Flugrichtung oder Modus sichtbar ändern – spart auf Handys viel Grafikarbeit.
    const q = (a: number): number => Math.round(a * 400);
    const frame = (): void => {
      const f = flight.current;
      const rel = f.relative();
      const sig = `${q(f.angle)}|${q(Math.atan2(rel.ry, rel.rx))}|${q(Math.atan2(rel.vy, rel.vx))}|${f.sas}|${f.status}|${f.target ?? ''}|${f.node ? 1 : 0}|${Math.floor(f.t)}`;
      const c = canvas.current;
      if (c && sig !== lastSig) {
        const ctx = prepareCanvas(c, size, size);
        if (ctx) {
          markers.current = drawNavball(ctx, f, size);
          lastSig = sig;
        }
      }
      const text = f.status === 'flying' ? `${Math.round(pitch(f))}°` : '';
      if (readout.current && text !== lastText) {
        readout.current.textContent = text;
        lastText = text;
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [size, flight]);

  const click = (e: MouseEvent): void => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * size;
    const y = ((e.clientY - r.top) / r.height) * size;
    let best: NavMarker | null = null;
    let bestD = size * 0.16;
    for (const m of markers.current) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    if (best) onSas(best.mode);
  };

  const f = flight.current;
  const available = (m: SasMode): boolean =>
    f.status === 'flying' &&
    (m === 'off' ||
      (m === 'target' ? !!f.target : m === 'maneuver' ? !!f.node : f.sasDirection(m) !== null));
  return (
    <div class="navball">
      <div class="navball-dial">
        <canvas
          ref={canvas}
          onClick={click}
          style={{ width: `${size}px`, height: `${size}px` }}
          role="img"
          aria-label="Lageanzeige: Nase der Rakete oben, grüne Marker zeigen die Flugrichtung"
        />
        <span class="navball-pitch" ref={readout} title="Neigung gegen den Horizont" />
      </div>
      <div class="sas-row" role="group" aria-label="SAS-Lageregelung">
        {SAS_MODES.map((s) => (
          <button
            key={s.mode}
            type="button"
            class={`sas-btn sas-${s.mode} ${f.sas === s.mode ? 'on' : ''}`}
            disabled={!available(s.mode)}
            title={`${s.label} (Taste ${s.key})`}
            aria-label={s.label}
            aria-pressed={f.sas === s.mode}
            onClick={() => onSas(s.mode)}
          >
            <span class="sas-icon" aria-hidden="true">
              {s.icon}
            </span>
            <span class="sas-short" aria-hidden="true">
              {s.short}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
