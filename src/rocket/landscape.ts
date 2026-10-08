/**
 * Landschaft der Flugansicht: Bergketten und Hügel am Horizont (mit Luftperspektive), die Sonne am
 * Himmel mit Schein und Abendrot sowie die ausführliche Startanlage auf der Erde.
 */
import { GAME_EARTH, bodyState, type Body } from './world';
import { hash, local, mixHex, screenAngle, softSprite, toScreen, type View } from './view';

// ------------------------------------------------------------------ Bergketten

/** Glatter Zufallsverlauf (Wertrauschen) entlang einer Koordinate, 0…1. */
function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, seed) * (1 - u) + hash(i + 1, seed) * u;
}

interface Ridge {
  /** Farbe ohne Dunst. */
  color: string;
  /** Größte Höhe (m) und typische Breite eines Bergs (m). */
  height: number;
  width: number;
  seed: number;
  /** Wie stark die Luft die Farbe zum Horizont hin aufhellt (0…1). */
  haze: number;
  /**
   * Entfernung als Parallaxe: Aus der Nähe (starker Zoom) erscheint die Kette höchstens etwa
   * `height / depth` Pixel hoch und zieht langsamer vorbei als der Boden.
   */
  depth: number;
}

/** Hinten die hohen, fernen Ketten, vorn niedrigere Hügel. */
const RIDGES: Record<string, Ridge[]> = {
  earth: [
    { color: '#5d7598', height: 1_600, width: 6_000, seed: 71, haze: 0.42, depth: 7 },
    { color: '#4f7d52', height: 380, width: 1_900, seed: 72, haze: 0.22, depth: 4 },
  ],
  moon: [
    { color: '#7c8189', height: 1_600, width: 9_000, seed: 73, haze: 0, depth: 9 },
    { color: '#8b9098', height: 380, width: 2_200, seed: 74, haze: 0, depth: 4 },
  ],
  mercury: [
    { color: '#776e67', height: 1_300, width: 8_000, seed: 75, haze: 0, depth: 9 },
    { color: '#82796f', height: 320, width: 2_000, seed: 76, haze: 0, depth: 4 },
  ],
  mars: [
    { color: '#a7644a', height: 2_000, width: 12_000, seed: 77, haze: 0.4, depth: 11 },
    { color: '#8e4427', height: 420, width: 2_600, seed: 78, haze: 0.18, depth: 4.5 },
  ],
  venus: [
    { color: '#9d6c35', height: 1_500, width: 9_000, seed: 79, haze: 0.5, depth: 9 },
    { color: '#83541f', height: 360, width: 2_200, seed: 80, haze: 0.25, depth: 4 },
  ],
  phobos: [
    { color: '#6c5f50', height: 160, width: 1_000, seed: 81, haze: 0, depth: 1.2 },
    { color: '#756757', height: 50, width: 320, seed: 82, haze: 0, depth: 0.6 },
  ],
  europa: [
    { color: '#c4b8a2', height: 500, width: 5_000, seed: 83, haze: 0, depth: 5 },
    { color: '#cec2ac', height: 140, width: 1_300, seed: 84, haze: 0, depth: 2 },
  ],
  ganymede: [
    { color: '#81776a', height: 900, width: 7_000, seed: 85, haze: 0, depth: 7 },
    { color: '#8b8173', height: 240, width: 1_800, seed: 86, haze: 0, depth: 3 },
  ],
  ceres: [
    { color: '#74706b', height: 800, width: 6_000, seed: 87, haze: 0, depth: 7 },
    { color: '#7e7a75', height: 220, width: 1_600, seed: 88, haze: 0, depth: 3 },
  ],
};

/** Höhe einer Kette an einer Stelle (m): mehrere Wellenlängen, spitze Gipfel. */
function ridgeHeight(r: Ridge, s: number): number {
  const n =
    noise1(s, r.seed) * 0.62 +
    noise1(s * 2.3, r.seed + 1) * 0.26 +
    noise1(s * 5.7, r.seed + 2) * 0.12;
  return Math.pow(Math.max(0, n - 0.1) / 0.9, 1.35) * r.height;
}

/**
 * Berge und Hügel am Horizont, hinter dem Boden (der danach darübergezeichnet wird und ihren Fuß
 * verdeckt). Sie stehen „weit hinten“: Beim Heranzoomen wachsen sie kaum noch und ziehen
 * langsamer vorbei (Parallaxe). `mask` blendet sie stellenweise aus (z. B. über dem Meer),
 * `horizon` ist die Himmelsfarbe am Horizont (Luftperspektive), `dim` die Abdunklung bei Nacht.
 */
