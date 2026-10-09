import {
  CHUTE_SEMI,
  boosterPod,
  part,
  segments,
  sideOf,
  stackHeight,
  type FlameKind,
  type PartDef,
} from './parts';
import { softSprite } from './view';

// ------------------------------------------------------------------ Lackierungen

export interface Paint {
  id: string;
  name: string;
  /** Punkte, ab denen die Lackierung freigeschaltet ist. */
  points: number;
  metal: [string, string, string];
  stripe: string;
  band: string;
}

export const PAINTS: readonly Paint[] = [
  {
    id: 'klassisch',
    name: 'Klassisch',
    points: 0,
    metal: ['#c9d1dc', '#ffffff', '#aeb7c4'],
    stripe: '#e0503a',
    band: '#2f5fbf',
  },
  {
    id: 'nacht',
    name: 'Nachtflug',
    points: 50,
    metal: ['#1f2a44', '#3b4d78', '#18203a'],
    stripe: '#38bdf8',
    band: '#a78bfa',
  },
  {
    id: 'feuer',
    name: 'Feuervogel',
    points: 150,
    metal: ['#d9480f', '#ff8a3d', '#b83a0a'],
    stripe: '#ffd43b',
    band: '#1b1b1b',
  },
  {
    id: 'arktis',
    name: 'Arktis',
    points: 300,
    metal: ['#d7f0f7', '#ffffff', '#b5dbe8'],
    stripe: '#0ea5a5',
    band: '#155e75',
  },
  {
    id: 'gold',
    name: 'Goldrakete',
    points: 550,
    metal: ['#b8860b', '#ffe08a', '#8a6508'],
    stripe: '#2b2b2b',
    band: '#7c2d12',
  },
  {
    id: 'galaxie',
    name: 'Galaxie',
    points: 900,
    metal: ['#312e81', '#7c3aed', '#1e1b4b'],
    stripe: '#f472b6',
    band: '#22d3ee',
  },
  {
    id: 'sonnenwind',
    name: 'Sonnenwind',
    points: 1300,
    metal: ['#fff4d6', '#ffffff', '#f5d38a'],
    stripe: '#f97316',
    band: '#dc2626',
  },
];

let paint: Paint = PAINTS[0]!;
let METAL: string[] = paint.metal;
/** Seitlicher Anteil der Sonne (1 = von links, −1 = von rechts, dazwischen stetig) und wie hell. */
let lightSide = 1;
let lightLevel = 1;
/** Glühen durch Hitze (0…1). */
let glow = 0;
/** Wie weit die Luftbremsen ausgefahren sind (0…1). */
let brakeOpen = 0;
/** Wie weit die Solarflügel ausgeklappt sind (0…1). */
let solarOpen = 0;
/** Helligkeit der Landescheinwerfer (0…1). */
let lampsOn = 0;
/** Wie weit die Lande-Airbags aufgeblasen sind (0…1). */
let bagsOpen = 0;
/** Schub des Triebwerks (0…1): wärmt die Glocke am unteren Rand. */
let nozzleThrottle = 0;

/** Lackierung für alle folgenden Zeichnungen wählen. */
export function setPaint(id: string): void {
  paint = PAINTS.find((p) => p.id === id) ?? PAINTS[0]!;
  METAL = paint.metal;
}

/**
 * Licht für die folgenden Zeichnungen: seitlicher Anteil der Sonnenrichtung (−1 … 1, 0 = von vorn
 * oder hinten), Helligkeit (0 = Nacht) und Hitze.
 */
export function setLighting(side: number, level: number, heat = 0): void {
  lightSide = Math.max(-1, Math.min(1, side));
  lightLevel = Math.max(0.25, Math.min(1, level));
  glow = Math.max(0, Math.min(1, heat));
}

function rgbHex(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

type Rgb = number[];

/** Kanäle 0…255 unter dem Licht, ungerundet, damit Verläufe zwischen zwei Lichtlagen mischen können. */
function shadeRgb(hex: string, k = 1, to?: string, mix = 0): Rgb {
  const c = rgbHex(hex);
  const d = to ? rgbHex(to) : c;
  // Hitze färbt rotglühend, Dunkelheit dunkelt ab.
  const hot = [255, 90, 30];
  return c.map((x0, i) => {
    const x = x0 + (d[i]! - x0) * mix;
    const h = x + (hot[i]! - x) * glow * 0.75;
    return Math.max(0, Math.min(255, h * k * (0.35 + 0.65 * lightLevel)));
  });
}

function rgbCss(c: Rgb): string {
  return `rgb(${Math.round(c[0]!)},${Math.round(c[1]!)},${Math.round(c[2]!)})`;
}

/** Farbe unter dem aktuellen Licht; `k` hellt auf (> 1) oder dunkelt ab (< 1), `mix` mischt `to` bei. */
function shade(hex: string, k = 1, to?: string, mix = 0): string {
  return rgbCss(shadeRgb(hex, k, to, mix));
}

/** Stufen des Zylinderverlaufs bei Sonne von links: Lage (0…1 über die Breite) und Farbe. */
function cylinderStops(stops: string[]): [number, Rgb][] {
  return [
    [0, shadeRgb(stops[0]!, 0.55)],
    [0.1, shadeRgb(stops[0]!)],
    [0.3, shadeRgb(stops[1]!, 1.04)],
    [0.42, shadeRgb(stops[1]!)],
    [0.64, shadeRgb(stops[1]!, 1, stops[2], 0.6)],
    [0.88, shadeRgb(stops[2]!)],
    [1, shadeRgb(stops[2]!, 0.4)],
  ];
}

/** Farbe an der Lage q zwischen den Stufen, linear wie beim Canvas-Verlauf. */
function stopColor(table: [number, Rgb][], q: number): Rgb {
  let i = 0;
  while (i < table.length - 2 && q > table[i + 1]![0]) i++;
  const [a, from] = table[i]!;
  const [b, to] = table[i + 1]!;
  const t = Math.max(0, Math.min(1, (q - a) / (b - a)));
  return from.map((x, k) => x + (to[k]! - x) * t);
}

/**
 * Lagen der Stufen auf der Sonnenseite und ihren Spiegelbildern (1 − Lage): dort knickt der
 * gemischte Verlauf.
 */
const CYLINDER_SPOTS = [0, 0.1, 0.12, 0.3, 0.36, 0.42, 0.58, 0.64, 0.7, 0.88, 0.9, 1];

/** Breite des Randlichts als Anteil der Breite, von der Sonnenkante aus gemessen. */
const RIM_WIDTH = 0.18;

/** Anteil des Randlichts an der Lage q: 1 an der Sonnenkante, 0 ab RIM_WIDTH (weich abfallend). */
function rimFall(q: number): number {
  return Math.max(0, 1 - q / RIM_WIDTH) ** 2;
}

/**
 * Zylinder-Schattierung quer über ein Bauteil: dunkler Rand, Glanz auf der Sonnenseite,
 * weicher Übergang und tiefer Schatten am abgewandten Rand – so wirkt es rund statt flach.
 * Mit `rim` läuft zusätzlich ein heller Randstreifen in der Farbe des Teils an der Sonnenkante aus.
 */
function hGrad(
  ctx: CanvasRenderingContext2D,
  w: number,
  stops: string[],
  cx = 0,
  rim = false,
): CanvasGradient {
  // Sonne von links und von rechts sind Spiegelbilder. Dazwischen mischen beide Verläufe stetig,
  // damit die Glanzseite wandert statt bei Sonne von vorn auf die andere Flanke zu springen.
  const table = cylinderStops(stops);
  const mirror = (1 - lightSide) / 2;
  const rimRgb = rim ? shadeRgb(stops[1]!, 1, '#ffffff', 0.6) : null;
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  for (const q of CYLINDER_SPOTS) {
    const lit = stopColor(table, q);
    const other = stopColor(table, 1 - q);
    const c = lit.map((x, k) => x + (other[k]! - x) * mirror);
    if (rimRgb) {
      // Die Kante zur Sonne wird heller; auf der Schattenseite bleibt sie dunkel.
      const share = 0.9 * ((1 - mirror) * rimFall(q) + mirror * rimFall(1 - q));
      for (let k = 0; k < 3; k++) c[k] = c[k]! + (rimRgb[k]! - c[k]!) * share;
    }
    g.addColorStop(q, rgbCss(c));
  }
  return g;
}

/** Glanzstreifen auf einer runden Fläche (Sonnenseite). */
function sheen(ctx: CanvasRenderingContext2D, w: number, y0: number, h: number, cx = 0): void {
  if (h < 0.6) return;
  const x = cx - lightSide * w * 0.2;
  const g = ctx.createLinearGradient(x - w * 0.08, 0, x + w * 0.08, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${0.42 * lightLevel})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w * 0.08, y0 + 0.25, w * 0.16, h - 0.5);
}

