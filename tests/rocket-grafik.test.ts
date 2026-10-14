import { describe, expect, it } from 'vitest';
import { drawPart, drawRocket, visualWidth, type RocketLook } from '../src/rocket/draw';
import { chuteExtent, part } from '../src/rocket/parts';

interface Call {
  op: string;
  args: number[];
  /** Verschiebung durch translate zum Zeitpunkt des Aufrufs. */
  dx: number;
  dy: number;
}

/** Aufzeichnender Zeichenkontext: Pfade, Füllungen und Striche samt Verschiebung. */
function recorder() {
  const calls: Call[] = [];
  const stack: [number, number][] = [];
  let dx = 0;
  let dy = 0;
  let path: number[] = [];
  const grad = { addColorStop() {} };
  const log = (op: string, args: unknown[]) =>
    calls.push({ op, args: args.filter((a): a is number => typeof a === 'number'), dx, dy });
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, name: string) {
      if (name in t) return t[name];
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => grad;
      if (name === 'save') return () => stack.push([dx, dy]);
      if (name === 'restore') return () => ([dx, dy] = stack.pop() ?? [0, 0]);
      if (name === 'translate')
        return (x: number, y: number) => {
          dx += x;
          dy += y;
        };
      if (name === 'beginPath') return () => (path = []);
      if (name === 'stroke' || name === 'fill') return () => log(name, path);
      return (...args: unknown[]) => {
        if (['moveTo', 'lineTo', 'ellipse', 'arc', 'rect'].includes(name))
          path.push(...args.filter((a): a is number => typeof a === 'number'));
        log(name, args);
      };
    },
    set(t, name: string, v) {
      t[name] = v;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const look = (over: Partial<RocketLook> = {}): RocketLook => ({
  throttle: 0,
  air: 1,
  chuteOpen: 0,
  time: 0,
  ...over,
});

describe('Rakete zeichnen', () => {
  it('Seitenbooster: Streben liegen spiegelbildlich und innerhalb der Röhre', () => {
    const { ctx, calls } = recorder();
    drawPart(ctx, part('booster'), 5);
    const struts = calls.filter((c) => c.op === 'fillRect' && c.args[3] === 0.18);
    expect(struts).toHaveLength(4);
    const spans = struts.map((c) => [c.dx + c.args[0]!, c.dx + c.args[0]! + c.args[2]!]);
    const right = spans.filter((s) => s[0]! > 0).map((s) => s[0]!);
    const left = spans.filter((s) => s[0]! < 0).map((s) => -(s[0]! + 0.62));
    expect(left.sort()).toEqual(right.sort());
    const lo = 5 + 0.6;
    const hi = 5 + 0.4 + 1.4;
    for (const c of struts) {
      expect(c.dy + c.args[1]!).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(c.dy + c.args[1]!).toBeLessThanOrEqual(hi);
    }
  });

  it('Kleinbooster unten: Streben schweben nicht unter der Röhre', () => {
    const { ctx, calls } = recorder();
    drawPart(ctx, part('booster-s'), 0);
    for (const c of calls.filter((c) => c.op === 'fillRect' && c.args[3] === 0.18))
      expect(c.args[1]).toBeGreaterThanOrEqual(0.6 - 1e-9);
  });

  it('Tankadapter: der Umriss ist der Kegelstumpf', () => {
    const adapter = part('adapter');
    const { ctx, calls } = recorder();
    drawPart(ctx, adapter, 0);
    const outline = calls.filter((c) => c.op === 'stroke').at(-1)!;
    expect(outline.args).toContain(-adapter.width / 2);
  });

  it('Fallschirm: der Kappenumriss wird gestrichen, nicht die Scheitelöffnung', () => {
    const { ctx, calls } = recorder();
    drawRocket(ctx, ['kapsel', 'fallschirm'], look({ chuteOpen: 1 }));
    const last = calls.filter((c) => c.op === 'stroke').at(-1)!;
    expect(Math.min(...last.args)).toBeLessThan(-5);
  });

  it('nur Seitentriebwerke: keine Flamme in der Mitte', () => {
    const fills = (design: string[], throttle: number) => {
      const { ctx, calls } = recorder();
      drawRocket(ctx, design, look({ throttle }));
      return calls.filter((c) => c.op === 'fill').length;
    };
    const side = ['kapsel', 'tank-s', 'kolibri@1.8'];
    const sideFlames = fills(side, 1) - fills(side, 0);
    const withCentre = ['kapsel', 'tank-s', 'kolibri'];
    const centreFlame = fills(withCentre, 1) - fills(withCentre, 0);
    expect(sideFlames).toBe(2 * centreFlame);
  });

  it('Landebeine: Breite schließt die Fußplatten ein', () => {
    for (const id of ['beine', 'beine-s', 'beine-xl']) {
      const { ctx, calls } = recorder();
      drawPart(ctx, part(id), 0);
      const pads = calls.filter((c) => c.op === 'fillRect' && c.args[3] === 0.25);
      const right = Math.max(...pads.map((c) => c.args[0]! + c.args[2]!));
      expect(visualWidth(part(id))).toBeGreaterThanOrEqual(2 * right - 1e-9);
    }
  });

  it('Schirmmaß: chuteExtent stimmt mit der Zeichnung überein', () => {
    for (const area of [0.4, 1, 2.5]) {
      const { ctx, calls } = recorder();
      drawRocket(ctx, ['kapsel', 'fallschirm'], look({ chuteOpen: 1, chuteArea: area }));
      const cap = calls.find((c) => c.op === 'bezierCurveTo')!;
      const peak = 0.75 * cap.args[1]! + 0.25 * cap.args[5]!;
      expect(chuteExtent(1, area)).toBeCloseTo(peak, 1);
    }
  });
});
