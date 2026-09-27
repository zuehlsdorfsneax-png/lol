import { useEffect, useRef, useState } from 'preact/hooks';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { Icon } from '../ui/Icon';
import { RocketAudio } from './audio';
import { OrbitPilot } from './autopilot';
import { drawFlight, drawMap, fitMapScale, flightView, mapView, type MapFocus } from './draw';
import { Flight, GOALS, type FlightEvent, type GoalId, type Prediction } from './flight';
import type { Design } from './parts';
import { EARTH, MOON, MOON_DISTANCE, MOON_RATE, airDensity, moonAngle } from './world';

const fmt = (x: number, d = 0): string =>
  x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

function distance(m: number): string {
  if (!Number.isFinite(m)) return '∞';
  if (Math.abs(m) < 10_000) return `${fmt(m)} m`;
  return `${fmt(m / 1000, Math.abs(m) < 100_000 ? 1 : 0)} km`;
}

function clock(t: number): string {
  const s = Math.floor(t);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number): string => String(n).padStart(2, '0');
  return d > 0
    ? `${d} T ${two(h)}:${two(m)}:${two(sec)}`
    : h > 0
      ? `${h}:${two(m)}:${two(sec)}`
      : `${two(m)}:${two(sec)}`;
}

/** Winkel, um den der Mond der Rakete vorauseilt, und der ideale Wert für den Transfer. */
function moonWindow(f: Flight): { lead: number; ideal: number; wait: number } | null {
  if (f.refBody() !== EARTH || f.status !== 'flying') return null;
  const o = f.orbit(EARTH);
  if (!o.bound || o.periapsis < EARTH.atmosphere || o.apoapsis > 0.3 * MOON_DISTANCE) return null;
  const r = Math.hypot(f.x, f.y);
  const at = (r + MOON_DISTANCE) / 2;
  const tt = Math.PI * Math.sqrt(at ** 3 / EARTH.mu);
  const ideal = Math.PI - MOON_RATE * tt;
  const theta = Math.atan2(f.y, f.x);
  const lead = Math.atan2(Math.sin(theta - moonAngle(f.t)), Math.cos(theta - moonAngle(f.t)));
  // Rakete (Uhrzeigersinn) holt relativ zum Mond mit (ω − n) auf.
  const omega = (2 * Math.PI) / o.period;
  let gap = lead - ideal;
  gap = ((gap % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return { lead, ideal, wait: gap / (omega - MOON_RATE) };
}

function tipFor(f: Flight, pilot: boolean): string {
  if (f.status === 'crashed') return '';
  if (pilot) return 'Der Hilfe-Pilot fliegt in eine Umlaufbahn. Jede Steuertaste übernimmt wieder.';
  const ref = f.refBody();
  const o = f.orbit(ref);
  const rel = f.relative(ref);
  if (f.status === 'landed') {
    if (f.landedOn === MOON)
      return 'Du stehst auf dem Mond! Für den Rückweg: senkrecht starten, dann flach werden und so beschleunigen, dass du den Mond entgegen seiner Laufrichtung verlässt.';
    if (!f.goals.has('lift'))
      return 'Schub hochziehen (W / ↑, Z = Vollgas) – dann hebt die Rakete ab. Oder den Hilfe-Piloten fragen.';
    return 'Sicher gelandet! In der Werft kannst du eine größere Rakete bauen.';
  }
  if (ref === MOON) {
    if (f.goals.has('moonland'))
      return 'Weiter Gas geben, bis die Bahn den Mond verlässt (Karte: M). Dann auf der Erdbahn den Pe auf 15–30 km senken.';
    if (!o.bound)
      return 'Im Einflussbereich des Mondes! Am mondnächsten Punkt (Pe) gegen die Flugrichtung (orangenes ×) bremsen, bis die Bahn geschlossen ist.';
    return 'Mondumlaufbahn! Zum Landen gegen die Flugrichtung bremsen, dann kurz über dem Boden mit Schub auf unter 8 m/s abbremsen (mit Landebeinen 14 m/s).';
  }
  if (f.goals.has('moonland') || (f.goals.has('soi') && !o.bound))
    return 'Heimweg: Den tiefsten Punkt (Pe) auf 15–30 km bringen, Fallschirm scharf machen (P) und die Kapsel landen lassen.';
  if (f.goals.has('soi'))
    return 'Zurück bei der Erde. Pe auf 15–30 km bringen, Fallschirm scharf machen (P) – die Luft bremst die Kapsel.';
  if (!(o.bound && o.periapsis > EARTH.atmosphere)) {
    if (rel.altitude < 3_000 && f.goals.size <= 2)
      return 'Senkrecht steigen. Ab 3 km langsam nach rechts neigen (D / →).';
    if (o.apoapsis < 70_000)
      return f.thrusting
        ? 'Weiter nach rechts neigen: bei 20 km etwa halb, ab 40 km fast waagerecht. Ziel: höchster Bahnpunkt (Ap) über 70 km.'
        : 'Gas geben (W / ↑) und dabei flacher werden, bis der höchste Bahnpunkt (Ap) über 70 km liegt.';
    return f.thrusting && rel.altitude < 50_000
      ? 'Ap über 70 km – Schub aus (X) und bis zum höchsten Punkt gleiten.'
      : 'Am höchsten Punkt waagerecht in Flugrichtung (grüner Kreis) Gas geben, bis der tiefste Punkt (Pe) über 40 km liegt.';
  }
  if (o.apoapsis > 0.5 * MOON_DISTANCE)
    return 'Unterwegs zum Mond! Zeitraffer hoch (.) und warten, bis die Rakete die Hill-Sphäre des Mondes erreicht.';
  return 'Umlaufbahn geschafft! Zum Mond: Warte auf das Mondfenster (Anzeige links), dann in Flugrichtung Gas geben, bis die Bahn den Mond trifft (Karte: M).';
}

interface Props {
  design: Design;
  knownGoals: readonly string[];
  onGoal: (id: GoalId) => void;
  onExit: () => void;
}

export function FlightScreen({ design, knownGoals, onGoal, onExit }: Props) {
  const [run, setRun] = useState(0);
  const flight = useRef<Flight>(new Flight(design));
  const [, setTick] = useState(0);
  const [map, setMap] = useState(false);
  const [muted, setMuted] = useState(false);
  const [toasts, setToasts] = useState<FlightEvent[]>([]);
  const [box, size] = useElementSize<HTMLDivElement>();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const touchTurn = useRef(0);
  const pilot = useRef<OrbitPilot | null>(null);
  const audio = useRef<RocketAudio>(new RocketAudio());
  /** Zoomfaktor des Spielers; der Grundmaßstab folgt automatisch der Flughöhe. */
  const zoom = useRef(1);
  const mapCam = useRef<{ scale: number; focus: MapFocus; panX: number; panY: number }>({
    scale: 0,
    focus: 'earth',
    panX: 0,
    panY: 0,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pred = useRef<Prediction | null>(null);
  const mapOpen = useRef(map);
  mapOpen.current = map;
  const goalCallback = useRef(onGoal);
  goalCallback.current = onGoal;

  const f = flight.current;
  // Nur im Entwicklungsmodus: Zugriff für automatische Browsertests.
  if (import.meta.env.DEV) Object.assign(window, { __rocket: flight });

  const restart = (): void => {
    flight.current = new Flight(design);
    pilot.current = null;
    pred.current = null;
    setToasts([]);
    setRun((r) => r + 1);
  };

  const openMap = (open: boolean): void => {
    if (open) {
      const fl = flight.current;
      const focus: MapFocus = fl.refBody() === MOON ? 'moon' : 'earth';
      mapCam.current = {
        focus,
        scale: fitMapScale(fl, size.width, size.height, focus),
        panX: 0,
        panY: 0,
      };
    }
    setMap(open);
  };

  const warpBy = (d: number): void => {
    const fl = flight.current;
    fl.setWarp(fl.warpIndex + d);
    setTick((t) => t + 1);
  };

  const zoomBy = (factor: number, ax = 0, ay = 0): void => {
    if (mapOpen.current) {
      // Der Punkt unter (ax, ay) – Abstand zur Bildmitte in Pixeln – bleibt stehen.
      const cam = mapCam.current;
      const next = Math.min(0.05, Math.max(2e-7, cam.scale * factor));
      cam.panX += ax / cam.scale - ax / next;
      cam.panY -= ay / cam.scale - ay / next;
      cam.scale = next;
    } else {
      zoom.current = Math.min(10_000, Math.max(0.001, zoom.current * factor));
    }
  };

  // Tastatur
  useEffect(() => {
    const control = new Set([
      'arrowleft',
      'arrowright',
      'arrowup',
      'arrowdown',
      'a',
      'd',
      'w',
      's',
      'z',
      'x',
      ' ',
    ]);
    const down = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
      if (tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      const fl = flight.current;
      audio.current.unlock();
      if (control.has(k)) {
        e.preventDefault();
        if (k !== ' ') pilot.current = null;
      }
      if (e.repeat && !['arrowup', 'arrowdown', 'w', 's'].includes(k)) return;
      keys.current.add(k);
      if (k === ' ') fl.stage();
      else if (k === 'z') fl.throttle = 1;
      else if (k === 'x') fl.throttle = 0;
      else if (k === 'm') openMap(!mapOpen.current);
      else if (k === 'p') fl.deployChute();
      else if (k === '.' || k === '>') warpBy(1);
      else if (k === ',' || k === '<') warpBy(-1);
      else if (k === '+') zoomBy(1.4);
      else if (k === '-') zoomBy(1 / 1.4);
      else if (k === 't') togglePilot();
    };
    const up = (e: KeyboardEvent): void => {
      keys.current.delete(e.key.toLowerCase());
    };
    const blur = (): void => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  });

  // Mausrad-Zoom
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const rel = (e: { clientX: number; clientY: number }): [number, number] => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2];
    };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      const [ax, ay] = rel(e);
      zoomBy(Math.exp(-e.deltaY * 0.0015), ax, ay);
    };
    // Ziehen verschiebt die Karte, zwei Finger zoomen (Karte und Flugansicht).
    const down = (e: PointerEvent): void => {
      c.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const move = (e: PointerEvent): void => {
      const ps = pointers.current;
      const old = ps.get(e.pointerId);
      if (!old) return;
      if (ps.size === 1 && mapOpen.current) {
        const cam = mapCam.current;
        cam.panX -= (e.clientX - old.x) / cam.scale;
        cam.panY += (e.clientY - old.y) / cam.scale;
      } else if (ps.size === 2) {
        const other = [...ps.entries()].find(([id]) => id !== e.pointerId)![1];
        const before = Math.hypot(old.x - other.x, old.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 10) {
          const [ax, ay] = rel({
            clientX: (e.clientX + other.x) / 2,
            clientY: (e.clientY + other.y) / 2,
          });
          zoomBy(after / before, ax, ay);
        }
      }
      ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent): void => {
      pointers.current.delete(e.pointerId);
    };
    const dbl = (): void => {
      if (!mapOpen.current) return;
      const fl = flight.current;
      const cam = mapCam.current;
      mapCam.current = {
        ...cam,
        panX: 0,
        panY: 0,
        scale: fitMapScale(fl, c.clientWidth, c.clientHeight, cam.focus),
      };
    };
    c.addEventListener('wheel', wheel, { passive: false });
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('dblclick', dbl);
    return () => {
      c.removeEventListener('wheel', wheel);
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      c.removeEventListener('dblclick', dbl);
    };
  }, []);

  useEffect(() => () => audio.current.close(), []);

  // Beim Start das Spielfeld ganz ins Bild holen.
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  // Spielschleife
  useEffect(() => {
    let id = 0;
    let last = performance.now();
    let hudTimer = 0;
    let predTimer = 1;
    let lastEvent = 0;
    let segCount = flight.current.segs.length;
    const frame = (now: number): void => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const fl = flight.current;
      const k = keys.current;
      if (pilot.current) {
        const phase = pilot.current.update(fl);
        if (phase === 'done') {
          pilot.current = null;
          if (fl.status !== 'crashed')
            setToasts((t) => [
              ...t,
              {
                id: -Date.now(),
                kind: 'info',
                text: 'Hilfe-Pilot: Umlaufbahn erreicht. Jetzt übernimmst du!',
              },
            ]);
        }
      } else {
        const turn =
          (k.has('arrowright') || k.has('d') ? 1 : 0) -
          (k.has('arrowleft') || k.has('a') ? 1 : 0) +
          touchTurn.current;
        fl.turn = Math.max(-1, Math.min(1, turn));
        if (k.has('arrowup') || k.has('w')) fl.throttle = Math.min(1, fl.throttle + 0.8 * dt);
        if (k.has('arrowdown') || k.has('s')) fl.throttle = Math.max(0, fl.throttle - 0.8 * dt);
      }
      fl.update(dt);
      if (fl.segs.length !== segCount) {
        segCount = fl.segs.length;
        audio.current.clunk();
      }
      audio.current.engine(fl.thrusting ? fl.throttle : 0, airDensity(fl.altitudeEarth));

      const fresh = fl.eventsAfter(lastEvent);
      if (fresh.length) {
        lastEvent = fresh[fresh.length - 1]!.id;
        for (const e of fresh) {
          if (e.kind === 'goal') audio.current.chime();
          if (e.kind === 'fail') {
            audio.current.explosion();
            audio.current.engine(0, 0);
          }
        }
        for (const g of fl.goals) goalCallback.current(g);
        setToasts((t) => [...t, ...fresh].slice(-3));
      }

      predTimer += dt;
      if (predTimer > (mapOpen.current ? 0.12 : 0.4)) {
        predTimer = 0;
        pred.current = fl.status === 'flying' ? fl.predict() : null;
      }

      const c = canvas.current;
      const el = stage.current;
      if (c && el) {
        const W = el.clientWidth;
        const H = el.clientHeight;
        const ctx = prepareCanvas(c, W, H);
        if (ctx) {
          if (mapOpen.current) {
            if (mapCam.current.scale === 0)
              mapCam.current.scale = fitMapScale(fl, W, H, mapCam.current.focus);
            drawMap(
              ctx,
              fl,
              mapView(
                fl,
                W,
                H,
                mapCam.current.scale,
                mapCam.current.focus,
                mapCam.current.panX,
                mapCam.current.panY,
              ),
              pred.current,
            );
          } else {
            // Automatischer Zoom: Mit der Höhe wird herausgezoomt, damit der Boden im Bild bleibt.
            const altitude = Math.max(1, fl.relative().altitude);
            const near = 5 / Math.pow(1 + altitude / 300, 0.7);
            const far = Math.min(near, (H * 0.28) / altitude);
            const blend = Math.min(1, Math.max(0, (altitude - 2_000) / 20_000));
            const base = Math.exp(Math.log(near) * (1 - blend) + Math.log(far) * blend);
            const scale = Math.min(24, Math.max(1e-6, base * zoom.current));
            drawFlight(ctx, fl, flightView(fl, W, H, scale), now / 1000);
          }
        }
      }
      hudTimer += dt;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        setTick((t) => (t + 1) % 1_000_000);
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(id);
      audio.current.engine(0, 0);
    };
  }, [run]);

  // Meldungen nach einigen Sekunden ausblenden.
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts((t) => t.slice(1)), 4200);
    return () => clearTimeout(timer);
  }, [toasts]);

  function togglePilot(): void {
    const fl = flight.current;
    audio.current.unlock();
    if (pilot.current) {
      pilot.current = null;
      fl.throttle = 0;
      fl.turn = 0;
      return;
    }
    if (fl.refBody() !== EARTH || fl.goals.has('orbit') || fl.status === 'crashed') return;
    pilot.current = new OrbitPilot();
    setTick((t) => t + 1);
  }

  const hold = (dir: number) => ({
    onPointerDown: (e: PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      audio.current.unlock();
      pilot.current = null;
      touchTurn.current = dir;
    },
    onPointerUp: () => (touchTurn.current = 0),
    onPointerCancel: () => (touchTurn.current = 0),
    onLostPointerCapture: () => (touchTurn.current = 0),
  });

  const fullscreen = (): void => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  // ------------------------------------------------------------ Anzeige
  const ref = f.refBody();
  const rel = f.relative(ref);
  const o = f.orbit(ref);
  const speed = Math.hypot(rel.vx, rel.vy);
  const vertical = (rel.rx * rel.vx + rel.ry * rel.vy) / rel.r;
  const fuel = f.fuelCapacity > 0 ? f.active.fuel / f.fuelCapacity : 0;
  const win = moonWindow(f);
  const goals = new Set<string>([...knownGoals, ...f.goals]);
  const maxWarp = f.maxWarpIndex();
  const pilotAvailable =
    !pilot.current && ref === EARTH && !f.goals.has('orbit') && f.status !== 'crashed';

  return (
    <div class={`rocket-stage ${map ? 'is-map' : ''}`} ref={box}>
      <div class="rocket-canvas" ref={stage}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={
            map ? 'Karte mit Erde, Mond und vorhergesagter Bahn' : 'Flugansicht der Rakete'
          }
        />
      </div>

      <div class="hud hud-left">
        <div class="hud-title">{ref.name}</div>
        <dl>
          <dt>Höhe</dt>
          <dd>{distance(rel.altitude)}</dd>
          <dt>Tempo</dt>
          <dd>{fmt(speed)} m/s</dd>
          <dt>Steigen</dt>
          <dd>{fmt(vertical)} m/s</dd>
          <dt>Ap</dt>
          <dd>{o.bound ? distance(o.apoapsis) : 'Flucht'}</dd>
          <dt>Pe</dt>
          <dd class={o.periapsis < 0 ? 'bad' : ''}>
            {o.periapsis < 0 ? 'im Boden' : distance(o.periapsis)}
          </dd>
          <dt>Zeit</dt>
          <dd>T+ {clock(f.t)}</dd>
        </dl>
        {win && (
          <div class={`hud-window ${win.wait < 20 ? 'now' : ''}`}>
            Mondfenster:{' '}
            {win.wait < 20 ? <strong>jetzt Gas geben!</strong> : <>in {clock(win.wait)}</>}
            <div class="small">
              Mond {fmt(((win.lead * 180) / Math.PI + 360) % 360)}° voraus · ideal{' '}
              {fmt((win.ideal * 180) / Math.PI)}°
            </div>
          </div>
        )}
      </div>

      <div class="hud hud-right">
        <div class="hud-title">Ziele</div>
        <ul class="goal-list">
          {GOALS.map((g) => (
            <li key={g.id} class={goals.has(g.id) ? 'done' : ''} title={g.text}>
              <span aria-hidden="true">{goals.has(g.id) ? '★' : '☆'}</span> {g.title}
            </li>
          ))}
        </ul>
      </div>

      <div class="hud-bar">
        <div class="hud-group">
          <button type="button" class="hud-btn" onClick={onExit}>
            ← Werft
          </button>
          <button type="button" class="hud-btn" onClick={restart}>
            <Icon name="reset" /> Neustart
          </button>
        </div>
        <div class="hud-group hud-center">
          <div class="warp" role="group" aria-label="Zeitraffer">
            <button
              type="button"
              onClick={() => warpBy(-1)}
              disabled={f.warpIndex === 0}
              aria-label="Langsamer"
            >
              «
            </button>
            <span title="Zeitraffer (Tasten , und .)">{fmt(f.warp)}×</span>
            <button
              type="button"
              onClick={() => warpBy(1)}
              disabled={f.warpIndex >= maxWarp}
              aria-label="Schneller"
            >
              »
            </button>
          </div>
          <button type="button" class={`hud-btn ${map ? 'on' : ''}`} onClick={() => openMap(!map)}>
            {map ? 'Rakete' : 'Karte'} <kbd>M</kbd>
          </button>
          {map && (
            <div class="warp map-focus" role="group" aria-label="Kartenmitte">
              {(['earth', 'moon', 'rocket'] as const).map((foc) => (
                <button
                  key={foc}
                  type="button"
                  class={mapCam.current.focus === foc ? 'on' : ''}
                  onClick={() => {
                    mapCam.current = {
                      panX: 0,
                      panY: 0,
                      focus: foc,
                      scale:
                        foc === 'rocket'
                          ? Math.max(mapCam.current.scale, 2e-4)
                          : fitMapScale(f, size.width, size.height, foc),
                    };
                    setTick((t) => t + 1);
                  }}
                >
                  {foc === 'earth' ? 'Erde' : foc === 'moon' ? 'Mond' : 'Rakete'}
                </button>
              ))}
            </div>
          )}
          <div class="warp" role="group" aria-label="Zoom">
            <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Verkleinern">
              −
            </button>
            <button type="button" onClick={() => zoomBy(1.6)} aria-label="Vergrößern">
              +
            </button>
          </div>
        </div>
        <div class="hud-group">
          <button
            type="button"
            class="hud-btn"
            onClick={() => {
              setMuted(!muted);
              audio.current.setMuted(!muted);
            }}
            aria-label={muted ? 'Ton an' : 'Ton aus'}
          >
            {muted ? 'Ton aus' : 'Ton an'}
          </button>
          <button type="button" class="hud-btn" onClick={fullscreen} aria-label="Vollbild">
            <Icon name="expand" />
          </button>
        </div>
      </div>

      <div class="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} class={`rocket-toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>

      {f.status !== 'crashed' && <div class="hud-tip">{tipFor(f, pilot.current !== null)}</div>}

      <div class="hud-bottom">
        <div class="turn-pad">
          <button type="button" class="pad-btn" aria-label="Nach links drehen" {...hold(-1)}>
            ⟲
          </button>
          <button type="button" class="pad-btn" aria-label="Nach rechts drehen" {...hold(1)}>
            ⟳
          </button>
        </div>
        <div class="action-pad">
          <button
            type="button"
            class="pad-btn wide stage-btn"
            onClick={() => {
              audio.current.unlock();
              f.stage();
            }}
            disabled={f.segs.length <= 1 && f.chute !== 'stowed'}
          >
            {f.segs.length > 1 ? `Stufe ab (${f.segs.length - 1})` : 'Fallschirm'} <kbd>␣</kbd>
          </button>
          {f.chute === 'stowed' && f.segs.length > 1 && (
            <button type="button" class="pad-btn wide" onClick={() => f.deployChute()}>
              Fallschirm <kbd>P</kbd>
            </button>
          )}
          {f.chute === 'armed' && <span class="chip warn">Fallschirm scharf</span>}
          {(pilotAvailable || pilot.current) && (
            <button
              type="button"
              class={`pad-btn wide ${pilot.current ? 'on' : ''}`}
              onClick={togglePilot}
            >
              {pilot.current ? 'Hilfe-Pilot aus' : 'Hilfe-Pilot'} <kbd>T</kbd>
            </button>
          )}
        </div>
        <div class="throttle-pad">
          <div class="gauges">
            <div class="gauge" title="Treibstoff der aktiven Stufe">
              <span>Tank</span>
              <div class="bar">
                <div
                  class={`fill ${fuel < 0.15 ? 'low' : ''}`}
                  style={{ width: `${fuel * 100}%` }}
                />
              </div>
            </div>
            <div class="small">
              Δv übrig <strong>{fmt(f.deltaV())} m/s</strong>
            </div>
          </div>
          <label class="throttle">
            <span>Schub {fmt(f.throttle * 100)} %</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(f.throttle * 100)}
              onInput={(e) => {
                pilot.current = null;
                audio.current.unlock();
                f.throttle = Number((e.target as HTMLInputElement).value) / 100;
              }}
              aria-label="Schub"
            />
          </label>
          <div class="throttle-buttons">
            <button
              type="button"
              class="pad-btn go"
              onClick={() => {
                pilot.current = null;
                audio.current.unlock();
                f.throttle = 1;
              }}
            >
              Vollgas <kbd>Z</kbd>
            </button>
            <button
              type="button"
              class="pad-btn"
              onClick={() => {
                pilot.current = null;
                f.throttle = 0;
              }}
            >
              Aus <kbd>X</kbd>
            </button>
          </div>
        </div>
      </div>

      {f.status === 'crashed' && (
        <div class="rocket-overlay" role="dialog" aria-label="Absturz">
          <h3>Bumm! Die Rakete ist zerschellt.</h3>
          <p>{f.crashReason}</p>
          <div class="btn-row">
            <button type="button" class="btn primary" onClick={restart}>
              <Icon name="reset" /> Nochmal starten
            </button>
            <button type="button" class="btn" onClick={onExit}>
              Zurück zur Werft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