// ------------------------------------------------------------------ Bauteile

function nozzle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  w: number,
  y0: number,
  h: number,
  extension?: string,
) {
  const mountH = h * 0.3;
  ctx.fillStyle = shade('#59616e');
  ctx.fillRect(cx - w * 0.3, y0 + h - mountH, w * 0.6, mountH);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, y0 + h - mountH);
  ctx.lineTo(cx + w * 0.22, y0 + h - mountH);
  ctx.quadraticCurveTo(cx + w * 0.28, y0 + h * 0.3, cx + w / 2, y0);
  ctx.lineTo(cx - w / 2, y0);
  ctx.quadraticCurveTo(cx - w * 0.28, y0 + h * 0.3, cx - w * 0.22, y0 + h - mountH);
  ctx.closePath();
  ctx.fillStyle = hGrad(ctx, w, ['#2a2f38', '#8d96a6', '#23272f'], cx);
  ctx.fill();
  if (extension) {
    // Düsenverlängerung aus Niob: der untere Teil der Glocke in eigener Farbe
    ctx.save();
    ctx.clip();
    ctx.fillStyle = hGrad(ctx, w, [extension, '#e7d3b0', extension], cx);
    ctx.fillRect(cx - w / 2, y0, w, h * 0.42);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(cx - w / 2, y0 + h * 0.42 - 0.05, w, 0.1);
    ctx.restore();
  }
  ctx.stroke();
  if (nozzleThrottle > 0) {
    // Warmer Schimmer am Austritt: die Glocke bleibt unter Schub nahe am Austritt heiß. Der Pfad
    // ist noch die Glocke, deshalb füllt dieser Schritt sie mit dem Verlauf nach.
    const warm = ctx.createLinearGradient(0, y0, 0, y0 + h * 0.4);
    warm.addColorStop(0, `rgba(255,170,90,${0.55 * nozzleThrottle})`);
    warm.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = warm;
    ctx.fill();
  }
  // Innenseite der Düse (dunkle Öffnung) und Glut nach dem Brennen
  ctx.beginPath();
  ctx.ellipse(cx, y0 + 0.04, w / 2 - 0.04, Math.max(0.06, w * 0.06), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#12151b';
  ctx.fill();
}

