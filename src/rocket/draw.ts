import { CHUTE_SEMI, part, segments, type FlameKind, type PartDef } from './parts';

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
/** Von welcher Seite die Sonne scheint (1 = von links, −1 = von rechts) und wie hell. */
let lightSide = 1;
let lightLevel = 1;
/** Glühen durch Hitze (0…1). */
let glow = 0;
/** Wie weit die Luftbremsen ausgefahren sind (0…1). */
let brakeOpen = 0;

/** Lackierung für alle folgenden Zeichnungen wählen. */
export function setPaint(id: string): void {
  paint = PAINTS.find((p) => p.id === id) ?? PAINTS[0]!;
  METAL = paint.metal;
}

/** Licht für die folgenden Zeichnungen: Seite der Sonne, Helligkeit (0 = Nacht) und Hitze. */
export function setLighting(side: number, level: number, heat = 0): void {
  lightSide = side < 0 ? -1 : 1;
  lightLevel = Math.max(0.25, Math.min(1, level));
  glow = Math.max(0, Math.min(1, heat));
}

function shade(hex: string): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // Hitze färbt rotglühend, Dunkelheit dunkelt ab.
  const hot = [255, 90, 30];
  const out = c.map((x, i) => {
    const h = x + (hot[i]! - x) * glow * 0.75;
    return Math.round(h * (0.35 + 0.65 * lightLevel));
  });
  return `rgb(${out[0]},${out[1]},${out[2]})`;
}

function hGrad(ctx: CanvasRenderingContext2D, w: number, stops: string[], cx = 0): CanvasGradient {
  const g = ctx.createLinearGradient(cx - (lightSide * w) / 2, 0, cx + (lightSide * w) / 2, 0);
  g.addColorStop(0, shade(stops[0]!));
  g.addColorStop(0.38, shade(stops[1]!));
  g.addColorStop(1, shade(stops[2]!));
  return g;
}

// ------------------------------------------------------------------ Bauteile

