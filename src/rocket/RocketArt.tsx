import { useEffect, useRef, useState } from 'preact/hooks';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { drawRocket } from './draw';
import { TEMPLATES } from './parts';

/**
 * Bild für den Hinweis auf die Raketenwerft: Rakete über dem Erdrand, Mond im Hintergrund.
 * `paused`: nur ein Standbild (z. B. solange das Spiel darüber liegt). Außerhalb des sichtbaren
 * Bereichs ruht die Animation ebenfalls.
 */
export function RocketArt({ paused = false }: { paused?: boolean }) {
  const [box, size] = useElementSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, [box]);
  useEffect(() => {
    const c = canvas.current;
    const { width: W, height: H } = size;
    if (!c || W === 0) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const still = calm || paused || !visible;
    let id = 0;
    const draw = (now: number): void => {
      const ctx = prepareCanvas(c, W, H);
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) {
        const x = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1;
        const y = (((Math.sin(i * 78.233) * 12345.678) % 1) + 1) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * (((i * 7) % 10) / 10)})`;
        ctx.fillRect(x * W, y * H * 0.8, 1.4, 1.4);
      }
      ctx.fillStyle = '#b6bbc4';
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.2, 18, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(W * 0.3, H * 2.4, H * 1.9, W * 0.3, H * 2.4, H * 2.1);
      g.addColorStop(0, '#2764b8');
      g.addColorStop(0.8, '#3f8fd8');
      g.addColorStop(1, 'rgba(120,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(W * 0.3, H * 2.4, H * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(W * 0.52, H * 0.78);
      ctx.rotate(0.5 + (still ? 0 : 0.03 * Math.sin(now / 900)));
      const scale = (H * 0.62) / 36;
      ctx.scale(scale, -scale);
      drawRocket(ctx, TEMPLATES[2]!.parts, {
        throttle: 1,
        air: 0.1,
        chuteOpen: 0,
        time: now / 1000,
      });
      ctx.restore();
      if (!still) id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [size, paused, visible]);
  return (
    <div ref={box} aria-hidden="true">
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