/** Zeichnet ein Bauteil; Koordinaten in Metern, y nach oben, Unterkante bei y0. */
export function drawPart(
  ctx: CanvasRenderingContext2D,
  def: PartDef,
  y0: number,
  footY = y0,
): void {
  const { width: w, height: h } = def;
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = 'rgba(20,26,40,0.55)';
  switch (def.kind) {
    case 'tank': {
      if (def.topWidth) {
        // Tankadapter: Kegelstumpf von der dicken zur schlanken Stufe
        const t = def.topWidth;
        ctx.beginPath();
        ctx.moveTo(-w / 2, y0);
        ctx.lineTo(w / 2, y0);
        ctx.lineTo(t / 2, y0 + h);
        ctx.lineTo(-t / 2, y0 + h);
        ctx.closePath();
        ctx.fillStyle = hGrad(ctx, w, METAL, 0, true);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = shade(paint.stripe);
        ctx.fillRect(-w / 2, y0, w, 0.28);
        ctx.fillStyle = shade(paint.band);
        ctx.fillRect(-w / 2, y0 + h * 0.55, w, 0.3);
        ctx.fillStyle = 'rgba(20,26,40,0.2)';
        for (let x = -w / 2 + 0.4; x < w / 2; x += 0.5) {
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo((x * t) / w, y0 + h);
          ctx.lineTo((x * t) / w + 0.03, y0 + h);
          ctx.lineTo(x + 0.03, y0);
          ctx.fill();
        }
        sheen(ctx, (w + t) / 2, y0, h);
        ctx.restore();
        ctx.stroke();
        break;
      }
      ctx.fillStyle = hGrad(ctx, w, METAL, 0, true);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      ctx.fillStyle = shade(paint.stripe);
      ctx.fillRect(-w / 2, y0 + h - 0.28, w, 0.28);
      ctx.fillRect(-w / 2, y0, w, 0.28);
      if (h > 4) {
        ctx.fillStyle = shade(paint.band);
        ctx.fillRect(-w / 2, y0 + h * 0.5 - 0.35, w, 0.7);
      }
      if (h > 10) {
        // Große Tanks: Schriftzug-Feld und Nieten
        ctx.fillStyle = shade(paint.band);
        ctx.fillRect(-w / 2, y0 + h * 0.78 - 0.2, w, 0.4);
        ctx.fillStyle = 'rgba(20,26,40,0.25)';
        for (let yy = y0 + 1; yy < y0 + h - 1; yy += 1.4) ctx.fillRect(-w / 2, yy, w, 0.04);
      }
      if (w < 2) {
        // Schmale Sondentanks: Streben und eine Leitung
        ctx.fillStyle = shade('#6b7280');
        ctx.fillRect(w * 0.18, y0 + 0.3, 0.08, h - 0.6);
      }
      sheen(ctx, w, y0, h);
      break;
    }
    case 'capsule': {
      const top = w * 0.36;
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0);
      ctx.lineTo(w / 2, y0);
      ctx.lineTo(top / 2, y0 + h);
      ctx.lineTo(-top / 2, y0 + h);
      ctx.closePath();
      ctx.fillStyle = hGrad(ctx, w, METAL, 0, true);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(paint.stripe);
      ctx.fillRect(-w / 2, y0, w, 0.2);
      ctx.beginPath();
      ctx.arc(0, y0 + h * 0.45, w * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = '#1b2a4a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-w * 0.04 * lightSide, y0 + h * 0.48, w * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160,210,255,0.8)';
      ctx.fill();
      if (w > 3) {
        // Große Kapsel: zwei weitere Fenster und ein Hitzeschutzring
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(sgn * w * 0.2, y0 + h * 0.3, w * 0.07, 0, Math.PI * 2);
          ctx.fillStyle = '#1b2a4a';
          ctx.fill();
        }
        ctx.fillStyle = shade('#5b3a24');
        ctx.fillRect(-w / 2, y0, w, 0.12);
      }
      break;
    }
    case 'probe': {
      if (def.id === 'sonde-xl') {
        // Sondenkern Kepler: Gehäuse mit Goldfolie, Radiatoren, großer Parabolantenne
        ctx.fillStyle = hGrad(ctx, w, ['#3a3f4a', '#8a93a3', '#2c3038']);
        ctx.fillRect(-w / 2, y0, w, h * 0.55);
        ctx.strokeRect(-w / 2, y0, w, h * 0.55);
        ctx.fillStyle = hGrad(ctx, w * 0.8, ['#8a6508', '#ffd76a', '#b8860b']);
        ctx.fillRect(-w * 0.4, y0 + h * 0.08, w * 0.8, h * 0.36);
        ctx.strokeStyle = 'rgba(120,80,0,0.45)';
        ctx.lineWidth = 0.03;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(-w * 0.4, y0 + h * 0.08 + (h * 0.36 * k) / 4);
          ctx.lineTo(w * 0.4, y0 + h * 0.08 + (h * 0.36 * k) / 4 + 0.05);
          ctx.stroke();
        }
        // Reaktionsrad-Gehäuse (orange Markierung)
        ctx.fillStyle = shade('#f59e0b');
        ctx.fillRect(-w / 2, y0 + h * 0.46, w, h * 0.06);
        // Antennenschüssel auf einem Mast
        ctx.strokeStyle = shade('#c9d1dc');
        ctx.lineWidth = 0.1;
        ctx.beginPath();
        ctx.moveTo(0, y0 + h * 0.55);
        ctx.lineTo(0, y0 + h * 0.72);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w * 0.45, y0 + h);
        ctx.quadraticCurveTo(0, y0 + h * 0.55, w * 0.45, y0 + h);
        ctx.closePath();
        ctx.fillStyle = hGrad(ctx, w * 0.9, ['#9ca3af', '#ffffff', '#b8c0cc']);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,26,40,0.55)';
        ctx.lineWidth = 0.05;
        ctx.stroke();
        ctx.fillStyle = shade('#4b5563');
        ctx.fillRect(-0.05, y0 + h * 0.8, 0.1, h * 0.22);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(w * 0.3, y0 + h * 0.2, 0.12, 0.12);
        break;
      }
      // Sondenkern: flaches Gehäuse mit Goldfolie und Antennenschüssel
      ctx.fillStyle = hGrad(ctx, w, ['#3a3f4a', '#8a93a3', '#2c3038']);
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0);
      ctx.lineTo(w / 2, y0);
      ctx.lineTo(w * 0.36, y0 + h * 0.7);
      ctx.lineTo(-w * 0.36, y0 + h * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade('#d4a017');
      ctx.fillRect(-w * 0.42, y0 + h * 0.25, w * 0.84, h * 0.18);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(w * 0.18, y0 + h * 0.5, w * 0.08, w * 0.08);
      ctx.strokeStyle = shade('#c9d1dc');
      ctx.lineWidth = 0.08;
      ctx.beginPath();
      ctx.moveTo(0, y0 + h * 0.7);
      ctx.lineTo(0, y0 + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, y0 + h, w * 0.28, h * 0.12, 0, 0, Math.PI);
      ctx.fillStyle = shade('#e5e7eb');
      ctx.fill();
      break;
    }
    case 'payload': {
      if (def.id === 'teleskop') drawTelescopeBody(ctx, w, h, y0, false);
      else drawSatelliteBody(ctx, w, h, y0, false);
      break;
    }
    case 'chute': {
      ctx.beginPath();
      ctx.ellipse(0, y0, w / 2, h, 0, 0, Math.PI);
      ctx.fillStyle = def.id === 'fallschirm-s' ? shade('#e5484d') : shade('#f28c28');
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-0.06, y0, 0.12, h * 0.9);
      break;
    }
    case 'shield': {
      // Hitzeschild: gewölbte, dunkel verkohlte Schale
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0 + h);
      ctx.quadraticCurveTo(0, y0 - h * 0.9, w / 2, y0 + h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y0 - h, 0, y0 + h);
      g.addColorStop(0, shade('#3b2416'));
      g.addColorStop(1, shade('#8a5a3a'));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 0.04;
      for (let x = -w / 2 + 0.3; x < w / 2; x += 0.35) {
        ctx.beginPath();
        ctx.moveTo(x, y0 + h);
        ctx.lineTo(x * 0.8, y0 + h * 0.2);
        ctx.stroke();
      }
      if (def.shieldFactor !== undefined && def.shieldFactor < 0.2) {
        // Großer Schild: heller Randring aus Keramik
        ctx.fillStyle = shade('#d6cfc4');
        ctx.fillRect(-w / 2, y0 + h - 0.1, w, 0.1);
      }
      break;
    }
    case 'engine': {
      if (def.id === 'mammut') {
        // Bündel aus drei Düsen
        for (const cx of [-w * 0.3, 0, w * 0.3]) nozzle(ctx, cx, w * 0.42, y0, h * 0.9);
        ctx.fillStyle = shade('#59616e');
        ctx.fillRect(-w / 2, y0 + h * 0.82, w, h * 0.18);
      } else if (def.id === 'ionen') {
        // Ionentriebwerk: Zylinder mit Gitter
        ctx.fillStyle = hGrad(ctx, w, ['#4b5563', '#9ca3af', '#374151']);
        ctx.fillRect(-w / 2, y0 + h * 0.15, w, h * 0.85);
        ctx.strokeRect(-w / 2, y0 + h * 0.15, w, h * 0.85);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-w * 0.4, y0, w * 0.8, h * 0.18);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 0.03;
        for (let x = -w * 0.35; x <= w * 0.35; x += w * 0.12) {
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.lineTo(x, y0 + h * 0.18);
          ctx.stroke();
        }
      } else if (def.id === 'herkules') {
        // Herkules: Schubgerüst mit Turbopumpen über einer riesigen Vakuumglocke
        ctx.fillStyle = shade('#4b5563');
        ctx.fillRect(-w * 0.42, y0 + h * 0.78, w * 0.84, h * 0.22);
        ctx.strokeRect(-w * 0.42, y0 + h * 0.78, w * 0.84, h * 0.22);
        for (const sgn of [-1, 1]) {
          ctx.fillStyle = hGrad(ctx, 0.5, ['#374151', '#9ca3af', '#1f2937'], sgn * w * 0.28);
          ctx.fillRect(sgn * w * 0.28 - 0.25, y0 + h * 0.6, 0.5, h * 0.25);
        }
        nozzle(ctx, 0, w, y0, h * 0.84, '#8b5e34');
        ctx.fillStyle = shade('#b45309');
        ctx.fillRect(-w * 0.2, y0 + h * 0.64, w * 0.4, h * 0.035);
        ctx.fillRect(-w * 0.28, y0 + h * 0.52, w * 0.56, h * 0.03);
      } else {
        const vacuumBell = def.id === 'hermes' ? '#7c5a3a' : undefined;
        nozzle(ctx, 0, w, y0, h, vacuumBell);
        if (def.id === 'moewe') {
          // Möwe: kompakte Brennkammer mit orangem Ring
          ctx.fillStyle = shade('#ea580c');
          ctx.fillRect(-w * 0.24, y0 + h * 0.66, w * 0.48, h * 0.07);
        }
        if (def.id === 'adler') {
          // Adler: Turbopumpe seitlich und Abgasleitung
          ctx.fillStyle = hGrad(ctx, 0.5, ['#374151', '#9ca3af', '#1f2937'], w * 0.3);
          ctx.fillRect(w * 0.3 - 0.25, y0 + h * 0.5, 0.5, h * 0.35);
          ctx.strokeRect(w * 0.3 - 0.25, y0 + h * 0.5, 0.5, h * 0.35);
          ctx.fillStyle = shade('#1f2937');
          ctx.fillRect(w * 0.3 - 0.08, y0 + h * 0.2, 0.16, h * 0.32);
          ctx.fillStyle = shade(paint.stripe);
          ctx.fillRect(-w * 0.3, y0 + h * 0.74, w * 0.6, h * 0.05);
        }
        if (def.id === 'hermes') {
          ctx.fillStyle = shade('#b45309');
          ctx.fillRect(-w * 0.2, y0 + h * 0.66, w * 0.4, h * 0.05);
        }
        if (def.id === 'orion') {
          // Orion: blaue Brennkammer mit zwei Ringen
          ctx.fillStyle = shade('#1d4ed8');
          ctx.fillRect(-w * 0.22, y0 + h * 0.7, w * 0.44, h * 0.08);
          ctx.fillRect(-w * 0.3, y0 + h * 0.5, w * 0.6, h * 0.05);
        }
        if (def.id === 'nova') {
          // Vakuumdüse: goldener Kühlring am Hals
          ctx.fillStyle = shade('#b45309');
          ctx.fillRect(-w * 0.26, y0 + h * 0.62, w * 0.52, h * 0.06);
        }
        if (def.id === 'atom') {
          // Kühlrippen und Strahlenzeichen
          ctx.fillStyle = shade('#6b7280');
          for (const sgn of [-1, 1])
            ctx.fillRect(sgn * w * 0.3 - 0.06, y0 + h * 0.45, 0.12, h * 0.5);
          ctx.beginPath();
          ctx.arc(0, y0 + h * 0.84, w * 0.13, 0, Math.PI * 2);
          ctx.fillStyle = '#facc15';
          ctx.fill();
          ctx.fillStyle = '#111827';
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(0, y0 + h * 0.84);
            ctx.arc(0, y0 + h * 0.84, w * 0.11, k * 2.094 + 0.26, k * 2.094 + 1.3);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'decoupler': {
      ctx.fillStyle = '#2b2f36';
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w / 2, y0, w, h);
      ctx.clip();
      ctx.fillStyle = shade('#f2c230');
      for (let x = -w / 2 - h; x < w / 2; x += 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x + 0.25, y0);
        ctx.lineTo(x + 0.25 + h, y0 + h);
        ctx.lineTo(x + h, y0 + h);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'booster': {
      ctx.fillStyle = shade('#59616e');
      ctx.fillRect(-w / 2 - 0.3, y0, w + 0.6, h);
      const foot = Math.min(footY, y0);
      const pod = boosterPod(def);
      const top = y0 + h + pod.rise;
      const liquid = def.id === 'booster-fl';
      for (const sgn of [-1, 1]) {
        const cx = sgn * (w / 2 + pod.offset);
        const bw = pod.width;
        ctx.save();
        ctx.translate(cx, 0);
        // Streben zur Rakete
        ctx.fillStyle = shade('#4b5563');
        ctx.fillRect(sgn > 0 ? -pod.offset - 0.05 : bw / 2 - 0.05, top - 2.2, pod.offset, 0.18);
        ctx.fillRect(sgn > 0 ? -pod.offset - 0.05 : bw / 2 - 0.05, foot + 1.6, pod.offset, 0.18);
        ctx.fillStyle = liquid
          ? hGrad(ctx, bw, ['#b45a1c', '#f0a060', '#8a3f10'])
          : hGrad(ctx, bw, METAL);
        ctx.fillRect(-bw / 2, foot + 0.6, bw, top - foot - 0.6);
        ctx.strokeRect(-bw / 2, foot + 0.6, bw, top - foot - 0.6);
        if (liquid) {
          // Isolierschaum mit Ringen, oben eine helle Kappe mit Band
          ctx.fillStyle = 'rgba(60,20,0,0.18)';
          for (let yy = foot + 2; yy < top - 1; yy += 1.6) ctx.fillRect(-bw / 2, yy, bw, 0.06);
          ctx.fillStyle = shade(paint.band);
          ctx.fillRect(-bw / 2, foot + 0.6, bw, 0.5);
        } else if (top - foot > 6) {
          // Segmentfugen des Feststoffmotors
          ctx.fillStyle = 'rgba(20,26,40,0.28)';
          for (let yy = foot + 3; yy < top - 2; yy += 3) ctx.fillRect(-bw / 2, yy, bw, 0.08);
        }
        sheen(ctx, bw, foot + 0.6, top - foot - 0.6);
        ctx.fillStyle = shade(paint.stripe);
        ctx.fillRect(-bw / 2, top - 0.9, bw, 0.25);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, top);
        ctx.quadraticCurveTo(0, top + 1.8, bw / 2, top);
        ctx.closePath();
        ctx.fillStyle = shade('#e8ecf2');
        ctx.fill();
        ctx.stroke();
        if (liquid) {
          nozzle(ctx, 0, bw * 0.9, foot - 0.3, 1.0);
        } else {
          ctx.fillStyle = '#3b414c';
          ctx.beginPath();
          ctx.moveTo(-bw * 0.3, foot + 0.6);
          ctx.lineTo(bw * 0.3, foot + 0.6);
          ctx.lineTo(bw * 0.45, foot);
          ctx.lineTo(-bw * 0.45, foot);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case 'legs': {
      ctx.fillStyle = shade('#6b7380');
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeStyle = shade('#3b414c');
      ctx.lineWidth = 0.22;
      ctx.lineCap = 'round';
      const foot = Math.min(footY, y0) - 0.1;
      if (def.id === 'beine-xl') {
        // Öldämpfer: dicke Zylinder an den Beinen
        ctx.strokeStyle = shade('#f59e0b');
        ctx.lineWidth = 0.34;
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo((sgn * w) / 2, y0 + h * 0.5);
          ctx.lineTo(sgn * (w / 2 + 0.8), foot + 0.9);
          ctx.stroke();
        }
        ctx.strokeStyle = shade('#3b414c');
        ctx.lineWidth = 0.22;
      }
      const reach = legReach(def);
      const pad = def.id === 'beine-s' ? 0.55 : 0.9;
      if (def.id === 'beine-s') ctx.lineWidth = 0.14;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo((sgn * w) / 2, y0 + h * 0.6);
        ctx.lineTo(sgn * (w / 2 + reach), foot + 0.3);
        ctx.stroke();
        ctx.fillStyle = shade('#3b414c');
        ctx.fillRect(sgn * (w / 2 + reach) - pad / 2, foot, pad, 0.25);
      }
      break;
    }
    case 'nose': {
      // Spitze Verkleidung (Ogive)
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0);
      ctx.bezierCurveTo(-w / 2, y0 + h * 0.55, -w * 0.14, y0 + h * 0.96, 0, y0 + h);
      ctx.bezierCurveTo(w * 0.14, y0 + h * 0.96, w / 2, y0 + h * 0.55, w / 2, y0);
      ctx.closePath();
      ctx.fillStyle = hGrad(ctx, w, METAL, 0, true);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = shade(paint.stripe);
      ctx.fillRect(-w / 2, y0, w, 0.22);
      ctx.beginPath();
      ctx.arc(0, y0 + h - 0.12, 0.12, 0, Math.PI * 2);
      ctx.fillStyle = shade(paint.band);
      ctx.fill();
      break;
    }
    case 'fairing': {
      // Nutzlastverkleidung: Zylinder mit stumpfer Ogive, senkrechte Trennfuge der zwei Hälften
      const body = h * 0.42;
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0);
      ctx.lineTo(-w / 2, y0 + body);
      ctx.bezierCurveTo(-w / 2, y0 + body + (h - body) * 0.62, -w * 0.18, y0 + h, 0, y0 + h);
      ctx.bezierCurveTo(w * 0.18, y0 + h, w / 2, y0 + body + (h - body) * 0.62, w / 2, y0 + body);
      ctx.lineTo(w / 2, y0);
      ctx.closePath();
      ctx.fillStyle = hGrad(ctx, w, METAL);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade(paint.stripe);
      ctx.fillRect(-w / 2, y0, w, 0.22);
      ctx.fillStyle = shade(paint.band);
      ctx.fillRect(-w / 2, y0 + body - 0.16, w, 0.32);
      ctx.fillStyle = 'rgba(20,26,40,0.4)';
      ctx.fillRect(-0.025, y0, 0.05, h);
      // Entlüftungsklappen nahe der Fuge
      for (const sgn of [-1, 1]) ctx.fillRect(sgn * w * 0.22 - 0.09, y0 + body * 0.45, 0.18, 0.1);
      sheen(ctx, w, y0, h);
      ctx.restore();
      ctx.stroke();
      break;
    }
    case 'structure': {
      // Zwischenstufe: leerer Kegelstumpf aus Kohlefaser mit Versteifungsringen
      const t = def.topWidth ?? w;
      ctx.beginPath();
      ctx.moveTo(-w / 2, y0);
      ctx.lineTo(w / 2, y0);
      ctx.lineTo(t / 2, y0 + h);
      ctx.lineTo(-t / 2, y0 + h);
      ctx.closePath();
      ctx.fillStyle = hGrad(ctx, w, ['#3a3f4a', '#8a93a3', '#2c3038']);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let yy = y0 + 0.25; yy < y0 + h - 0.1; yy += 0.35) ctx.fillRect(-w / 2, yy, w, 0.05);
      ctx.fillStyle = shade(paint.stripe);
      ctx.fillRect(-w / 2, y0 + h - 0.12, w, 0.12);
      sheen(ctx, (w + t) / 2, y0, h);
      ctx.restore();
      ctx.stroke();
      break;
    }
    case 'fins': {
      ctx.fillStyle = hGrad(ctx, w, ['#2f343c', '#7d8594', '#24282f']);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      // Gitterflossen links und rechts: Rahmen mit Gitter, an einem kurzen Arm
      for (const sgn of [-1, 1]) {
        const x0 = sgn > 0 ? w / 2 + 0.08 : -w / 2 - 0.98;
        ctx.fillStyle = shade('#3b414c');
        ctx.fillRect(sgn > 0 ? w / 2 : -w / 2 - 0.08, y0 + h * 0.35, 0.08, h * 0.3);
        ctx.fillStyle = 'rgba(30,34,42,0.55)';
        ctx.fillRect(x0, y0 + 0.02, 0.9, h - 0.04);
        ctx.strokeStyle = shade('#aeb6c4');
        ctx.lineWidth = 0.05;
        ctx.strokeRect(x0, y0 + 0.02, 0.9, h - 0.04);
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        for (let k = 1; k < 5; k++) {
          ctx.moveTo(x0 + k * 0.18, y0 + 0.02);
          ctx.lineTo(x0 + k * 0.18, y0 + h - 0.02);
        }
        for (let k = 1; k < 3; k++) {
          ctx.moveTo(x0, y0 + (k * h) / 3);
          ctx.lineTo(x0 + 0.9, y0 + (k * h) / 3);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(20,26,40,0.55)';
      ctx.lineWidth = 0.06;
      break;
    }
    case 'airbag': {
      if (bagsOpen > 0) {
        // Aufgeblasen: drei Kissen aus Vectran-Gewebe mit Nähten
        const r = 0.35 + 0.45 * bagsOpen;
        for (const x of [-w * 0.36, w * 0.36, 0]) {
          ctx.beginPath();
          ctx.arc(x, y0 + 0.15, r, 0, Math.PI * 2);
          ctx.fillStyle = shade('#e9e3d2');
          ctx.fill();
          ctx.strokeStyle = 'rgba(120,105,80,0.6)';
          ctx.lineWidth = 0.04;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - r * 0.7, y0 + 0.15);
          ctx.quadraticCurveTo(x, y0 + 0.15 - r * 0.25, x + r * 0.7, y0 + 0.15);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(20,26,40,0.55)';
        ctx.lineWidth = 0.06;
      }
      ctx.fillStyle = hGrad(ctx, w, ['#8f8a7c', '#d9d3c2', '#77736a']);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      // Gefaltetes Gewebe: Steppnähte
      ctx.strokeStyle = 'rgba(80,70,50,0.45)';
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      for (let x = -w / 2 + 0.3; x < w / 2; x += 0.3) {
        ctx.moveTo(x, y0 + 0.06);
        ctx.lineTo(x, y0 + h - 0.06);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(20,26,40,0.55)';
      ctx.lineWidth = 0.06;
      break;
    }
    case 'dock': {
      // Andockstutzen: Tunnel, oben breiterer Fangring mit drei Führungsblättern
      ctx.fillStyle = hGrad(ctx, w, METAL);
      ctx.fillRect(-w * 0.36, y0, w * 0.72, h * 0.6);
      ctx.strokeRect(-w * 0.36, y0, w * 0.72, h * 0.6);
      ctx.fillStyle = hGrad(ctx, w, ['#4b5563', '#c9ced6', '#3c4350']);
      ctx.fillRect(-w / 2, y0 + h * 0.6, w, h * 0.22);
      ctx.strokeRect(-w / 2, y0 + h * 0.6, w, h * 0.22);
      ctx.fillStyle = shade('#c9ced6');
      for (const x of [-w * 0.32, 0, w * 0.32]) {
        ctx.beginPath();
        ctx.moveTo(x - 0.14, y0 + h * 0.82);
        ctx.lineTo(x + 0.14, y0 + h * 0.82);
        ctx.lineTo(x + 0.06, y0 + h);
        ctx.lineTo(x - 0.06, y0 + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = shade('#f5b301');
      ctx.fillRect(-w * 0.36, y0 + h * 0.25, 0.1, 0.1);
      break;
    }
    case 'airbrake': {
      ctx.fillStyle = hGrad(ctx, w, ['#4b5563', '#9ca3af', '#374151']);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      // Klappen hängen am oberen Rand und klappen nach außen
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate((sgn * w) / 2, y0 + h);
        ctx.rotate(sgn * brakeOpen * 1.1);
        ctx.fillStyle = shade('#d1d5db');
        ctx.fillRect(sgn > 0 ? 0 : -0.16, -1.3, 0.16, 1.3);
        ctx.strokeRect(sgn > 0 ? 0 : -0.16, -1.3, 0.16, 1.3);
        ctx.fillStyle = shade(paint.stripe);
        ctx.fillRect(sgn > 0 ? 0 : -0.16, -1.3, 0.16, 0.25);
        ctx.restore();
      }
      break;
    }
    case 'wheel': {
      ctx.fillStyle = hGrad(ctx, w, ['#374151', '#6b7280', '#1f2937']);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      ctx.fillStyle = shade('#f59e0b');
      ctx.fillRect(-w / 2, y0 + h * 0.4, w, h * 0.2);
      ctx.beginPath();
      ctx.arc(0, y0 + h / 2, h * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.strokeStyle = shade('#9ca3af');
      ctx.lineWidth = 0.05;
      ctx.stroke();
      break;
    }
    case 'solar': {
      // Gehäuse mit zusammengeklappten Flügeln; im All klappen sie weit aus
      ctx.fillStyle = hGrad(ctx, w, ['#374151', '#9ca3af', '#1f2937']);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      ctx.fillStyle = shade('#d4a017');
      ctx.fillRect(-w / 2, y0 + h * 0.42, w, h * 0.16);
      for (const sgn of [-1, 1]) {
        if (solarOpen > 0) drawSolarWing(ctx, sgn, w / 2, y0 + h / 2, solarOpen);
        else {
          ctx.fillStyle = shade('#1e3a8a');
          ctx.fillRect(sgn > 0 ? w / 2 : -w / 2 - 0.22, y0 + 0.05, 0.22, h - 0.1);
          ctx.strokeRect(sgn > 0 ? w / 2 : -w / 2 - 0.22, y0 + 0.05, 0.22, h - 0.1);
        }
      }
      break;
    }
    case 'light': {
      ctx.fillStyle = hGrad(ctx, w, METAL);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      // Drei Lampen, die nach unten leuchten
      for (const x of [-w * 0.32, 0, w * 0.32]) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(x - 0.22, y0 - 0.04, 0.44, 0.18);
        ctx.fillStyle = lampsOn > 0 ? `rgba(255,248,220,${0.6 + 0.4 * lampsOn})` : shade('#9ca3af');
        ctx.fillRect(x - 0.16, y0 - 0.03, 0.32, 0.1);
      }
      break;
    }
    case 'rcs': {
      ctx.fillStyle = hGrad(ctx, w, METAL);
      ctx.fillRect(-w / 2, y0, w, h);
      ctx.strokeRect(-w / 2, y0, w, h);
      ctx.fillStyle = shade(paint.band);
      ctx.fillRect(-w / 2, y0 + h * 0.4, w, h * 0.2);
      // Düsenblöcke links und rechts mit je zwei kleinen Düsen
      for (const sgn of [-1, 1]) {
        const x0 = sgn > 0 ? w / 2 : -w / 2 - 0.28;
        ctx.fillStyle = shade('#4b5563');
        ctx.fillRect(x0, y0 + h * 0.15, 0.28, h * 0.7);
        ctx.strokeRect(x0, y0 + h * 0.15, 0.28, h * 0.7);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(x0 + 0.06, y0 + h * 0.85, 0.16, 0.08);
        ctx.fillRect(x0 + 0.06, y0 + h * 0.07, 0.16, 0.08);
      }
      break;
    }
  }
}

/** Wie weit die Landebeine seitlich ausgreifen (m). */
function legReach(def: PartDef): number {
  return def.id === 'beine-s' ? 0.8 : 1.4;
}

/** Sichtbare Breite eines Eintrags im Bauplan; Seitenteile als Paar beiderseits der Achse. */
export function entryWidth(e: string): number {
  const side = sideOf(e);
  return side > 0 ? 2 * side + visualWidth(part(e)) : visualWidth(part(e));
}

/** Sichtbare Breite eines Teils samt Boostern und Landebeinen (m). */
export function visualWidth(def: PartDef): number {
  if (def.kind === 'booster') {
    const pod = boosterPod(def);
    return def.width + 2 * (pod.offset + pod.width / 2);
  }
  if (def.kind === 'legs') return def.width + 2 * legReach(def) + 0.2;
  if (def.kind === 'airbrake' || def.kind === 'rcs' || def.kind === 'solar') return def.width + 1;
  if (def.kind === 'fins') return def.width + 1.8;
  return def.width;
}

/** Satellit: Goldfolie, Antenne, Solarflügel (eingeklappt oder ausgefahren). */
function drawSatelliteBody(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  y0: number,
  deployed: boolean,
): void {
  const bw = w * 0.62;
  if (deployed) {
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = '#9aa3b2';
      ctx.fillRect(sgn > 0 ? bw / 2 : -bw / 2 - 0.5, y0 + h * 0.45, 0.5, 0.12);
      ctx.fillStyle = '#1e3a8a';
      const x0 = sgn > 0 ? bw / 2 + 0.5 : -bw / 2 - 0.5 - 3.2;
      ctx.fillRect(x0, y0 + h * 0.2, 3.2, h * 0.6);
      ctx.strokeStyle = 'rgba(147,197,253,0.7)';
      ctx.lineWidth = 0.04;
      for (let k = 1; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x0 + k * 0.8, y0 + h * 0.2);
        ctx.lineTo(x0 + k * 0.8, y0 + h * 0.8);
        ctx.stroke();
      }
    }
  } else {
    ctx.fillStyle = shade('#1e3a8a');
    ctx.fillRect(-w / 2, y0 + 0.1, 0.18, h - 0.2);
    ctx.fillRect(w / 2 - 0.18, y0 + 0.1, 0.18, h - 0.2);
  }
  const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  g.addColorStop(0, shade('#b8860b'));
  g.addColorStop(0.4, shade('#ffd76a'));
  g.addColorStop(1, shade('#8a6508'));
  ctx.fillStyle = g;
  ctx.fillRect(-bw / 2, y0, bw, h * 0.82);
  ctx.strokeStyle = 'rgba(20,26,40,0.55)';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(-bw / 2, y0, bw, h * 0.82);
  ctx.strokeStyle = 'rgba(120,80,0,0.4)';
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-bw / 2, y0 + (h * 0.82 * k) / 4);
    ctx.lineTo(bw / 2, y0 + (h * 0.82 * k) / 4 + 0.1);
    ctx.stroke();
  }
  ctx.strokeStyle = shade('#e5e7eb');
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(0, y0 + h * 0.82);
  ctx.lineTo(0, y0 + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, y0 + h, bw * 0.4, h * 0.1, 0, 0, Math.PI);
  ctx.fillStyle = shade('#f3f4f6');
  ctx.fill();
}

