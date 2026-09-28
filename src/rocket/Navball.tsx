import { useEffect, useRef } from 'preact/hooks';
import { prepareCanvas } from '../ui/hooks';
import type { Flight, SasMode } from './flight';
import { drawNavball, pitch, type NavMarker } from './navball';

export const SAS_MODES: readonly { mode: SasMode; icon: string; label: string; key: string }[] = [
  { mode: 'off', icon: '○', label: 'SAS aus: Lage frei (die Rakete hört nur auf dich)', key: '1' },
  { mode: 'prograde', icon: '⊙', label: 'Prograd: in Flugrichtung halten', key: '2' },
  {
    mode: 'retrograde',
    icon: '⊗',
    label: 'Retrograd: gegen die Flugrichtung (zum Bremsen)',
    key: '3',
  },
  { mode: 'radialOut', icon: '⇡', label: 'Radial nach außen: vom Körper weg', key: '4' },
  { mode: 'radialIn', icon: '⇣', label: 'Radial nach innen: zum Körper hin', key: '5' },
  { mode: 'target', icon: '◆', label: 'Zum Ziel zeigen', key: '6' },
  { mode: 'maneuver', icon: '✦', label: 'Auf das geplante Manöver ausrichten', key: '7' },
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
    const frame = (): void => {
      const c = canvas.current;
      const ctx = c ? prepareCanvas(c, size, size) : null;
      if (ctx) markers.current = drawNavball(ctx, flight.current, size);
      const f = flight.current;
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
            {s.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