export function drawRidges(
  ctx: CanvasRenderingContext2D,
  v: View,
  b: Body,
  t: number,
  spin: number,
  horizon: string,
  dim: number,
  mask?: (angle: number) => number,
): void {
  const layers = RIDGES[b.id];
  if (!layers || !b.solid) return;
  const R = b.radius;
  const rpx = R * v.scale;
  if (rpx < 20_000) return;
  const fade = Math.min(1, (rpx - 20_000) / 20_000);
  const [bx, by] = bodyState(b, t);
  // Mittelpunkt des Körpers auf dem Bildschirm: Die Ansicht ist so gedreht, dass „oben“ vom
  // Körper wegzeigt – der Boden ist also ein Kreisbogen um diesen Punkt.
  const [csx, csy] = toScreen(v, bx, by);
  const phi = Math.atan2(v.cy - by, v.cx - bx) - spin;
  const s = v.scale;
  const n = Math.max(24, Math.min(220, Math.ceil(v.width / 7)));
  // In welche Richtung läuft die Oberfläche auf dem Bildschirm (mit wachsendem Winkel)?
  const probe = (a: number): number =>
    toScreen(v, bx + R * Math.cos(a + spin), by + R * Math.sin(a + spin))[0];
  const dir = probe(phi + 1e-4) >= probe(phi) ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = fade;
  for (const r of layers) {
    const k = 1 / (1 + r.depth * s);
    if (r.height * s * k < 1.2) continue;
    let color = r.haze > 0 ? mixHex(r.color, horizon, r.haze * (1 - dim * 0.6)) : r.color;
    if (dim > 0.02) color = mixHex(color, '#070a14', dim);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * v.width;
      const dx = x - csx;
      if (Math.abs(dx) >= rpx) continue;
      const groundY = csy - Math.sqrt(rpx * rpx - dx * dx);
      // Ort entlang der Oberfläche: weiter hinten zieht die Kette langsamer vorbei.
      const along = phi * R + dir * (dx / s) * Math.max(1, 0.35 * (1 + r.depth * s));
      let h = ridgeHeight(r, along / r.width);
      if (mask) h *= mask(along / R);
      const y = groundY - h * s * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(v.width, v.height * 2);
    ctx.lineTo(0, v.height * 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // Sonnenbeschienene Kante
    ctx.strokeStyle = `rgba(255,255,255,${0.1 * (1 - dim)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ Sonne am Himmel

/**
 * Die Sonne als Scheibe mit Schein und Abendrot. Sie steht über dem
 * Bodenpunkt unter der Kamera in Richtung des echten Sonnenstands – bei Sonnenuntergang sinkt sie
 * also hinter die Berge und den Boden (die danach gezeichnet werden).
 */
export function drawSkySun(
  ctx: CanvasRenderingContext2D,
  v: View,
  sun: { dir: number; elevation: number; twilight: number; day: number },
  groundY: number,
  thin: number,
  air: boolean,
  fancy = true,
): void {
  if (sun.elevation < -0.15) return;
  const W = v.width;
  const H = v.height;
  const sa = screenAngle(v, sun.dir);
  const ay = Math.max(H * 0.5, Math.min(H * 1.05, groundY));
  const D = 0.62 * Math.max(W, H);
  const x = W / 2 + Math.cos(sa) * D;
  const y = ay + Math.sin(sa) * D;
  const warm = air ? sun.twilight : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Abendrot: warmer Schein über den halben Himmel
  if (fancy && air && warm > 0.04) {
    const glow = softSprite('255,120,50', 0.05);
    if (glow) {
      const r = Math.max(W, H) * 1.1;
      ctx.globalAlpha = 0.28 * warm * (1 - thin * 0.8);
      ctx.drawImage(glow, x - r, y - r * 0.55, 2 * r, r * 1.1);
    }
  }
  if (x < -W * 0.4 || x > W * 1.4 || y < -H * 0.4 || y > H * 1.4) {
    ctx.restore();
    return;
  }
  const tint = warm > 0.3 ? '255,190,120' : '255,240,205';
  const halo = fancy ? softSprite(tint, 0.08) : null;
  if (halo) {
    const r = Math.min(W, H) * (air ? 0.07 : 0.05);
    ctx.globalAlpha = (air ? 0.22 : 0.16) * (0.4 + 0.6 * Math.max(sun.day, warm));
    ctx.drawImage(halo, x - r, y - r, 2 * r, 2 * r);
  }
  const core = softSprite('255,252,236', 0.55);
  if (core) {
    const r = 26;
    ctx.globalAlpha = 1;
    ctx.drawImage(core, x - r, y - r, 2 * r, 2 * r);
  }
  ctx.fillStyle = warm > 0.5 ? '#fff0d0' : '#fffdf4';
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ Startanlage

/**
 * Startanlage auf der Erde (Ursprung = Rampe, x nach rechts, y nach oben, in Metern):
 * Montagehalle mit Tor, Leitstand, Crawlerweg, Rampe mit Flammenschacht, Startturm mit
 * Versorgungsarmen, Blitzschutzmasten mit Seilen, Wasserturm, Kugeltanks und Flutlicht.
 */
export function drawLaunchComplex(
  ctx: CanvasRenderingContext2D,
  v: View,
  time: number,
  lit: (hex: string) => string,
  night: number,
  launched: boolean,
  rocket: { length: number; width: number } = { length: 30, width: 3 },
): void {
  if (v.scale < 0.03) return;
  const detail = v.scale >= 0.25;
  const hair = Math.max(0.12, 0.8 / v.scale);
  ctx.save();
  local(ctx, v, 0, GAME_EARTH.radius, Math.PI / 2);

  // Crawlerweg von der Halle zur Rampe
  ctx.fillStyle = lit('#9a9a90');
  ctx.fillRect(-150, -0.5, 118, 0.5);
  if (detail) {
    ctx.fillStyle = lit('#b3b3a8');
    ctx.fillRect(-150, -0.18, 118, 0.12);
  }

  // Leitstand (flach, mit Fensterreihen)
  ctx.fillStyle = lit('#cfd4db');
  ctx.fillRect(-238, 0, 40, 20);
  ctx.fillStyle = lit('#aeb5bf');
  ctx.fillRect(-238, 18.5, 40, 1.5);
  const windowColor = night > 0.3 ? '#ffd98a' : lit('#35506e');
  ctx.fillStyle = windowColor;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 8; col++) {
      if (night > 0.3 && hash(row * 8 + col, 91) < 0.3) continue;
      ctx.fillRect(-235 + col * 4.6, 3 + row * 5.2, 2.6, 2.6);
    }
  // Antennenschüssel auf dem Dach
  ctx.strokeStyle = lit('#8a929e');
  ctx.lineWidth = hair;
  ctx.beginPath();
  ctx.moveTo(-205, 20);
  ctx.lineTo(-205, 25);
  ctx.stroke();
  ctx.fillStyle = lit('#e9ecf0');
  ctx.beginPath();
  ctx.ellipse(-205, 26.5, 4, 1.6, -0.35, 0, Math.PI * 2);
  ctx.fill();

  // Montagehalle
  const hx = -190;
  const hw = 76;
  const hh = 88;
  const hall = ctx.createLinearGradient(hx, 0, hx + hw, 0);
  hall.addColorStop(0, lit('#c3c9d2'));
  hall.addColorStop(0.35, lit('#eef1f4'));
  hall.addColorStop(1, lit('#b7bec8'));
  ctx.fillStyle = hall;
  ctx.fillRect(hx, 0, hw, hh);
  if (detail) {
    ctx.fillStyle = 'rgba(40,50,70,0.08)';
    for (let x = hx + 4; x < hx + hw; x += 5) ctx.fillRect(x, 0, 0.4, hh);
  }
  // Großes Tor mit Segmenten
  const dx = hx + 34;
  ctx.fillStyle = lit('#8f97a3');
  ctx.fillRect(dx, 0, 28, 76);
  if (detail) {
    ctx.fillStyle = lit('#7a828e');
    for (let y = 4; y < 76; y += 6) ctx.fillRect(dx, y, 28, 0.5);
    ctx.fillRect(dx + 13.8, 0, 0.4, 76);
  }
  // Fahne und Band
  ctx.fillStyle = lit('#2f5fbf');
  ctx.fillRect(hx, hh - 9, hw, 4);
  ctx.fillStyle = lit('#1f3f86');
  ctx.fillRect(hx + 6, 50, 20, 13);
  ctx.fillStyle = lit('#f3f5f8');
  ctx.beginPath();
  ctx.arc(hx + 16, 56.5, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit('#e0503a');
  ctx.beginPath();
  ctx.ellipse(hx + 16, 56.5, 6.5, 1.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit('#5b6270');
  ctx.fillRect(hx - 1, hh, hw + 2, 1.4);
  // Warnlichter auf dem Dach
  const blink = Math.sin(time * 3) > 0.2;
  ctx.fillStyle = blink ? '#ff4b4b' : 'rgba(120,30,30,0.8)';
  ctx.fillRect(hx + 1, hh + 1.4, 1.2, 1.2);
  ctx.fillRect(hx + hw - 2.2, hh + 1.4, 1.2, 1.2);

  // Kugeltanks mit Leitungen zur Rampe
  for (const x of [66, 84]) {
    ctx.fillStyle = lit('#6b7380');
    ctx.fillRect(x - 4.5, 0, 1, 8);
    ctx.fillRect(x + 3.5, 0, 1, 8);
    const g = ctx.createRadialGradient(x - 2.4, 15.5, 1, x, 13, 7.2);
    g.addColorStop(0, lit('#ffffff'));
    g.addColorStop(0.6, lit('#e3e7ec'));
    g.addColorStop(1, lit('#9aa3ae'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, 13, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = lit('#7b838f');
  ctx.fillRect(12, 0.4, 72, 0.6);

  // Wasserturm (für die Schallunterdrückung beim Start)
  ctx.strokeStyle = lit('#7b838f');
  ctx.lineWidth = Math.max(0.4, hair);
  ctx.beginPath();
  for (const lx of [40, 48]) {
    ctx.moveTo(lx, 0);
    ctx.lineTo(44 + (lx - 44) * 0.4, 30);
  }
  ctx.moveTo(40.8, 10);
  ctx.lineTo(47.2, 20);
  ctx.moveTo(47.2, 10);
  ctx.lineTo(40.8, 20);
  ctx.stroke();
  const wt = ctx.createRadialGradient(42, 36, 1, 44, 34, 6);
  wt.addColorStop(0, lit('#ffffff'));
  wt.addColorStop(1, lit('#b2bac5'));
  ctx.fillStyle = wt;
  ctx.beginPath();
  ctx.arc(44, 34, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit('#2f5fbf');
  ctx.fillRect(38.6, 33.4, 10.8, 1.2);

  // Blitzschutzmasten mit Seilen
  const masts = [-26, 32];
  const mh = 64;
  ctx.strokeStyle = lit('#8d949f');
  ctx.lineWidth = Math.max(0.5, hair);
  ctx.beginPath();
  for (const mx of masts) {
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, mh);
  }
  ctx.stroke();
  ctx.strokeStyle = lit('#5b6270');
  ctx.lineWidth = hair * 0.6;
  ctx.beginPath();
  ctx.moveTo(masts[0]!, mh);
  ctx.quadraticCurveTo(3, mh - 12, masts[1]!, mh);
  for (const mx of masts) {
    const out = mx < 0 ? mx - 30 : mx + 30;
    ctx.moveTo(mx, mh);
    ctx.quadraticCurveTo((mx + out) / 2, mh * 0.45, out, 0);
  }
  ctx.stroke();
  for (const mx of masts) {
    ctx.fillStyle = blink ? '#ff4b4b' : 'rgba(140,30,30,0.9)';
    ctx.beginPath();
    ctx.arc(mx, mh + 0.6, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  if (detail) {
    // Rampe: Betonsockel mit Flammenschacht und Umlenkblech
    ctx.fillStyle = lit('#8b8f96');
    ctx.fillRect(-30, -3.2, 60, 3.2);
    ctx.fillStyle = lit('#a5a9b0');
    ctx.fillRect(-30, -0.5, 60, 0.5);
    ctx.fillStyle = lit('#6e737b');
    ctx.fillRect(-30, -3.2, 60, 0.4);
    // Flammenschacht so breit wie die Rakete (nicht wie ein schwarzes Loch unter dem Hüpfer)
    const half = rocket.width / 2;
    const pit = Math.max(1.2, Math.min(4.5, half * 0.9));
    const trench = ctx.createLinearGradient(0, 0, 0, -3.2);
    trench.addColorStop(0, lit('#3a3e45'));
    trench.addColorStop(1, lit('#5a5f67'));
    ctx.fillStyle = trench;
    ctx.fillRect(-pit, -3.2, pit * 2, 3.2);
    ctx.fillStyle = lit('#767b84');
    ctx.beginPath();
    ctx.moveTo(-pit, -3.2);
    ctx.lineTo(0, -1.4);
    ctx.lineTo(pit, -3.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lit('#9a9ea5');
    ctx.fillRect(-pit - 0.3, -0.35, 0.3, 0.35);
    ctx.fillRect(pit, -0.35, 0.3, 0.35);
    // Haltearme links und rechts, direkt an der Rakete
    ctx.fillStyle = lit('#3c434d');
    ctx.fillRect(-half - 1.4, 0, 1.2, 1.4);
    ctx.fillRect(half + 0.2, 0, 1.2, 1.4);

    // Startturm: Gitter, Plattformen, Kran und Versorgungsarme – so hoch wie die Rakete
    const tx = half + 2.4;
    const tw = 3.6;
    const th = Math.max(16, Math.min(112, Math.ceil((rocket.length + 2) / 8) * 8));
    ctx.fillStyle = lit('#9a3322');
    ctx.fillRect(tx, 0, 0.35, th);
    ctx.fillRect(tx + tw - 0.35, 0, 0.35, th);
    ctx.strokeStyle = lit('#c0452f');
    ctx.lineWidth = 0.22;
    ctx.beginPath();
    for (let y = 0; y < th; y += tw) {
      ctx.moveTo(tx, y);
      ctx.lineTo(tx + tw, y + tw);
      ctx.moveTo(tx + tw, y);
      ctx.lineTo(tx, y + tw);
    }
    ctx.stroke();
    ctx.fillStyle = lit('#f2c230');
    for (let y = 8; y <= th; y += 8) ctx.fillRect(tx - 0.3, y, tw + 0.6, 0.35);
    // Kran oben
    ctx.fillStyle = lit('#c0452f');
    ctx.fillRect(tx, th, tw, 1.2);
    ctx.fillRect(tx + tw - 0.4, th + 1.2, 0.4, 3);
    ctx.strokeStyle = lit('#c0452f');
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(tx + tw, th + 4);
    ctx.lineTo(tx + tw + 12, th + 1.2);
    ctx.lineTo(tx + tw, th + 1.2);
    ctx.stroke();
    // Versorgungsarme: vor dem Start an der Rakete, danach hochgeklappt
    const reach = tx - half - 0.1;
    for (const y of [rocket.length * 0.38, rocket.length * 0.78]) {
      ctx.save();
      ctx.translate(tx, Math.min(th - 1, Math.max(2, y)));
      ctx.rotate(launched ? -1.1 : 0);
      ctx.fillStyle = lit('#6b7380');
      ctx.fillRect(-reach, -0.35, reach, 0.7);
      ctx.fillStyle = lit('#f2c230');
      ctx.fillRect(-reach, -0.35, 0.8, 0.7);
      ctx.restore();
    }
    // Blinklicht auf dem Turm
    ctx.fillStyle = lit('#9aa3b2');
    ctx.fillRect(tx + tw / 2 - 0.15, th + 1.2, 0.3, 6);
    ctx.fillStyle = `rgba(255,60,60,${Math.sin(time * 4) > 0.3 ? 1 : 0.25})`;
    ctx.beginPath();
    ctx.arc(tx + tw / 2, th + 7.4, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Flutlichtmasten
    for (const fx of [-16, 22]) {
      ctx.fillStyle = lit('#6b7380');
      ctx.fillRect(fx - 0.2, 0, 0.4, 18);
      ctx.fillStyle = lit('#3c434d');
      ctx.fillRect(fx - 1.6, 18, 3.2, 1.3);
      ctx.fillStyle = night > 0.25 ? '#fff6d8' : lit('#d7dbe0');
      ctx.fillRect(fx - 1.4, 18.15, 2.8, 0.5);
    }
    // Nachts: Leuchten der Flutlichter (additiv; das Bildchen ist rund, also egal wie gespiegelt)
    const img = night > 0.25 ? softSprite('255,236,190', 0.2) : null;
    if (img) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, (night - 0.25) * 2) * 0.6;
      for (const fx of [-16, 22]) ctx.drawImage(img, fx - 14, 18.5 - 14, 28, 28);
      ctx.globalAlpha = Math.min(1, (night - 0.25) * 2) * 0.35;
      ctx.drawImage(img, -24, -6, 48, 30);
      ctx.restore();
    }
  }
  ctx.restore();
}