/** Solarflügel eines Solarmoduls (sgn = Seite), ausgeklappt zum Anteil `open`. */
function drawSolarWing(
  ctx: CanvasRenderingContext2D,
  sgn: number,
  x0: number,
  yc: number,
  open: number,
): void {
  const len = 0.3 + 5.2 * open;
  const hh = 0.5 + 0.5 * open;
  const xs = sgn > 0 ? x0 : -x0;
  ctx.fillStyle = shade('#9aa3b2');
  ctx.fillRect(sgn > 0 ? xs : xs - 0.45, yc - 0.05, 0.45, 0.1);
  const bx = sgn > 0 ? xs + 0.45 : xs - 0.45 - len;
  const g = ctx.createLinearGradient(bx, yc - hh, bx + len, yc + hh);
  g.addColorStop(0, shade('#1e3a8a'));
  g.addColorStop(0.5, shade('#2f56b8'));
  g.addColorStop(1, shade('#172554'));
  ctx.fillStyle = g;
  ctx.fillRect(bx, yc - hh, len, 2 * hh);
  ctx.strokeStyle = 'rgba(147,197,253,0.55)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  for (let k = 0.6; k < len; k += 0.6) {
    ctx.moveTo(bx + k, yc - hh);
    ctx.lineTo(bx + k, yc + hh);
  }
  ctx.moveTo(bx, yc);
  ctx.lineTo(bx + len, yc);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,26,40,0.6)';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(bx, yc - hh, len, 2 * hh);
}

