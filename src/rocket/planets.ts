/**
 * Oberflächen der Himmelskörper für die Fernansicht und die Kulisse: Jeder Körper bekommt einmal
 * ein eigenes Bild (Kontinente, Wolken, Meere, Krater, Bänder …), gezeichnet aus vielen weichen
 * Formen und dann nur noch gedreht und beleuchtet eingeblendet. Das sieht viel reicher aus als die
 * alten Einzelformen und ist schneller, weil pro Bild nur ein Bild, ein Schatten und ein Schein
 * gezeichnet werden.
 */
import { blob, hash, softSprite } from './view';
import { type Body, type BodyId } from './world';

/** Kontinente der Erde: Winkel (°), Abstand und Größe als Anteil des Radius, Form. */
const CONTINENTS: readonly [number, number, number, number][] = [
  [92, 0.78, 0.34, 1.3],
  [178, 0.66, 0.3, 2.1],
  [262, 0.8, 0.2, 0.4],
  [322, 0.62, 0.28, 3.3],
  [28, 0.5, 0.13, 5.1],
  [215, 0.2, 0.1, 4.2],
];

const SIZE = 1024;
// Die Spielwelt liegt in der Bahnebene: Man schaut von oben auf den Nordpol. Die Mitte jedes
// Bildes ist also der Pol, der Rand der Äquator (den sieht man unter der Rakete am Horizont).
const cache = new Map<BodyId, HTMLCanvasElement | null>();

/** Punkt im Bild zu Winkel (°) und Abstand (Anteil des Radius) – y zeigt im Bild nach unten. */
function at(ang: number, dist: number): [number, number] {
  const a = (ang * Math.PI) / 180;
  return [SIZE / 2 + dist * (SIZE / 2) * Math.cos(a), SIZE / 2 - dist * (SIZE / 2) * Math.sin(a)];
}

/** Zufälliger Punkt in der Scheibe (gleichmäßig verteilt). */
function spot(i: number, n: number, maxDist = 1): [number, number] {
  return at(hash(i, n) * 360, Math.sqrt(hash(i, n + 1)) * maxDist);
}

function puff(
  g: CanvasRenderingContext2D,
  rgb: string,
  x: number,
  y: number,
  r: number,
  a: number,
) {
  const img = softSprite(rgb, 0.4);
  if (!img) return;
  g.globalAlpha = a;
  g.drawImage(img, x - r, y - r, 2 * r, 2 * r);
  g.globalAlpha = 1;
}

/** Langgezogene weiche Wolke (Schliere), gedreht um `angle`. */
function streak(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  a: number,
): void {
  const img = softSprite('255,255,255', 0.45);
  if (!img) return;
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.globalAlpha = a;
  g.drawImage(img, -rx, -ry, 2 * rx, 2 * ry);
  g.restore();
}

function craters(
  g: CanvasRenderingContext2D,
  n: number,
  seed: number,
  dark: string,
  light: string,
  size = 1,
): void {
  for (let i = 0; i < n; i++) {
    const [x, y] = spot(i, seed, 0.97);
    const r = (4 + hash(i, seed + 2) ** 3 * 60) * size;
    g.fillStyle = dark;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    // heller Rand oben links, Schatten unten rechts
    g.strokeStyle = light;
    g.lineWidth = Math.max(1, r * 0.18);
    g.beginPath();
    g.arc(x, y, r * 0.92, Math.PI * 0.9, Math.PI * 1.8);
    g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.arc(x, y, r * 0.92, -Math.PI * 0.2, Math.PI * 0.7);
    g.stroke();
  }
}