function nozzle(ctx: CanvasRenderingContext2D, cx: number, w: number, y0: number, h: number) {
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
  ctx.stroke();
  ctx.fillStyle = '#1a1d23';
  ctx.fillRect(cx - w / 2, y0, w, 0.08);
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
      ctx.fillStyle = hGrad(ctx, w, METAL);
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
      // Glanzlinie
      ctx.fillStyle = `rgba(255,255,255,${0.55 * lightLevel})`;
      ctx.fillRect(
        -lightSide * w * 0.22 - (lightSide > 0 ? 0 : w * 0.07),
        y0 + 0.4,
        w * 0.07,
        h - 0.8,
      );
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
      ctx.fillStyle = hGrad(ctx, w, METAL);
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
      drawSatelliteBody(ctx, w, h, y0, false);
      break;
    }
    case 'chute': {
      ctx.beginPath();
      ctx.ellipse(0, y0, w / 2, h, 0, 0, Math.PI);
      ctx.fillStyle = shade('#f28c28');
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
      } else {
        nozzle(ctx, 0, w, y0, h);
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
      for (const sgn of [-1, 1]) {
        const cx = sgn * (w / 2 + pod.offset);
        const bw = pod.width;
        ctx.save();
        ctx.translate(cx, 0);
        ctx.fillStyle = hGrad(ctx, bw, METAL);
        ctx.fillRect(-bw / 2, foot + 0.6, bw, top - foot - 0.6);
        ctx.strokeRect(-bw / 2, foot + 0.6, bw, top - foot - 0.6);
        ctx.fillStyle = shade(paint.stripe);
        ctx.fillRect(-bw / 2, top - 0.9, bw, 0.25);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, top);
        ctx.quadraticCurveTo(0, top + 1.8, bw / 2, top);
        ctx.closePath();
        ctx.fillStyle = shade('#e8ecf2');
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#3b414c';
        ctx.beginPath();
        ctx.moveTo(-bw * 0.3, foot + 0.6);
        ctx.lineTo(bw * 0.3, foot + 0.6);
        ctx.lineTo(bw * 0.45, foot);
        ctx.lineTo(-bw * 0.45, foot);
        ctx.closePath();
        ctx.fill();
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
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo((sgn * w) / 2, y0 + h * 0.6);
        ctx.lineTo(sgn * (w / 2 + 1.4), foot + 0.3);
        ctx.stroke();
        ctx.fillStyle = shade('#3b414c');
        ctx.fillRect(sgn * (w / 2 + 1.4) - 0.45, foot, 0.9, 0.25);
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
      ctx.fillStyle = hGrad(ctx, w, METAL);
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

/** Seitenbooster: Breite, Überstand nach oben und Abstand der Röhren. */
export function boosterPod(def: PartDef): { width: number; rise: number; offset: number } {
  return def.id === 'booster-xl'
    ? { width: 1.5, rise: 3.4, offset: 0.82 }
    : { width: 1.1, rise: 1.4, offset: 0.62 };
}

/** Sichtbare Breite eines Teils samt Boostern und Landebeinen (m). */
export function visualWidth(def: PartDef): number {
  if (def.kind === 'booster') {
    const pod = boosterPod(def);
    return def.width + 2 * (pod.offset + pod.width / 2);
  }
  if (def.kind === 'legs') return def.width + 3;
  if (def.kind === 'airbrake' || def.kind === 'rcs') return def.width + 1;
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

/** Ein ausgesetzter Satellit mit ausgefahrenen Solarflügeln (Ursprung = Mitte). */
export function drawSatellite(ctx: CanvasRenderingContext2D): void {
  const def = part('satellit');
  drawSatelliteBody(ctx, def.width, def.height, -def.height / 2, true);
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
}

/** Zeichnet eine Rakete (Teile von oben nach unten); Ursprung = Unterkante, y nach oben. */
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
      y += part(seg[k]!).height;
    }
  }
  const top = y;

  brakeOpen = look?.brakes ?? 0;
  if (look && look.throttle > 0) {
    const engineId = [...parts].reverse().find((id) => part(id).kind === 'engine');
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
  }

  y = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const def = part(parts[i]!);
    if (def.kind === 'chute' && look && look.chuteOpen > 0) {
      y += def.height;
      continue;
    }
    drawPart(ctx, def, y, bottoms.get(i) ?? 0);
    y += def.height;
  }

  if (look && look.chuteOpen > 0)
    drawChute(ctx, top, look.chuteOpen, look.chuteArea ?? 1, look.time);
  if (look?.chuteCollapse) drawChuteCollapse(ctx, top, look.chuteCollapse);
  brakeOpen = 0;
}

function drawFlame(
  ctx: CanvasRenderingContext2D,
  parts: string[],
  look: RocketLook,
  kind: FlameKind,
  width?: number,
): void {
  const engine = [...parts].reverse().find((id) => part(id).kind === 'engine');
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
  const len = (5 + 12 * look.throttle) * (1 + vacuum * 0.6) * flicker * (atom ? 1.3 : 1);
  const spread = w * (0.55 + vacuum * 0.3);
  const g = ctx.createLinearGradient(0, 0, 0, -len);
  if (atom) {
    g.addColorStop(0, 'rgba(240,248,255,0.95)');
    g.addColorStop(0.3, 'rgba(191,219,254,0.8)');
    g.addColorStop(0.7, 'rgba(147,197,253,0.35)');
    g.addColorStop(1, 'rgba(147,197,253,0)');
  } else {
    g.addColorStop(0, 'rgba(255,255,240,0.95)');
    g.addColorStop(0.25, 'rgba(255,214,102,0.9)');
    g.addColorStop(0.6, 'rgba(255,120,40,0.55)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
  }
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-spread, -len * 0.35, 0, -len);
  ctx.quadraticCurveTo(spread, -len * 0.35, w / 2, 0);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-w * 0.25, 0);
  ctx.quadraticCurveTo(0, -len * 0.45, w * 0.25, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  // Machsche Knoten in dichter Luft
  if (!atom && look.air > 0.3 && look.throttle > 0.3) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let k = 1; k <= 3; k++) {
      const yy = -len * (0.18 + k * 0.14);
      ctx.beginPath();
      ctx.ellipse(0, yy, w * 0.16 * (1 - k * 0.15), w * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
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
  const k = Math.sqrt(Math.max(1, area));
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