/** Weltraumteleskop: weiße Röhre mit Deckel, Goldfolie und Solarflügeln. */
function drawTelescopeBody(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  y0: number,
  deployed: boolean,
): void {
  const bw = w * 0.72;
  if (deployed) for (const sgn of [-1, 1]) drawSolarWing(ctx, sgn, bw / 2, y0 + h * 0.3, 0.7);
  else {
    ctx.fillStyle = shade('#1e3a8a');
    ctx.fillRect(-w / 2, y0 + 0.2, 0.2, h * 0.5);
    ctx.fillRect(w / 2 - 0.2, y0 + 0.2, 0.2, h * 0.5);
  }
  // Geräteteil unten (Goldfolie), Röhre darüber (silbern)
  ctx.fillStyle = hGrad(ctx, bw, ['#8a6508', '#ffd76a', '#b8860b']);
  ctx.fillRect(-bw / 2, y0, bw, h * 0.34);
  ctx.strokeStyle = 'rgba(20,26,40,0.55)';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(-bw / 2, y0, bw, h * 0.34);
  ctx.fillStyle = hGrad(ctx, bw * 0.92, ['#b8c0cc', '#ffffff', '#9aa3b2']);
  ctx.fillRect(-bw * 0.46, y0 + h * 0.34, bw * 0.92, h * 0.58);
  ctx.strokeRect(-bw * 0.46, y0 + h * 0.34, bw * 0.92, h * 0.58);
  ctx.fillStyle = 'rgba(20,26,40,0.2)';
  for (const f of [0.5, 0.66, 0.8]) ctx.fillRect(-bw * 0.46, y0 + h * f, bw * 0.92, 0.05);
  // Öffnung mit Deckel (im All aufgeklappt)
  ctx.save();
  ctx.translate(bw * 0.46, y0 + h * 0.92);
  ctx.rotate(deployed ? 1.1 : 0);
  ctx.fillStyle = shade('#d1d5db');
  ctx.fillRect(-bw * 0.94, 0, bw * 0.94, h * 0.08);
  ctx.strokeRect(-bw * 0.94, 0, bw * 0.94, h * 0.08);
  ctx.restore();
  if (deployed) {
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(-bw * 0.4, y0 + h * 0.9, bw * 0.8, h * 0.03);
  }
}

