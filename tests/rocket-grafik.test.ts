import { describe, expect, it, vi } from 'vitest';
import { drawPart, drawRocket, visualWidth, type RocketLook } from '../src/rocket/draw';
import { Flight } from '../src/rocket/flight';
import { arrowIndices } from '../src/rocket/mapdraw';
import { chuteExtent, part, TEMPLATES } from '../src/rocket/parts';
import { drawPlanetDisk } from '../src/rocket/planets';
import { padRocket } from '../src/rocket/scene';
import { GAME_MOON } from '../src/rocket/world';

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

describe('Aufsetzen und Kulisse', () => {
  it('Landebeine: Fußplatten stehen auf der Standfläche, nicht darunter', () => {
    for (const id of ['beine', 'beine-s', 'beine-xl']) {
      const { ctx, calls } = recorder();
      drawRocket(ctx, ['kapsel', id]);
      const pads = calls.filter((c) => c.op === 'fillRect' && c.args[3] === 0.25);
      expect(pads).toHaveLength(2);
      for (const c of pads) expect(c.dy + c.args[1]!).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('Airbags: aufgeblasene Kissen reichen nicht unter die Standfläche', () => {
    for (const bags of [0.2, 1]) {
      const { ctx, calls } = recorder();
      drawRocket(ctx, ['kapsel', 'tank-s', 'airbags'], look({ bags }));
      const cushions = calls.filter((c) => c.op === 'arc').slice(0, 3);
      expect(cushions).toHaveLength(3);
      for (const c of cushions)
        expect(c.dy + c.args[1]! - c.args[2]!).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('Startturm: Maße bleiben nach der Stufentrennung die der ganzen Rakete', () => {
    const design = TEMPLATES.find((t) => t.id === 'orbiter')!.parts;
    const f = new Flight(design);
    const before = { ...padRocket(f) };
    f.segs.pop();
    expect(padRocket(f)).toEqual(before);
    expect(before.length).toBeGreaterThan(f.length);
  });

  it('Richtungspfeile: sitzen an derselben Bahnstelle, wenn die Karte verschoben wird', () => {
    const n = 1200;
    const orbit = (dx: number) => {
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / (n - 1);
        xs[i] = 300 + dx + 600 * Math.cos(a);
        ys[i] = 300 + 250 * Math.sin(a);
      }
      return { xs, ys };
    };
    const at = (dx: number) => {
      const { xs, ys } = orbit(dx);
      return arrowIndices(xs, ys, 0, n - 1, 800, 600);
    };
    const base = at(0);
    const moved = at(-30);
    const common = base.filter((i) => moved.includes(i));
    expect(common.length).toBeGreaterThan(5);
    expect(common.length).toBeGreaterThanOrEqual(moved.length - 3);
  });
});

describe('Scheibe der Fernansicht', () => {
  it('im Zeitraffer wird nicht in jedem Bild ein Zwischenbild angelegt', () => {
    const noop = () => undefined;
    const g = new Proxy<Record<string, unknown>>(
      {},
      {
        get: (t, k: string) => {
          if (k in t) return t[k];
          if (k === 'getTransform') return () => ({ a: 1, b: 0 });
          if (k === 'createRadialGradient' || k === 'createLinearGradient')
            return () => ({ addColorStop: noop });
          return noop;
        },
        set: (t, k: string, v) => ((t[k] = v), true),
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      g as unknown as CanvasRenderingContext2D,
    );
    const ctx = g as unknown as CanvasRenderingContext2D;
    drawPlanetDisk(ctx, GAME_MOON, 100, 100, 40, 0, 0, 0);
    const made = vi.spyOn(document, 'createElement');
    for (let i = 1; i <= 20; i++) drawPlanetDisk(ctx, GAME_MOON, 100, 100, 40, i * 0.03, 0, 0);
    expect(made).not.toHaveBeenCalled();
    for (let i = 0; i < 4; i++) drawPlanetDisk(ctx, GAME_MOON, 100, 100, 40, 1, 0, 0);
    expect(made).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