function paint(b: Body, g: CanvasRenderingContext2D): void {
  const S = SIZE;
  const R = S / 2;
  const fill = (c: string) => {
    g.fillStyle = c;
    g.fillRect(0, 0, S, S);
  };
  switch (b.id) {
    case 'earth': {
      fill('#1b56a3');
      // Meerestiefe: dunklere und hellere Flächen
      for (let i = 0; i < 60; i++) {
        const [x, y] = spot(i, 101);
        puff(
          g,
          hash(i, 103) < 0.5 ? '16,52,110' : '38,104,176',
          x,
          y,
          60 + hash(i, 104) * 140,
          0.5,
        );
      }
      // Flachwasser um die Küsten
      g.fillStyle = 'rgba(64,150,200,0.55)';
      for (const [ang, dist, rad, seed] of CONTINENTS) {
        const [x, y] = at(ang, dist);
        blob(g, x, y, rad * R * 1.12, seed);
        g.fill();
      }
      // Land
      g.fillStyle = '#3d8a47';
      for (const [ang, dist, rad, seed] of CONTINENTS) {
        const [x, y] = at(ang, dist);
        blob(g, x, y, rad * R, seed);
        g.fill();
      }
      for (let i = 0; i < 26; i++) {
        const [x, y] = spot(i, 107, 0.9);
        blob(g, x, y, 10 + hash(i, 109) * 26, hash(i, 110) * 6);
        g.fill();
      }
      // Wüsten (nahe am Äquator, also am Rand), Wälder und Gebirge – nur auf dem Land
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 120; i++) {
        const [x, y] = spot(i, 111);
        const eq = Math.hypot(x - R, y - R) / R;
        const rgb =
          eq > 0.6 && hash(i, 113) < 0.55
            ? '201,168,106'
            : hash(i, 114) < 0.5
              ? '46,107,58'
              : '104,140,72';
        puff(g, rgb, x, y, 30 + hash(i, 115) * 90, 0.7);
      }
      for (let i = 0; i < 40; i++) {
        const [x, y] = spot(i, 117);
        puff(g, '120,104,88', x, y, 12 + hash(i, 118) * 28, 0.6);
      }
      g.globalCompositeOperation = 'source-over';
      // Nordpol in der Mitte: Eis
      puff(g, '240,246,252', R, R, R * 0.16, 0.9);
      for (let i = 0; i < 16; i++)
        puff(
          g,
          '240,246,252',
          R + (hash(i, 121) - 0.5) * R * 0.5,
          R + (hash(i, 122) - 0.5) * R * 0.5,
          30 + hash(i, 124) * 40,
          0.6,
        );
      // Wolken: lange Schlieren entlang der Breitengrade (Ringe um den Pol) …
      for (let i = 0; i < 420; i++) {
        const ring = hash(i, 131) < 0.5 ? 0.45 + hash(i, 132) * 0.15 : 0.7 + hash(i, 132) * 0.24;
        const a = hash(i, 133) * Math.PI * 2;
        const rr = ring * R + Math.sin(a * 5 + i) * 14;
        const size = 8 + hash(i, 134) * 30;
        streak(
          g,
          R + Math.cos(a) * rr,
          R + Math.sin(a) * rr,
          size * (1.8 + hash(i, 136) * 1.6),
          size * 0.55,
          a + Math.PI / 2 + (hash(i, 137) - 0.5) * 0.4,
          0.14 + hash(i, 135) * 0.2,
        );
      }
      // … kleine, scharfe Haufenwolken …
      for (let i = 0; i < 260; i++) {
        const [x, y] = spot(i, 151, 0.97);
        puff(g, '255,255,255', x, y, 3 + hash(i, 152) * 7, 0.35 + hash(i, 153) * 0.3);
      }
      // … und Tiefdruckwirbel mit zwei Spiralarmen
      for (let s2 = 0; s2 < 7; s2++) {
        const [cx, cy] = spot(s2, 141, 0.85);
        const turn = hash(s2, 142) < 0.5 ? 1 : -1;
        puff(g, '255,255,255', cx, cy, 12, 0.45);
        for (const arm of [0, Math.PI]) {
          for (let k = 0; k < 22; k++) {
            const a = arm + turn * k * 0.3;
            const rr = 5 + k * 3.1;
            streak(
              g,
              cx + Math.cos(a) * rr,
              cy + Math.sin(a) * rr,
              12 + k * 0.9,
              5 + k * 0.25,
              a + (turn * Math.PI) / 2,
              0.32 * (1 - k / 26),
            );
          }
        }
      }
      break;
    }
    case 'moon':
    case 'mercury':
    case 'ceres':
    case 'phobos':
    case 'ganymede': {
      const base: Partial<Record<BodyId, string>> = {
        moon: '#a3a8b0',
        mercury: '#9b9189',
        ceres: '#8e8a86',
        phobos: '#8a7b6c',
        ganymede: '#9d9384',
      };
      fill(base[b.id]!);
      const seed = b.id.length * 17;
      // Große dunkle Ebenen (Maria) bzw. helle Rillenfelder (Ganymed)
      const patches = b.id === 'moon' ? 14 : b.id === 'ganymede' ? 24 : 8;
      for (let i = 0; i < patches; i++) {
        const [x, y] = spot(i, seed, 0.85);
        const rgb =
          b.id === 'ganymede'
            ? hash(i, seed + 3) < 0.5
              ? '184,174,158'
              : '102,94,84'
            : b.id === 'moon'
              ? '104,110,120'
              : '112,104,98';
        puff(g, rgb, x, y, 60 + hash(i, seed + 4) * 160, 0.75);
      }
      // Körnung
      for (let i = 0; i < 500; i++) {
        const [x, y] = spot(i, seed + 5);
        g.fillStyle = hash(i, seed + 6) < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
        g.fillRect(x, y, 3 + hash(i, seed + 7) * 6, 3 + hash(i, seed + 8) * 6);
      }
      craters(
        g,
        b.id === 'mercury' ? 150 : b.id === 'ganymede' ? 60 : 110,
        seed + 9,
        'rgba(0,0,0,0.16)',
        'rgba(255,255,255,0.28)',
        b.id === 'phobos' ? 1.6 : 1,
      );
      if (b.id === 'moon') {
        // Strahlenkrater Tycho
        const [x, y] = at(250, 0.6);
        g.strokeStyle = 'rgba(255,255,255,0.18)';
        g.lineWidth = 3;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + hash(k, 151);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(a) * 230, y + Math.sin(a) * 230);
          g.stroke();
        }
        puff(g, '255,255,255', x, y, 26, 0.9);
      }
      if (b.id === 'ceres') {
        // Helle Salzflecken im Krater Occator
        const [x, y] = at(40, 0.35);
        puff(g, '255,255,255', x, y, 22, 0.95);
        puff(g, '255,255,255', x + 18, y + 6, 12, 0.9);
      }
      if (b.id === 'phobos') {
        // Rillen und der große Krater Stickney
        g.strokeStyle = 'rgba(0,0,0,0.18)';
        g.lineWidth = 5;
        for (let k = 0; k < 14; k++) {
          g.beginPath();
          g.moveTo(0, 150 + k * 55);
          g.quadraticCurveTo(R, 110 + k * 55 + hash(k, 161) * 60, S, 170 + k * 55);
          g.stroke();
        }
        const [x, y] = at(200, 0.45);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.arc(x, y, 150, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'mars': {
      fill('#c1502a');
      for (let i = 0; i < 90; i++) {
        const [x, y] = spot(i, 201);
        puff(
          g,
          hash(i, 203) < 0.45 ? '130,44,20' : '214,120,74',
          x,
          y,
          40 + hash(i, 204) * 150,
          0.55,
        );
      }
      // Valles Marineris
      g.strokeStyle = 'rgba(90,28,12,0.7)';
      g.lineWidth = 16;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(R - 330, R + 60);
      g.bezierCurveTo(R - 160, R + 20, R + 60, R + 110, R + 260, R + 40);
      g.stroke();
      craters(g, 60, 207, 'rgba(0,0,0,0.12)', 'rgba(255,220,190,0.22)');
      // Olympus Mons
      const [ox, oy] = at(150, 0.4);
      puff(g, '222,140,96', ox, oy, 70, 0.8);
      g.strokeStyle = 'rgba(90,30,14,0.5)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(ox, oy, 38, 0, Math.PI * 2);
      g.stroke();
      // Nordpolkappe in der Mitte
      puff(g, '255,255,255', R, R, R * 0.22, 0.95);
      for (let i = 0; i < 12; i++)
        puff(
          g,
          '255,245,240',
          R + (hash(i, 211) - 0.5) * R * 0.4,
          R + (hash(i, 212) - 0.5) * R * 0.4,
          24 + hash(i, 213) * 30,
          0.7,
        );
      break;
    }
    case 'venus': {
      fill('#e2bb73');
      for (let i = 0; i < 420; i++) {
        const band = Math.floor(hash(i, 302) * 9);
        const a = hash(i, 301) * Math.PI * 2;
        const rr = ((band + 0.5) / 9) * R + Math.sin(a * 3 + band) * 18;
        puff(
          g,
          hash(i, 303) < 0.5 ? '246,222,170' : '196,150,84',
          R + Math.cos(a) * rr,
          R + Math.sin(a) * rr,
          30 + hash(i, 304) * 60,
          0.35,
        );
      }
      break;
    }
    case 'jupiter': {
      fill('#d8b48a');
      const bands = [
        '#efe0c8',
        '#b0764a',
        '#e3cfae',
        '#a86a42',
        '#f2e6d2',
        '#c08a5c',
        '#e8d6b8',
        '#9e6340',
      ];
      // Gürtel und Zonen am Äquator (außen), die Polgegend innen gesprenkelt mit Wirbelstürmen –
      // so sieht man Jupiter von oben (Raumsonde Juno).
      const n = 9;
      for (let k = 0; k < n; k++) {
        const r0 = R * (1 - k * 0.055);
        g.fillStyle = bands[k % bands.length]!;
        g.beginPath();
        for (let j = 0; j <= 120; j++) {
          const a = (j / 120) * Math.PI * 2;
          const rr = r0 + Math.sin(a * 11 + k * 1.3) * 6 + Math.sin(a * 4 + k) * 4;
          if (j === 0) g.moveTo(R + Math.cos(a) * rr, R + Math.sin(a) * rr);
          else g.lineTo(R + Math.cos(a) * rr, R + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
      }
      // Polgegend
      g.fillStyle = '#9a8a78';
      g.beginPath();
      g.arc(R, R, R * (1 - n * 0.055), 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 200; i++) {
        const [x, y] = spot(i, 421, 1 - n * 0.055);
        puff(
          g,
          hash(i, 422) < 0.5 ? '176,160,140' : '110,100,96',
          x,
          y,
          10 + hash(i, 423) * 30,
          0.5,
        );
      }
      // weicher Übergang zu den Gürteln
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        const rr = R * (1 - n * 0.055) + (hash(i, 425) - 0.5) * 16;
        puff(
          g,
          i % 2 ? '176,160,140' : '200,176,146',
          R + Math.cos(a) * rr,
          R + Math.sin(a) * rr,
          22,
          0.55,
        );
      }
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const cx = R + Math.cos(a) * R * 0.2;
        const cy = R + Math.sin(a) * R * 0.2;
        puff(g, '230,220,205', cx, cy, 20, 0.7);
        g.strokeStyle = 'rgba(90,80,70,0.5)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(cx, cy, 14, 0, Math.PI * 1.5);
        g.stroke();
      }
      // Wirbel an den Bandgrenzen
      for (let i = 0; i < 260; i++) {
        const a = hash(i, 401) * Math.PI * 2;
        const rr = R * (1 - Math.floor(hash(i, 402) * n) * 0.055) + (hash(i, 403) - 0.5) * 10;
        puff(
          g,
          hash(i, 404) < 0.5 ? '250,240,225' : '150,95,60',
          R + Math.cos(a) * rr,
          R + Math.sin(a) * rr,
          8 + hash(i, 405) * 18,
          0.45,
        );
      }
      const spotA = 0.7;
      const [rsx, rsy] = [R + Math.cos(spotA) * R * 0.8, R + Math.sin(spotA) * R * 0.8];
      g.save();
      g.translate(rsx, rsy);
      g.rotate(spotA + Math.PI / 2);
      g.fillStyle = '#d9a283';
      g.beginPath();
      g.ellipse(0, 0, 100, 44, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#c0563a';
      g.beginPath();
      g.ellipse(0, 0, 78, 32, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      puff(g, '150,50,34', rsx, rsy, 50, 0.7);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        puff(g, '250,245,235', R + Math.cos(a) * R * 0.62, R + Math.sin(a) * R * 0.62, 14, 0.85);
      }
      break;
    }
    case 'europa': {
      fill('#e6dcc8');
      for (let i = 0; i < 40; i++) {
        const [x, y] = spot(i, 501);
        puff(
          g,
          hash(i, 502) < 0.6 ? '200,160,120' : '245,240,230',
          x,
          y,
          50 + hash(i, 503) * 120,
          0.45,
        );
      }
      g.lineCap = 'round';
      for (let k = 0; k < 70; k++) {
        const [x0, y0] = spot(k, 511);
        const a = hash(k, 512) * Math.PI * 2;
        const len = 150 + hash(k, 513) * 500;
        g.strokeStyle = `rgba(150,85,45,${0.35 + hash(k, 514) * 0.4})`;
        g.lineWidth = 1.5 + hash(k, 515) * 4;
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo(
          x0 + Math.cos(a + 0.5) * len * 0.5,
          y0 + Math.sin(a + 0.5) * len * 0.5,
          x0 + Math.cos(a) * len,
          y0 + Math.sin(a) * len,
        );
        g.stroke();
      }
      break;
    }
    case 'sun': {
      fill('#ffc640');
      for (let i = 0; i < 700; i++) {
        const [x, y] = spot(i, 601);
        puff(
          g,
          hash(i, 602) < 0.5 ? '255,240,180' : '255,160,40',
          x,
          y,
          8 + hash(i, 603) * 30,
          0.35,
        );
      }
      for (let i = 0; i < 5; i++) {
        const [x, y] = spot(i, 611, 0.7);
        puff(g, '120,50,10', x, y, 10 + hash(i, 612) * 12, 0.8);
      }
      break;
    }
  }
}

/** Das Oberflächenbild eines Körpers (einmal gezeichnet, dann gemerkt); null ohne Canvas. */
export function planetTexture(b: Body): HTMLCanvasElement | null {
  if (cache.has(b.id)) return cache.get(b.id)!;
  let c: HTMLCanvasElement | null = null;
  if (typeof document !== 'undefined') {
    c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const g = c.getContext('2d');
    if (g) {
      paint(b, g);
      // Kreis ausschneiden (für weiche Ränder beim Skalieren)
      g.globalCompositeOperation = 'destination-in';
      g.globalAlpha = 1;
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'source-over';
    } else c = null;
  }
  cache.set(b.id, c);
  return c;
}

/**
 * Stadtlichter der Erde (gleiche Abbildung wie das Oberflächenbild): Lichterhaufen an Küsten und
 * im Landesinneren, nur auf dem Land. Halbe Auflösung reicht – sie leuchten ja nur schwach.
 */
let lights: HTMLCanvasElement | null | undefined;
function cityLights(): HTMLCanvasElement | null {
  if (lights !== undefined) return lights;
  lights = null;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  const N = SIZE / 2;
  c.width = c.height = N;
  const g = c.getContext('2d');
  if (!g) return null;
  const k = N / SIZE;
  g.scale(k, k);
  const glow = softSprite('255,190,110', 0.25);
  for (let i = 0; i < 90; i++) {
    const [cx, cy] = spot(i, 171, 0.96);
    const big = hash(i, 172);
    if (glow) {
      g.globalAlpha = 0.25 + big * 0.3;
      const r = 14 + big * 26;
      g.drawImage(glow, cx - r, cy - r, 2 * r, 2 * r);
    }
    const n = 12 + Math.floor(big * 40);
    for (let j = 0; j < n; j++) {
      const a = hash(i * 64 + j, 173) * Math.PI * 2;
      const d = Math.pow(hash(i * 64 + j, 174), 1.8) * (10 + big * 34);
      const w = 2 + hash(i * 64 + j, 175) * 3.5;
      g.globalAlpha = 0.5 + hash(i * 64 + j, 176) * 0.5;
      g.fillStyle = hash(i * 64 + j, 177) < 0.2 ? '#fff4d6' : '#ffc46b';
      g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w, w);
    }
  }
  // Nur auf dem Land (dieselben Formen wie im Oberflächenbild): erst alle Kontinente in eine
  // Maske, dann einmal ausstanzen.
  const mask = document.createElement('canvas');
  mask.width = mask.height = N;
  const m = mask.getContext('2d');
  if (m) {
    m.scale(k, k);
    m.fillStyle = '#000';
    for (const [ang, dist, rad, seed] of CONTINENTS) {
      const [x, y] = at(ang, dist);
      blob(m, x, y, rad * (SIZE / 2) * 0.97, seed);
      m.fill();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
  }
  lights = c;
  return c;
}

/** Leuchtfarbe der Atmosphäre (r,g,b) – null ohne Lufthülle. */
const AIR_GLOW: Partial<Record<BodyId, string>> = {
  earth: '120,180,255',
  venus: '255,214,150',
  mars: '255,160,120',
  jupiter: '240,205,160',
  sun: '255,190,60',
};

/**
 * Zeichnet einen Körper als beleuchtete Scheibe: Oberflächenbild (gedreht mit `rot`), Schatten
 * der Nachtseite (Sonne in Richtung `sunAngle`, Bildschirmwinkel), dunklerer Rand und – mit
 * Lufthülle – ein Schein darum. false, wenn kein Bild verfügbar ist (dann zeichnet der Aufrufer
 * die einfache Form).
 */
export function drawPlanetDisk(
  ctx: CanvasRenderingContext2D,
  b: Body,
  sx: number,
  sy: number,
  rpx: number,
  rot: number,
  sunAngle: number,
  glowPx: number,
): boolean {
  const tex = planetTexture(b);
  if (!tex) return false;
  // Kleine Scheiben (Karte, ferne Körper) einmal fertig beleuchtet merken und nur noch kopieren:
  // Stadtlichter, Schatten und Rand kosten sonst bei jedem Bild viele Pixel.
  const m = ctx.getTransform();
  const dpr = Math.hypot(m.a, m.b) || 1;
  const pad = glowPx + 3;
  if (typeof document !== 'undefined' && 2 * (rpx + pad) * dpr <= 1100 && rpx > 2) {
    const qr = Math.exp(Math.round(Math.log(rpx) * 60) / 60);
    const key = `${b.id}|${Math.round(qr * dpr * 10)}|${Math.round(rot * 115)}|${Math.round(sunAngle * 115)}|${Math.round(pad)}`;
    let hit = DISKS.get(key);
    if (hit) DISKS.delete(key);
    else {
      const half = qr + pad;
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(2 * half * dpr);
      const g = c.getContext('2d');
      if (!g) return false;
      g.scale(dpr, dpr);
      paintDisk(g, b, tex, half, half, qr, rot, sunAngle, glowPx);
      hit = { canvas: c, half };
      while (DISKS.size >= 6) DISKS.delete(DISKS.keys().next().value!);
    }
    DISKS.set(key, hit);
    const k = rpx / qr;
    const h = hit.half * k;
    ctx.drawImage(hit.canvas, sx - h, sy - h, 2 * h, 2 * h);
    return true;
  }
  paintDisk(ctx, b, tex, sx, sy, rpx, rot, sunAngle, glowPx);
  return true;
}

/** Gemerkte, fertig beleuchtete kleine Scheiben (höchstens sechs, zuletzt benutzte bleiben). */
const DISKS = new Map<string, { canvas: HTMLCanvasElement; half: number }>();

function paintDisk(
  ctx: CanvasRenderingContext2D,
  b: Body,
  tex: HTMLCanvasElement,
  sx: number,
  sy: number,
  rpx: number,
  rot: number,
  sunAngle: number,
  glowPx: number,
): void {
  const glow = AIR_GLOW[b.id];
  if (glow && glowPx > 0.5) {
    const outer = rpx + glowPx;
    const g = ctx.createRadialGradient(sx, sy, rpx * 0.96, sx, sy, outer);
    g.addColorStop(0, `rgba(${glow},${b.id === 'sun' ? 0.9 : 0.6})`);
    g.addColorStop(0.35, `rgba(${glow},${b.id === 'sun' ? 0.35 : 0.22})`);
    g.addColorStop(1, `rgba(${glow},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, outer, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, rpx, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(sx, sy);
  ctx.rotate(rot);
  ctx.drawImage(tex, -rpx, -rpx, 2 * rpx, 2 * rpx);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, rpx, 0, Math.PI * 2);
  ctx.clip();
  if (b.id !== 'sun') {
    // Tag und Nacht: weicher Übergang, die Nachtseite fast schwarz
    const ux = Math.cos(sunAngle);
    const uy = Math.sin(sunAngle);
    const shade = ctx.createLinearGradient(
      sx + ux * rpx,
      sy + uy * rpx,
      sx - ux * rpx,
      sy - uy * rpx,
    );
    shade.addColorStop(0, 'rgba(255,248,230,0.08)');
    shade.addColorStop(0.42, 'rgba(0,0,0,0)');
    shade.addColorStop(0.56, 'rgba(2,4,12,0.55)');
    shade.addColorStop(0.7, 'rgba(2,4,12,0.86)');
    shade.addColorStop(1, 'rgba(2,4,12,0.9)');
    ctx.fillStyle = shade;
    ctx.fillRect(sx - rpx, sy - rpx, 2 * rpx, 2 * rpx);
    const city = b.id === 'earth' && rpx > 25 ? cityLights() : null;
    if (city) {
      // Stadtlichter nur jenseits der Tag-Nacht-Grenze, zum Rand der Nacht hin kräftiger
      const px = -uy;
      const py = ux;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [edge, alpha] of [
        [0.06, 0.45],
        [0.26, 0.5],
      ] as const) {
        ctx.save();
        ctx.beginPath();
        const ex = sx - ux * rpx * edge;
        const ey = sy - uy * rpx * edge;
        ctx.moveTo(ex + px * rpx * 1.2, ey + py * rpx * 1.2);
        ctx.lineTo(ex - px * rpx * 1.2, ey - py * rpx * 1.2);
        ctx.lineTo(ex - px * rpx * 1.2 - ux * rpx * 2.4, ey - py * rpx * 1.2 - uy * rpx * 2.4);
        ctx.lineTo(ex + px * rpx * 1.2 - ux * rpx * 2.4, ey + py * rpx * 1.2 - uy * rpx * 2.4);
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = alpha;
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.drawImage(city, -rpx, -rpx, 2 * rpx, 2 * rpx);
        ctx.restore();
      }
      ctx.restore();
    }
  }
  // Rand dunkler (Kugelform), mit Luft leicht getönt
  const limb = ctx.createRadialGradient(sx, sy, rpx * 0.55, sx, sy, rpx);
  limb.addColorStop(0, 'rgba(0,0,0,0)');
  limb.addColorStop(0.8, glow && b.id !== 'sun' ? `rgba(${glow},0.08)` : 'rgba(0,0,0,0.08)');
  limb.addColorStop(1, glow && b.id !== 'sun' ? `rgba(${glow},0.35)` : 'rgba(0,0,0,0.35)');
  ctx.fillStyle = limb;
  ctx.fillRect(sx - rpx, sy - rpx, 2 * rpx, 2 * rpx);
  ctx.restore();
  if (glow && b.id !== 'sun' && rpx > 12 && 'createConicGradient' in ctx) {
    // Heller, dünner Luftsaum auf der Tagseite (wie auf Fotos aus der Umlaufbahn)
    const cg = ctx.createConicGradient(sunAngle - Math.PI, sx, sy);
    cg.addColorStop(0, `rgba(${glow},0)`);
    cg.addColorStop(0.22, `rgba(${glow},0)`);
    cg.addColorStop(0.5, `rgba(${glow},0.85)`);
    cg.addColorStop(0.78, `rgba(${glow},0)`);
    cg.addColorStop(1, `rgba(${glow},0)`);
    ctx.strokeStyle = cg;
    ctx.lineWidth = Math.max(1, Math.min(6, rpx * 0.012));
    ctx.beginPath();
    ctx.arc(sx, sy, rpx + ctx.lineWidth * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
}