/** Ein ausgesetzter Satellit (oder ein Teleskop) im All (Ursprung = Mitte). */
export function drawSatellite(ctx: CanvasRenderingContext2D, id = 'satellit'): void {
  const def = part(id);
  if (def.id === 'teleskop') drawTelescopeBody(ctx, def.width, def.height, -def.height / 2, true);
  else drawSatelliteBody(ctx, def.width, def.height, -def.height / 2, true);
}

export interface RocketLook {
  throttle: number;
  /** Luftdichte (für die Flammenform). */
  air: number;
  chuteOpen: number;
  time: number;
  /** Luftbremsen ausgefahren (0…1). */
  brakes?: number;
  /** Bremsfläche der Fallschirme (1 = normaler Schirm). */
  chuteArea?: number;
  /** Nach der Landung: zusammensackender Schirm (Öffnung davor, Fläche, Sekunden seitdem). */
  chuteCollapse?: { open: number; area: number; age: number } | null;
  /** Solarflügel ausgeklappt (0…1). */
  solar?: number;
  /** Landescheinwerfer an (0…1). */
  lights?: number;
  /** Lande-Airbags aufgeblasen (0…1). */
  bags?: number;
}

/** Zeichnet eine Rakete (Teile von oben nach unten); Ursprung = Unterkante, y nach oben. */
/**
 * Plattennähte auf Tanks, Boostern und Strukturen: zwei dunkle Fugen mit hellem Rand, wie aus
 * Blech gefügt. Schmale Teile bleiben glatt, sonst wirken sie wie Strichcodes.
 */
