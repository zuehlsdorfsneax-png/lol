/**
 * Lageanzeige (wie der „Navball“ großer Raumfahrtspiele, aber in 2D): Die Nase der Rakete zeigt
 * immer nach oben. Drumherum: Himmel und Boden, Flugrichtung (grün), Gegenrichtung, radial
 * (türkis), Ziel (violett), Manöver (blau). Ein Klick auf einen Marker stellt das SAS darauf.
 */
import type { Flight, SasMode } from './flight';

export interface NavMarker {
  mode: SasMode;
  x: number;
  y: number;
}

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function drawNavball(ctx: CanvasRenderingContext2D, f: Flight, size: number): NavMarker[] {
  const c = size / 2;
  const R = size / 2 - 3;
  ctx.clearRect(0, 0, size, size);
  const rel = f.relative();
  const up = Math.atan2(rel.ry, rel.rx);
  // Bildschirmwinkel einer Weltrichtung (Nase = oben, gegen den Uhrzeigersinn wie in der Welt).
  const scr = (world: number): number => -Math.PI / 2 - wrap(world - f.angle);
  // Himmel und Boden
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(c - R * 0.3, c - R * 0.3, R * 0.1, c, c, R);
  g.addColorStop(0, '#8a6038');
  g.addColorStop(1, '#4a311c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const skyA = scr(up);
  ctx.beginPath();
  ctx.moveTo(c + Math.cos(skyA + Math.PI / 2) * R * 2, c + Math.sin(skyA + Math.PI / 2) * R * 2);
  ctx.arc(c, c, R * 2, skyA + Math.PI / 2, skyA - Math.PI / 2, true);
  ctx.closePath();
  const sky = ctx.createRadialGradient(c - R * 0.3, c - R * 0.3, R * 0.1, c, c, R);
  sky.addColorStop(0, '#5aa2f0');
  sky.addColorStop(1, '#1d4f96');
  ctx.fillStyle = sky;
  ctx.fill();
  // Horizontlinie
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(c + Math.cos(skyA + Math.PI / 2) * R, c + Math.sin(skyA + Math.PI / 2) * R);
  ctx.lineTo(c + Math.cos(skyA - Math.PI / 2) * R, c + Math.sin(skyA - Math.PI / 2) * R);
  ctx.stroke();
  // Gradskala (alle 30° relativ zur Senkrechten)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) {
    const a = skyA + (k * Math.PI) / 6;
    const inner = k % 3 === 0 ? R * 0.84 : R * 0.9;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
    ctx.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.stroke();

  const markers: NavMarker[] = [];
  const at = (world: number, radius = R * 0.72): [number, number] => {
    const a = scr(world);
    return [c + Math.cos(a) * radius, c + Math.sin(a) * radius];
  };
  const put = (
    mode: SasMode,
    color: string,
    kind: 'pro' | 'retro' | 'dot' | 'diamond' | 'node',
  ) => {
    const dir = f.sasDirection(mode);
    if (dir === null) return;
    const [x, y] = at(dir);
    markers.push({ mode, x, y });
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    const r = Math.max(5, size * 0.045);
    ctx.beginPath();
    if (kind === 'diamond') {
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.2, y);
      ctx.lineTo(x, y + r * 1.2);
      ctx.lineTo(x - r * 1.2, y);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    if (kind === 'pro') {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'retro') {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 0.7);
      ctx.lineTo(x + r * 0.7, y + r * 0.7);
      ctx.moveTo(x + r * 0.7, y - r * 0.7);
      ctx.lineTo(x - r * 0.7, y + r * 0.7);
      ctx.stroke();
    } else if (kind === 'dot') {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(96,165,250,0.35)';
      ctx.fill();
    }
  };
  if (f.status === 'flying') {
    put('radialOut', '#67e8f9', 'dot');
    put('radialIn', '#67e8f9', 'retro');
    put('prograde', '#86efac', 'pro');
    put('retrograde', '#fdba74', 'retro');
    if (f.target) {
      put('target', '#d8b4fe', 'diamond');
      put('antiTarget', '#d8b4fe', 'retro');
    }
    if (f.node) put('maneuver', '#93c5fd', 'node');
  }
  // Ziel des SAS als gelbes Dreieck am Rand
  const hold = f.sas !== 'off' ? f.sasDirection() : null;
  if (hold !== null) {
    const a = scr(hold);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * (R - 1), c + Math.sin(a) * (R - 1));
    ctx.lineTo(c + Math.cos(a + 0.12) * (R - 11), c + Math.sin(a + 0.12) * (R - 11));
    ctx.lineTo(c + Math.cos(a - 0.12) * (R - 11), c + Math.sin(a - 0.12) * (R - 11));
    ctx.closePath();
    ctx.fill();
  }
  // Rakete in der Mitte, Nase nach oben
  ctx.strokeStyle = '#ffb347';
  ctx.fillStyle = '#ffb347';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(c - R * 0.34, c + R * 0.08);
  ctx.lineTo(c - R * 0.12, c + R * 0.08);
  ctx.lineTo(c, c - R * 0.1);
  ctx.lineTo(c + R * 0.12, c + R * 0.08);
  ctx.lineTo(c + R * 0.34, c + R * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(c, 4);
  ctx.lineTo(c - 5, 12);
  ctx.lineTo(c + 5, 12);
  ctx.closePath();
  ctx.fill();
  return markers;
}

/** Neigung der Nase gegen den Horizont in Grad (90 = senkrecht nach oben). */
export function pitch(f: Flight): number {
  const rel = f.relative();
  const up = Math.atan2(rel.ry, rel.rx);
  return 90 - (Math.abs(wrap(f.angle - up)) * 180) / Math.PI;
}