function panelSeams(ctx: CanvasRenderingContext2D, def: PartDef, y: number): void {
  if (def.kind !== 'tank' && def.kind !== 'booster' && def.kind !== 'structure') return;
  if (def.width < 1.6) return;
  for (const fx of [-0.28, 0.28]) {
    const x = fx * def.width;
    ctx.fillStyle = `rgba(10,14,24,${0.22 * (0.4 + 0.6 * lightLevel)})`;
    ctx.fillRect(x - 0.02, y, 0.04, def.height);
    ctx.fillStyle = `rgba(255,255,255,${0.12 * lightLevel})`;
    ctx.fillRect(x + 0.03, y, 0.02, def.height);
  }
}

export function drawRocket(
  ctx: CanvasRenderingContext2D,
  parts: string[],
  look?: RocketLook,
): void {
  // Unterkante jedes Segments für die Landebeine.
  const segs = segments(parts);
  const bottoms = new Map<number, number>();
  let y = 0;
  let index = parts.length;
  for (let s = segs.length - 1; s >= 0; s--) {
    const seg = segs[s]!;
    const segBottom = y;
    for (let k = seg.length - 1; k >= 0; k--) {
      index--;
      bottoms.set(index, segBottom);
      y += stackHeight(seg[k]!);
    }
  }
  const top = y;

  brakeOpen = look?.brakes ?? 0;
  solarOpen = look?.solar ?? 0;
  lampsOn = look?.lights ?? 0;
  bagsOpen = look?.bags ?? 0;
  nozzleThrottle = look?.throttle ?? 0;
  if (lampsOn > 0) drawLightCones(ctx, parts, lampsOn);
  if (look && look.throttle > 0) {
    const engineId = [...parts].reverse().find((id) => part(id).kind === 'engine' && !sideOf(id));
    const kind: FlameKind = engineId ? (part(engineId).flame ?? 'chemisch') : 'chemisch';
    drawFlame(ctx, parts, look, kind);
    // Seitenbooster der untersten Stufe brennen mit.
    const bottom = segs[segs.length - 1] ?? [];
    const booster = bottom.map(part).find((d) => d.kind === 'booster');
    if (booster) {
      const pod = boosterPod(booster);
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(sgn * (booster.width / 2 + pod.offset), 0);
        drawFlame(ctx, parts, look, 'chemisch', pod.width * 0.86);
        ctx.restore();
      }
    }
    // Seitliche Triebwerke der untersten Stufe: Flamme an ihrer Unterkante, links und rechts.
    let sy = 0;
    for (let i = parts.length - 1; i >= 0 && i >= parts.length - bottom.length; i--) {
      const e = parts[i]!;
      const side = sideOf(e);
      const def = part(e);
      if (side > 0 && def.kind === 'engine')
        for (const sgn of [-1, 1]) {
          ctx.save();
          ctx.translate(sgn * side, sy);
          drawFlame(ctx, parts, look, def.flame ?? 'chemisch', def.width * 0.9);
          ctx.restore();
        }
      sy += stackHeight(e);
    }
  }

  y = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const def = part(parts[i]!);
    const side = sideOf(parts[i]!);
    if (side > 0) {
      // Seitenteil: als Paar neben dem Träger, gleiche Unterkante
      if (def.kind === 'chute' && look && look.chuteOpen > 0) continue;
      for (const sgn of [-1, 1]) {
        ctx.save();
        ctx.translate(sgn * side, 0);
        drawPart(ctx, def, y, bottoms.get(i) ?? 0);
        ctx.restore();
      }
      continue;
    }
    if (def.kind === 'chute' && look && look.chuteOpen > 0) {
      y += def.height;
      continue;
    }
    drawPart(ctx, def, y, bottoms.get(i) ?? 0);
    panelSeams(ctx, def, y);
    // Schattenfuge zum Teil darunter: die Rakete wirkt aus Stücken gebaut statt flach bemalt
    const next = parts.slice(i + 1).find((e) => !sideOf(e));
    if (next && y > 0) {
      const below = part(next);
      const seam = Math.min(def.width, below.topWidth ?? below.width);
      if (seam > 0.8 && def.kind !== 'chute' && below.kind !== 'shield') {
        // Die obere Stufe wirft unter ihrer Kante einen weichen Schatten auf die untere.
        const band = 0.4;
        const shadow = ctx.createLinearGradient(0, y, 0, y - band);
        shadow.addColorStop(0, `rgba(10,14,24,${0.45 * (0.4 + 0.6 * lightLevel)})`);
        shadow.addColorStop(1, 'rgba(10,14,24,0)');
        ctx.fillStyle = shadow;
        ctx.fillRect(-seam / 2, y - band, seam, band);
      }
    }
    y += def.height;
  }

  if (look && look.chuteOpen > 0)
    drawChute(ctx, top, look.chuteOpen, look.chuteArea ?? 1, look.time);
  if (look?.chuteCollapse) drawChuteCollapse(ctx, top, look.chuteCollapse);
  brakeOpen = 0;
  solarOpen = 0;
  lampsOn = 0;
  nozzleThrottle = 0;
}

/**
 * Kontaktschatten am Fuß der stehenden Rakete: eine flache, weiche Ellipse auf dem Boden, damit
 * die Rakete auf der Rampe steht statt darüber zu schweben. `scale` sind Pixel je Meter; die
 * Höhe der Ellipse ist in Pixeln festgelegt, damit sie beim Herauszoomen nicht zu einem Fleck wird.
 */
export function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  width: number,
  scale: number,
): void {
  const rx = width / 2 + 1.2;
  const ry = 4 / scale;
  const dark = 0.6 * (0.4 + 0.6 * lightLevel);
  ctx.save();
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(10,14,24,${dark})`);
  g.addColorStop(0.5, `rgba(10,14,24,${dark * 0.45})`);
  g.addColorStop(1, 'rgba(10,14,24,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Lichtkegel der Landescheinwerfer nach unten (additiv, wie echtes Licht). */
function drawLightCones(ctx: CanvasRenderingContext2D, parts: string[], on: number): void {
  // Nur Scheinwerfer der untersten Stufe leuchten frei nach unten – weiter oben stünde die
  // übrige Rakete im Weg.
  let y = 0;
  let lampY = -1;
  let lampW = 2.4;
  for (let i = parts.length - 1; i >= 0; i--) {
    const def = part(parts[i]!);
    if (def.kind === 'decoupler') return;
    if (def.kind === 'light' && !sideOf(parts[i]!)) {
      lampY = y;
      lampW = def.width;
      break;
    }
    y += stackHeight(parts[i]!);
  }
  if (lampY < 0) return;
  const len = 48;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, lampY, 0, lampY - len);
  g.addColorStop(0, `rgba(255,244,214,${0.34 * on})`);
  g.addColorStop(0.4, `rgba(255,240,200,${0.12 * on})`);
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-lampW * 0.4, lampY);
  ctx.lineTo(-len * 0.34, lampY - len);
  ctx.lineTo(len * 0.34, lampY - len);
  ctx.lineTo(lampW * 0.4, lampY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  parts: string[],
  look: RocketLook,
  kind: FlameKind,
  width?: number,
): void {
  const engine = [...parts].reverse().find((id) => part(id).kind === 'engine' && !sideOf(id));
  const w = width ?? (engine ? part(engine).width * 0.9 : 1.6);
  const vacuum = 1 - Math.min(1, look.air / 1.2);
  const flicker = 0.85 + 0.15 * Math.sin(look.time * 47) * Math.sin(look.time * 31);
  if (kind === 'ionen') {
    // Ionenstrahl: schmal, blau, lang und ruhig
    const len = (6 + 10 * look.throttle) * (0.95 + 0.05 * flicker);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, 'rgba(186,230,253,0.95)');
    g.addColorStop(0.3, 'rgba(96,165,250,0.6)');
    g.addColorStop(1, 'rgba(129,140,248,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, 0);
    ctx.lineTo(-w * 0.25, -len);
    ctx.lineTo(w * 0.25, -len);
    ctx.lineTo(w * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    return;
  }
  const atom = kind === 'atom';
  const thr = Math.max(0.15, look.throttle);
  // Länge wächst mit der Düse; im Vakuum dehnt sich der Strahl weit auf, in dichter Luft bleibt er
  // schlank mit Machschen Knoten.
  const len =
    Math.max(5, w * 3.2) * (0.8 + 1.3 * thr) * (1 + vacuum * 0.9) * flicker * (atom ? 1.3 : 1);
  const spread = w * (0.55 + vacuum * 1.1);
  // Leuchten um den Strahl (addiert sich zum Hintergrund – wie echtes Licht)
  const glow = softSprite(atom ? '150,190,255' : '255,150,60', 0.25);
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const yy = -len * (0.08 + k * 0.22);
      const size = w * (1.6 + k * 0.7) * (1 + vacuum * 0.8);
      ctx.globalAlpha = (0.42 - k * 0.08) * thr * (0.9 + 0.1 * flicker);
      ctx.drawImage(glow, -size, yy - size, 2 * size, 2 * size);
    }
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  if (atom) {
    g.addColorStop(0, 'rgba(240,248,255,0.95)');
    g.addColorStop(0.3, 'rgba(191,219,254,0.8)');
    g.addColorStop(0.7, 'rgba(147,197,253,0.35)');
    g.addColorStop(1, 'rgba(147,197,253,0)');
  } else {
    const a = 1 - vacuum * 0.35;
    g.addColorStop(0, `rgba(255,255,240,${0.95 * a})`);
    g.addColorStop(0.22, `rgba(255,214,102,${0.9 * a})`);
    g.addColorStop(0.55, `rgba(255,128,44,${0.6 * a})`);
    g.addColorStop(1, 'rgba(255,80,20,0)');
  }
  // Äußerer Strahl aus mehreren Zungen: jede hat eigene Länge und Schwingung, so flackert der
  // Rand wie echtes Abgas statt wie ein starrer Umriss.
  const tongues = 5;
  for (let i = 0; i < tongues; i++) {
    const phase = look.time * (9 + i * 2.3) + i * 1.9;
    const sway = Math.sin(phase) * w * (0.1 + 0.12 * vacuum);
    const reach = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(phase * 0.61 + i * 0.8));
    const spreadI = spread * (0.45 + 0.55 * (i / (tongues - 1)));
    const off = (i / (tongues - 1) - 0.5) * w * 0.8;
    const tipX = off + sway;
    const tipY = -len * reach;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-spreadI + off * 0.5, tipY * 0.45, tipX, tipY);
    ctx.quadraticCurveTo(spreadI + off * 0.5, tipY * 0.45, w / 2, 0);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.5 + 0.1 * i;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Heißer Kern als weicher Fleck: eine harte Zunge wirkt neben dem Außenschein aufgesetzt.
  const core = softSprite(atom ? '235,245,255' : '255,253,235', 0.4);
  if (core) {
    ctx.globalAlpha = 0.9;
    ctx.drawImage(core, -w * 0.45, -len * 0.4, w * 0.9, len * 0.5);
    ctx.globalAlpha = 1;
  }
  // Machsche Knoten in dichter Luft, mit nach außen auslaufendem Rand
  const knot =
    !atom && look.air > 0.3 && look.throttle > 0.3 ? softSprite('255,255,255', 0.3) : null;
  if (knot) {
    ctx.globalAlpha = 0.6;
    for (let k = 1; k <= 4; k++) {
      const yy = -len * (0.14 + k * 0.12);
      const rx = w * 0.17 * (1 - k * 0.14);
      ctx.drawImage(knot, -rx, yy - w * 0.07, 2 * rx, w * 0.14);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Fallschirm über der Spitze. Halb offen (gerefft) ist er schmal und hoch, ganz offen eine breite
 * Kuppel mit Streifen und Scheitelöffnung; er pendelt leicht im Fahrtwind.
 */
function drawChute(
  ctx: CanvasRenderingContext2D,
  top: number,
  open: number,
  area = 1,
  time = 0,
): void {
  // Größere Schirme sind breiter (Fläche wächst mit dem Quadrat).
  const k = Math.sqrt(Math.max(0.35, area));
  const full = Math.min(1, Math.max(0, (open - CHUTE_SEMI) / (1 - CHUTE_SEMI)));
  const w = (2.2 + (4.5 * Math.min(open, CHUTE_SEMI)) / CHUTE_SEMI + 11.5 * full) * k;
  const hgt = (3.6 + 1.4 * full) * k;
  const lines = (10 + 8 * full) * Math.sqrt(k);
  const sway = Math.sin(time * 1.3) * 0.05 * (0.4 + full);
  ctx.save();
  ctx.translate(0, top);
  ctx.rotate(sway);
  const y = lines;
  // Fangleinen
  ctx.strokeStyle = 'rgba(235,235,235,0.85)';
  ctx.lineWidth = 0.07;
  const n = full > 0.5 ? 6 : 4;
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w * i) / n;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x * 0.96, y);
    ctx.stroke();
  }
  // Kappe: Kuppel mit Streifen (orange/weiß)
  ctx.beginPath();
  ctx.moveTo(-w / 2, y);
  ctx.bezierCurveTo(-w / 2, y + hgt * 1.25, w / 2, y + hgt * 1.25, w / 2, y);
  ctx.quadraticCurveTo(0, y + hgt * 0.18, -w / 2, y);
  ctx.closePath();
  ctx.fillStyle = '#f28c28';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#fff4e6';
  const gores = full > 0.5 ? 8 : 4;
  for (let i = 0; i < gores; i += 2) {
    const x0 = -w / 2 + (w * i) / gores;
    ctx.fillRect(x0, y - 1, w / gores, hgt * 1.6);
  }
  // Scheitelöffnung
  ctx.fillStyle = 'rgba(20,24,36,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, y + hgt * 0.93, w * 0.06, hgt * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,60,20,0.5)';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.restore();
}

/** Nach der Landung: Der Schirm verliert die Luft, sinkt zur Seite und verschwindet. */
function drawChuteCollapse(
  ctx: CanvasRenderingContext2D,
  top: number,
  c: { open: number; area: number; age: number },
): void {
  const fade = Math.max(0, 1 - Math.max(0, c.age - 0.8) / 1.4);
  if (fade <= 0) return;
  const k = Math.sqrt(Math.max(1, c.area));
  const fall = Math.min(1, c.age / 1.1);
  const ease = fall * fall * (3 - 2 * fall);
  const lines = (10 + 8 * Math.min(1, c.open)) * Math.sqrt(k);
  // Die Kappe fällt in sich zusammen und kippt zur Seite, bis sie flach neben der Rakete liegt.
  const w = (4 + 14 * Math.min(1, c.open)) * k * (1 - 0.45 * ease);
  const h = 4.5 * k * (1 - 0.9 * ease);
  const tilt = -1.25 * ease;
  ctx.save();
  ctx.globalAlpha *= fade;
  ctx.translate(0, top);
  ctx.rotate(tilt);
  ctx.strokeStyle = 'rgba(235,235,235,0.85)';
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  for (const x of [-w / 2, 0, w / 2]) {
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(x * 0.3, lines * 0.5 * (1 - 0.6 * ease), x, lines);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, lines, w / 2, Math.max(0.3, h), 0, 0, Math.PI);
  ctx.fillStyle = '#f28c28';
  ctx.fill();
  ctx.restore();
}
