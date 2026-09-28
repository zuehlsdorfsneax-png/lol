import { useEffect, useRef, useState } from 'preact/hooks';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { Icon } from '../ui/Icon';
import { RocketAudio } from './audio';
import { LandingPilot, NodeExecutor, OrbitPilot } from './autopilot';
import type { Challenge, ChallengeResult, Memo } from './challenges';
import { ComputerPanel } from './ComputerPanel';
import { setPaint } from './draw';
import {
  Flight,
  GOALS,
  careerPoints,
  rankFor,
  type FlightEvent,
  type FlightSnapshot,
  type GoalId,
  type Prediction,
  type Satellite,
  type SasMode,
  type TargetId,
} from './flight';
import { clock, clockIn, distance, fmt, km, missionClock, shortTime } from './format';
import { CIRCULAR_E, timeToApoapsis, timeToPeriapsis } from './kepler';
import {
  drawMap,
  fitMapScale,
  mapArea,
  mapView,
  type HandleKind,
  type MapFocus,
  type MapHits,
} from './mapdraw';
import { applyRules, applySandbox, type SandboxSettings } from './sandbox';
import { Navball, SAS_MODES } from './Navball';
import { ChallengeBrief, ChallengeResultView, FlightReport, FlightStatsTable } from './Overlays';
import type { Design } from './parts';
import { drawFlight, flightView } from './scene';
import { toWorld, type View } from './view';
import {
  EARTH,
  EUROPA,
  JUPITER,
  MARS,
  MERCURY,
  MOON,
  MOON_DISTANCE,
  MOON_RATE,
  PHOBOS,
  SUN,
  VENUS,
  angularRate,
  bodyById,
  densityAt,
  moonAngle,
  phaseLead,
  transferWindow,
  type Body,
} from './world';

const TARGETS: readonly { id: TargetId; label: string }[] = [
  { id: 'station', label: 'Raumstation Kepler' },
  { id: 'moon', label: 'Mond' },
  { id: 'mercury', label: 'Merkur' },
  { id: 'venus', label: 'Venus' },
  { id: 'mars', label: 'Mars' },
  { id: 'phobos', label: 'Phobos' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'europa', label: 'Europa' },
  { id: 'earth', label: 'Erde' },
];

const FOCI: readonly { id: MapFocus; label: string }[] = [
  { id: 'ref', label: 'Bezugskörper' },
  { id: 'rocket', label: 'Rakete' },
  { id: 'earth', label: 'Erde' },
  { id: 'moon', label: 'Mond' },
  { id: 'sun', label: 'Sonne' },
  { id: 'mercury', label: 'Merkur' },
  { id: 'venus', label: 'Venus' },
  { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'europa', label: 'Europa' },
];

interface Window {
  title: string;
  wait: number;
  lead: number;
  ideal: number;
  hint: string;
}

/** Startfenster zum Mond (aus der Erdumlaufbahn) oder zu einem Planeten (Hohmann-Transfer). */
function transferInfo(f: Flight): Window | null {
  if (f.status !== 'flying' || f.refBody() !== EARTH) return null;
  const o = f.orbit(EARTH);
  if (!o.bound || o.periapsis < EARTH.atmosphere || o.apoapsis > 0.3 * MOON_DISTANCE) return null;
  if (f.target === 'station') return null;
  const target = f.target ? bodyById(f.target) : null;
  if (target && target.parent === 'sun' && target !== EARTH) {
    const w = transferWindow(EARTH, target);
    const ideal = ((w.lead % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const lead = phaseLead(EARTH, target, f.t);
    const rel = angularRate(EARTH) - angularRate(target);
    const gap = rel > 0 ? lead - ideal : ideal - lead;
    const wait = (((gap % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / Math.abs(rel);
    const outer = target.distance > EARTH.distance;
    return {
      title: `Startfenster ${target.name}`,
      wait: wait > (2 * Math.PI) / Math.abs(rel) - 86_400 ? 0 : wait,
      lead,
      ideal,
      hint: outer
        ? 'Bordcomputer (B): „Transfer“ – oder auf der sonnenabgewandten Seite zünden.'
        : 'Bordcomputer (B): „Transfer“ – oder auf der sonnenzugewandten Seite zünden.',
    };
  }
  if (target && target !== MOON) return null;
  if (f.goals.has('moonland') && !target) return null;
  const r = Math.hypot(f.x, f.y);
  const at = (r + MOON_DISTANCE) / 2;
  const tt = Math.PI * Math.sqrt(at ** 3 / EARTH.mu);
  const ideal = Math.PI - MOON_RATE * tt;
  const theta = Math.atan2(f.y, f.x);
  const lead = Math.atan2(Math.sin(theta - moonAngle(f.t)), Math.cos(theta - moonAngle(f.t)));
  const omega = (2 * Math.PI) / o.period;
  let gap = lead - ideal;
  gap = ((gap % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return {
    title: 'Mondfenster',
    wait: gap / (omega - MOON_RATE),
    lead: (lead + 2 * Math.PI) % (2 * Math.PI),
    ideal,
    hint: 'Bordcomputer (B): „Transfer zu: Mond“ – oder im Fenster in Flugrichtung Gas geben.',
  };
}

function tipFor(f: Flight, pilot: string | null): string {
  if (f.status === 'crashed') return '';
  if (pilot) return pilot;
  if (f.status === 'docked')
    return 'Angedockt an der Raumstation! „Tanken“ füllt alle Tanks. Mit „Ablegen“ geht es weiter – mit vollen Tanks bis zum Mars.';
  const ref = f.refBody();
  const o = f.orbit(ref);
  const rel = f.relative(ref);
  if (f.status === 'landed') {
    const on = f.landedOn;
    if (on === MOON)
      return 'Du stehst auf dem Mond! Zurück: „Hilfe-Pilot“ (T) bringt dich in eine Mondbahn, dann Bordcomputer „Rückflug“.';
    if (on === MARS)
      return 'Du stehst auf dem Mars! Ein Rückflug braucht viel Treibstoff – die Marsschwerkraft ist mehr als doppelt so stark wie die des Mondes.';
    if (on === VENUS)
      return 'Auf der Venus: 460 °C und 90-facher Luftdruck. Von hier startet keine Rakete mehr.';
    if (on === PHOBOS) return 'Auf Phobos! Hier genügt ein Hauch Schub zum Abheben.';
    if (on === MERCURY)
      return 'Auf dem Merkur: tagsüber über 400 °C, nachts −170 °C. Keine Luft, viele Krater.';
    if (on === EUROPA) return 'Auf Europa! Unter deinen Füßen liegt ein Ozean unter dem Eis.';
    if (!f.goals.has('lift'))
      return !f.infiniteFuel && f.deltaV() < 3_700
        ? `Schub hochziehen (W / ↑, Z = Vollgas) – oder „Countdown“ (C). Mit ${fmt(f.deltaV())} m/s Δv reicht es ins All, für eine Umlaufbahn braucht es rund 3.900 m/s.`
        : 'Schub hochziehen (W / ↑, Z = Vollgas) – oder „Countdown“ (C) drücken. Der Hilfe-Pilot (T) fliegt bis in die Umlaufbahn.';
    return 'Sicher gelandet! In der Werft kannst du eine größere Rakete bauen.';
  }
  if (f.chute === 'open')
    return 'Am Fallschirm – gleich sanft aufsetzen. Mit P wirfst du den Schirm ab (dann fällt die Rakete wieder).';
  if (f.chute === 'armed' && rel.altitude < Math.max(ref.atmosphere, 1))
    return 'Fallschirm scharf: Er öffnet sich von selbst in der unteren Luft, sobald die Rakete langsamer als 300 m/s ist. P entschärft ihn wieder.';
  if (f.sas === 'point') return 'SAS hält die gezeigte Richtung. Eine Drehtaste schaltet es aus.';
  if (ref === SUN)
    return 'Du kreist um die Sonne! Bordcomputer: „Kurskorrektur“ legt den tiefsten Punkt am Ziel fest. Dann Zeitraffer hoch.';
  if (ref === JUPITER)
    return 'Jupiter hat keine feste Oberfläche – nur vorbeifliegen oder einschwenken! Ziel „Europa“ wählen für den Eismond.';
  if (ref === PHOBOS)
    return 'Phobos hat fast keine Schwerkraft: mit ganz wenig Schub (unter 5 %) langsam aufsetzen. Zu viel Gas – und du fliegst davon.';
  if (ref === MARS || ref === VENUS || ref === MERCURY || ref === EUROPA) {
    if (!o.bound)
      return `Angekommen bei ${ref.name}! Bordcomputer: „Einschwenken“ – oder am tiefsten Punkt (Pe) gegen die Flugrichtung bremsen.`;
    if (ref.atmosphere > 0)
      return ref === VENUS
        ? 'Zur Landung: Bordcomputer „Wiedereintritt“, Fallschirm scharf (P). Die dichte Luft bremst stark.'
        : 'Zur Landung: Bordcomputer „Wiedereintritt“, Fallschirm (P) – in der dünnen Marsluft muss am Ende das Triebwerk bremsen.';
    return `Zur Landung: Bordcomputer „Abstieg“ und dann „Automatisch landen“ – oder selbst: bremsen, fallen, im letzten Moment Vollgas.`;
  }
  if (ref === MOON) {
    if (f.goals.has('moonland'))
      return 'Heimweg: Bordcomputer „Rückflug zu: Erde“. Zurück bei der Erde: „Wiedereintritt“ fein einstellen, dann Fallschirm.';
    if (!o.bound)
      return 'Im Einflussbereich des Mondes! Bordcomputer „Einschwenken“ oder am Pe gegen die Flugrichtung bremsen (SAS retrograd, Taste 3).';
    return 'Mondumlaufbahn! Zum Landen: Bordcomputer „Automatisch landen“ – oder selbst bremsen und kurz über dem Boden auf unter 8 m/s abbremsen.';
  }
  if (f.goals.has('moonland') || (f.goals.has('soi') && !o.bound))
    return 'Heimweg: Bordcomputer „Wiedereintritt“ (Pe 25 km), Stufe mit Triebwerk abwerfen, Fallschirm scharf (P), SAS retrograd.';
  if (!(o.bound && o.periapsis > EARTH.atmosphere)) {
    const climb = (rel.rx * rel.vx + rel.ry * rel.vy) / rel.r;
    if (climb < -20 && !f.thrusting && rel.altitude < 40_000)
      return f.chute === 'stowed'
        ? 'Die Rakete fällt! Fallschirm scharf machen (P) – oder aufrichten und mit dem Triebwerk bremsen.'
        : 'Die Rakete fällt! Aufrichten (SAS retrograd, Taste 3) und kurz vor dem Boden Gas geben.';
    if (rel.altitude < 3_000 && f.goals.size <= 2)
      return f.thrusting
        ? 'Senkrecht steigen. Ab 3 km langsam nach rechts neigen (D / →).'
        : f.chute === 'stowed'
          ? 'Triebwerk aus – die Rakete steigt noch ein Stück. Für die Landung den Fallschirm scharf machen (P).'
          : 'Triebwerk aus – die Rakete steigt noch ein Stück und fällt dann zurück.';
    if (o.apoapsis < 70_000)
      return f.thrusting
        ? 'Weiter nach rechts neigen: bei 20 km etwa halb, ab 40 km fast waagerecht. Ziel: höchster Bahnpunkt (Ap) über 70 km.'
        : 'Gas geben (W / ↑) und dabei flacher werden, bis der höchste Bahnpunkt (Ap) über 70 km liegt.';
    return f.thrusting && rel.altitude < 50_000
      ? 'Ap über 70 km – Schub aus (X). Bordcomputer „Kreisbahn am Ap“ plant den Rest.'
      : 'Am höchsten Punkt waagerecht in Flugrichtung (SAS prograd, Taste 2) Gas geben, bis der tiefste Punkt (Pe) über 40 km liegt.';
  }
  if (f.target === 'station') {
    const ti = f.targetInfo();
    if (ti && ti.distance < 3_000)
      return 'Fast da! RCS einschalten (R): W/S schieben vor und zurück, Q/E zur Seite. Mit weniger als 2 m/s an den grünen Stutzen heranfahren.';
    return 'Rendezvous: Bordcomputer „Rendezvous“, dann „Geschwindigkeit angleichen“ – oder selbst: Ap auf 150 km und die Annäherung auf der Karte verkleinern.';
  }
  if (f.satellitesOnBoard > 0)
    return 'In der Umlaufbahn! Mit N setzt du einen Satelliten aus – er kreist danach allein weiter.';
  if (o.apoapsis > 0.5 * MOON_DISTANCE)
    return 'Unterwegs! Zeitraffer hoch (.) oder „Zeitsprung“ – er bremst vor dem Ziel von selbst ab.';
  return 'Umlaufbahn geschafft! Wähle rechts ein Ziel: Station, Mond oder einen Planeten. Der Bordcomputer (B) plant den Weg.';
}

const MUTE_KEY = 'orbitlabor/rakete-ton-aus';

/** Ton aus? Die Wahl gilt für alle Flüge. */
function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // Ohne Speicher gilt die Wahl nur für diesen Flug.
  }
}

/** Höchstens so viele Meldungen gleichzeitig, jede so lange sichtbar. */
const MAX_TOASTS = 2;
const TOAST_MS = 5000;

/** Karriere und Sandkasten haben je einen eigenen Spielstand. */
function saveKey(sandbox: boolean): string {
  return sandbox ? 'orbitlabor/rakete-spielstand-sandkasten' : 'orbitlabor/rakete-spielstand';
}

function loadSnapshot(sandbox: boolean): FlightSnapshot | null {
  try {
    const raw = localStorage.getItem(saveKey(sandbox));
    const snap = raw ? (JSON.parse(raw) as FlightSnapshot) : null;
    return snap && typeof snap === 'object' && Array.isArray(snap.segs) ? snap : null;
  } catch {
    return null;
  }
}

/** „heute 14:32“ oder „3. Okt., 14:32“. */
function savedLabel(snap: FlightSnapshot | null): string {
  if (!snap?.savedAt) return '';
  const d = new Date(snap.savedAt);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? `heute ${time}`
    : `${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}, ${time}`;
}

interface Props {
  design: Design;
  paint: string;
  sandbox: boolean;
  sandboxSettings: SandboxSettings;
  knownGoals: readonly string[];
  stars: Record<string, number>;
  satellites: Satellite[];
  challenge: Challenge | null;
  bestStars: number;
  /** Welche Stern-Bedingungen schon einmal erfüllt wurden. */
  bestMet?: boolean[];
  onGoal: (id: GoalId) => void;
  onSatellites: (s: Satellite[]) => void;
  onChallenge: (id: string, result: ChallengeResult) => void;
  onNextChallenge: (() => void) | null;
  onExit: () => void;
  /** Zählt hoch, wenn die Zurück-Taste gedrückt wurde (öffnet das Pausenmenü). */
  backPressed?: number;
}

function makeFlight(
  design: Design,
  sandbox: SandboxSettings | null,
  challenge: Challenge | null,
  sats: Satellite[],
): Flight {
  const f = new Flight(challenge ? challenge.design : design);
  if (challenge) challenge.setup(f);
  else {
    if (sandbox) applySandbox(f, sandbox);
    f.satellites = modeSats(sats, !!sandbox);
  }
  return f;
}

/** Karriere und Sandkasten sehen nur ihre eigenen Satelliten. */
function modeSats(sats: readonly Satellite[], sandbox: boolean): Satellite[] {
  return sats.filter((s) => !!s.sandbox === sandbox).map((s) => ({ ...s, el: { ...s.el } }));
}

type Pilot = 'orbit' | 'node' | 'land' | null;

interface Drag {
  id: number;
  kind: HandleKind | 'node' | 'pan';
  x0: number;
  y0: number;
  x: number;
  y: number;
  time: number;
  moved: number;
}

export function FlightScreen({
  design,
  paint,
  sandbox,
  sandboxSettings,
  knownGoals,
  stars,
  satellites,
  challenge,
  bestStars,
  bestMet = [],
  onGoal,
  onSatellites,
  onChallenge,
  onNextChallenge,
  onExit,
  backPressed = 0,
}: Props) {
  const [run, setRun] = useState(0);
  const flight = useRef<Flight>(
    makeFlight(design, sandbox ? sandboxSettings : null, challenge, satellites),
  );
  const [, setTick] = useState(0);
  const [map, setMap] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [computer, setComputer] = useState(false);
  const [warpMenu, setWarpMenu] = useState(false);
  const [briefing, setBriefing] = useState(challenge !== null);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [report, setReport] = useState(false);
  /** Welche Menü-Aktion auf ein zweites Tippen wartet („Wirklich …?“). */
  const [confirm, setConfirm] = useState<'restart' | 'exit' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [saved, setSaved] = useState<FlightSnapshot | null>(() => loadSnapshot(sandbox));
  const [toasts, setToasts] = useState<FlightEvent[]>([]);
  const [box, size] = useElementSize<HTMLDivElement>();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const touchTurn = useRef(0);
  const touchMove = useRef({ x: 0, y: 0 });
  const pilot = useRef<Pilot>(null);
  const orbitPilot = useRef<OrbitPilot | null>(null);
  const executor = useRef<NodeExecutor | null>(null);
  const lander = useRef<LandingPilot | null>(null);
  const audioRef = useRef<RocketAudio | null>(null);
  if (!audioRef.current) {
    // Einmal pro Flug anlegen, mit der gespeicherten Ton-Einstellung.
    audioRef.current = new RocketAudio();
    audioRef.current.setMuted(readMuted());
  }
  const audio = audioRef as { current: RocketAudio };
  /** Zoomfaktor des Spielers; der Grundmaßstab folgt automatisch der Flughöhe. */
  const zoom = useRef(1);
  const mapCam = useRef<{ scale: number; focus: MapFocus; panX: number; panY: number }>({
    scale: 0,
    focus: 'ref',
    panX: 0,
    panY: 0,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<Drag | null>(null);
  const hits = useRef<MapHits>({ path: null, node: null, handles: [] });
  const lastView = useRef<View | null>(null);
  const pred = useRef<Prediction | null>(null);
  const predDirty = useRef(true);
  const mapOpen = useRef(map);
  mapOpen.current = map;
  const pausedRef = useRef(paused);
  // Jeder offene Dialog hält das Spiel an – auch die Hilfe und das Ergebnis.
  pausedRef.current = paused || briefing || report || help || result !== null;
  const helpRef = useRef(help);
  helpRef.current = help;
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;
  const memo = useRef<Memo>({});
  const judged = useRef(false);
  const startGoals = useRef(new Set<string>(knownGoals));
  /** Flugzeit beim Start dieses Flugs (für die Missionsuhr, falls nie abgehoben wurde). */
  const startT = useRef(flight.current.t);
  const goalCallback = useRef(onGoal);
  goalCallback.current = onGoal;
  const satCallback = useRef(onSatellites);
  satCallback.current = onSatellites;
  const challengeCallback = useRef(onChallenge);
  challengeCallback.current = onChallenge;
  const gamepadPrev = useRef<boolean[]>([]);
  setPaint(paint);

  const f = flight.current;
  const career = !sandbox && !challenge;
  // Nur im Entwicklungsmodus: Zugriff für automatische Browsertests.
  if (import.meta.env.DEV) Object.assign(window, { __rocket: flight });

  const toast = (text: string, kind: FlightEvent['kind'] = 'info'): void =>
    setToasts((t) => [...t, { id: -Math.random(), kind, text }].slice(-MAX_TOASTS));

  const refresh = (): void => {
    predDirty.current = true;
    setTick((t) => (t + 1) % 1_000_000);
  };

  const stopPilots = (): void => {
    pilot.current = null;
    orbitPilot.current = null;
    executor.current = null;
    lander.current = null;
  };

  const restart = (next?: Flight): void => {
    flight.current =
      next ?? makeFlight(design, sandbox ? sandboxSettings : null, challenge, satellites);
    startT.current = flight.current.t;
    stopPilots();
    pred.current = null;
    memo.current = {};
    judged.current = false;
    setToasts([]);
    setPaused(false);
    setResult(null);
    setReport(false);
    setCountdown(null);
    setBriefing(false);
    setRun((r) => r + 1);
  };

  const quicksave = (): void => {
    if (challenge) {
      toast('In Herausforderungen gibt es keine Spielstände.', 'warn');
      return;
    }
    const snap = flight.current.snapshot();
    if (!snap) {
      toast('Nach einem Absturz lässt sich nichts speichern.', 'warn');
      return;
    }
    snap.savedAt = Date.now();
    try {
      localStorage.setItem(saveKey(sandbox), JSON.stringify(snap));
      setSaved(snap);
      toast(
        sandbox
          ? 'Sandkasten-Spielstand gespeichert (F5). Laden mit F9.'
          : 'Spielstand gespeichert (F5). Laden mit F9.',
      );
    } catch {
      toast('Speichern nicht möglich – der Browser erlaubt keinen Speicher.', 'warn');
    }
  };

  const quickload = (): void => {
    if (challenge) {
      toast('In Herausforderungen gibt es keine Spielstände.', 'warn');
      return;
    }
    const snap = loadSnapshot(sandbox);
    if (!snap) {
      toast('Noch kein Spielstand gespeichert.', 'warn');
      return;
    }
    const restored = Flight.restore(snap);
    if (sandbox) {
      applyRules(restored, sandboxSettings);
      for (const s of restored.satellites) s.sandbox = true;
    } else if (restored.sandbox) {
      // Alter Spielstand aus dem Sandkasten: seine Satelliten bleiben draußen.
      restored.satellites = modeSats(satellites, false);
    }
    restart(restored);
    satCallback.current(restored.satellites);
    toast(
      restored.sandbox && !sandbox
        ? 'Spielstand aus dem Sandkasten geladen – dieser Flug bringt keine Punkte.'
        : 'Spielstand geladen.',
    );
  };

  const openMap = (open: boolean): void => {
    if (open) {
      const fl = flight.current;
      mapCam.current = {
        focus: 'ref',
        scale: fitMapScale(fl, size.width, size.height, 'ref'),
        panX: 0,
        panY: 0,
      };
    }
    predDirty.current = true;
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
      const next = Math.min(0.05, Math.max(1e-11, cam.scale * factor));
      cam.panX += ax / cam.scale - ax / next;
      cam.panY -= ay / cam.scale - ay / next;
      cam.scale = next;
    } else {
      zoom.current = Math.min(10_000, Math.max(0.001, zoom.current * factor));
    }
  };

  const setFocus = (foc: MapFocus): void => {
    mapCam.current = {
      panX: 0,
      panY: 0,
      focus: foc,
      scale:
        foc === 'rocket'
          ? Math.max(mapCam.current.scale, 2e-4)
          : fitMapScale(flight.current, size.width, size.height, foc),
    };
    setTick((t) => t + 1);
  };

  const setSas = (mode: SasMode): void => {
    const fl = flight.current;
    audio.current.unlock();
    if (mode !== 'off' && fl.sasDirection(mode) === null) {
      toast(
        mode === 'target'
          ? 'Erst ein Ziel wählen.'
          : mode === 'maneuver'
            ? 'Erst ein Manöver planen (Karte oder Bordcomputer).'
            : 'Diese Richtung gibt es gerade nicht.',
        'warn',
      );
      return;
    }
    fl.sas = mode;
    audio.current.beep();
    refresh();
  };

  const deploySatellite = (): void => {
    audio.current.unlock();
    if (flight.current.deploySatellite()) audio.current.clunk();
    refresh();
  };

  const noComputer = (): boolean => {
    if (!challenge || challenge.computer) return false;
    toast('Ohne Bordcomputer – in dieser Herausforderung fliegst du selbst.', 'warn');
    return true;
  };

  const togglePilot = (): void => {
    const fl = flight.current;
    audio.current.unlock();
    if (pilot.current === 'orbit') {
      stopPilots();
      fl.throttle = 0;
      fl.turn = 0;
      return;
    }
    if (noComputer()) return;
    const ref = fl.refBody();
    const o = fl.orbit(ref);
    if (
      (fl.status !== 'landed' && fl.status !== 'flying') ||
      (o.bound && o.periapsis > Math.max(ref.atmosphere, 5_000)) ||
      !ref.solid ||
      ref === SUN
    )
      return;
    const next = new OrbitPilot(ref);
    const dv = fl.deltaV();
    if (fl.status === 'landed' && !fl.infiniteFuel && dv < next.needed * 0.95) {
      toast(
        `Zu wenig Treibstoff für eine Umlaufbahn: ${fmt(dv)} m/s Δv, nötig sind etwa ${fmt(next.needed)} m/s. Mehr Tanks oder eine zweite Stufe anbauen.`,
        'warn',
      );
      return;
    }
    stopPilots();
    orbitPilot.current = next;
    pilot.current = 'orbit';
    setTick((t) => t + 1);
  };

  const toggleExecute = (on: boolean): void => {
    audio.current.unlock();
    if (on && noComputer()) return;
    stopPilots();
    if (on && flight.current.node) {
      executor.current = new NodeExecutor();
      pilot.current = 'node';
    } else flight.current.throttle = 0;
    refresh();
  };

  const toggleLanding = (on: boolean): void => {
    audio.current.unlock();
    if (on && noComputer()) return;
    stopPilots();
    if (on) {
      lander.current = new LandingPilot();
      pilot.current = 'land';
      toast('Lande-Autopilot übernimmt. Jede Steuertaste gibt die Kontrolle zurück.');
    } else flight.current.throttle = 0;
    refresh();
  };

  const startCountdown = (): void => {
    const fl = flight.current;
    audio.current.unlock();
    if (fl.status !== 'landed' || fl.stats.liftoff !== null) return;
    if (countdownRef.current !== null) {
      setCountdown(null);
      toast('Countdown abgebrochen.');
      return;
    }
    setCountdown(10);
    audio.current.say('Zehn');
  };

  const photo = (): void => {
    const c = canvas.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `raketenwerft-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Foto gespeichert.');
    }, 'image/png');
  };

  const warpTo = (t: number, what: string): void => {
    const fl = flight.current;
    stopPilots();
    fl.throttle = 0;
    if (fl.warpTo(t)) toast(`Zeitsprung ${what} (${clock(t - fl.t)}).`);
    setWarpMenu(false);
    refresh();
  };

  // Nachfragen gelten nur, solange das Menü offen ist.
  useEffect(() => {
    if (!paused) setConfirm(null);
  }, [paused]);

  // Zurück-Taste (Browser, Handy): nicht einfach verlassen, sondern das Menü öffnen.
  const backStart = useRef(backPressed);
  useEffect(() => {
    if (backPressed === backStart.current) return;
    setHelp(false);
    setPaused(true);
    toast('Zum Verlassen im Menü „Zur Werft“ wählen.');
  }, [backPressed]);

  // Neu laden oder Tab schließen während eines Flugs: der Browser fragt nach.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent): void => {
      const fl = flight.current;
      if (fl.stats.liftoff === null || fl.status === 'crashed') return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

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
      'q',
      'e',
      'z',
      'x',
      ' ',
      'f5',
      'f9',
      'shift',
    ]);
    // Umschalt fehlt absichtlich: „?“ (Umschalt + ß) soll keinen Autopiloten abschalten.
    const steer = new Set([
      'arrowleft',
      'arrowright',
      'a',
      'd',
      'z',
      'x',
      'arrowup',
      'arrowdown',
      'w',
      's',
    ]);
    const down = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
      if (tag === 'SELECT' || tag === 'TEXTAREA') return;
      // Strg/Cmd/Alt gehören dem Browser (Neu laden, Drucken, Suchen, Tab schließen …).
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const fl = flight.current;
      audio.current.unlock();
      if (pausedRef.current || fl.status === 'crashed') {
        // Bei offenem Dialog nur Esc, Hilfe und (nach dem Absturz) Laden.
        if (k === 'escape') {
          e.preventDefault();
          if (helpRef.current) setHelp(false);
          else if (paused) setPaused(false);
        } else if ((k === 'h' || k === '?') && !briefing && !report && result === null) {
          setHelp((h) => !h);
        } else if (k === 'f9' && fl.status === 'crashed' && !pausedRef.current) {
          e.preventDefault();
          quickload();
        } else if (k === 'f5' || k === 'f9' || k === ' ') e.preventDefault();
        return;
      }
      if (k === '?') keys.current.delete('shift');
      if (control.has(k) || /^[1-7]$/.test(k)) e.preventDefault();
      if (steer.has(k) && pilot.current) {
        stopPilots();
        toast('Autopilot aus – du steuerst.');
      }
      if (e.repeat && !['arrowup', 'arrowdown', 'w', 's', 'shift'].includes(k)) return;
      keys.current.add(k);
      if (k === ' ') fl.stage();
      else if (k === 'z') fl.throttle = 1;
      else if (k === 'x') fl.throttle = 0;
      else if (k === 'm') openMap(!mapOpen.current);
      else if (k === 'p') fl.toggleChute();
      else if (k === 'u') fl.toggleAirbrakes();
      else if (k === 'n') deploySatellite();
      else if (k === 'b') setComputer((c) => !c);
      else if (k === 'l') toggleLanding(pilot.current !== 'land');
      else if (k === 'c') startCountdown();
      else if (k === 'o') photo();
      else if (k === 'f') {
        fl.fine = !fl.fine;
        toast(fl.fine ? 'Feinsteuerung an: langsam drehen.' : 'Feinsteuerung aus.');
      } else if (k === 'r') {
        fl.rcs = !fl.rcs;
        toast(fl.rcs ? 'RCS an: W/S vor und zurück, Q/E seitwärts.' : 'RCS aus.');
      } else if (/^[1-7]$/.test(k)) setSas(SAS_MODES[Number(k) - 1]!.mode);
      else if (k === 'delete' && fl.node) {
        fl.clearNode();
        refresh();
      } else if (k === '.' || k === '>') warpBy(1);
      else if (k === ',' || k === '<') warpBy(-1);
      else if (k === '+') zoomBy(1.4);
      else if (k === '-') zoomBy(1 / 1.4);
      else if (k === 't') togglePilot();
      else if (k === 'escape') {
        if (helpRef.current) setHelp(false);
        else if (warpMenu) setWarpMenu(false);
        else setPaused((p) => !p);
      } else if (k === 'h' || k === '?') setHelp((h) => !h);
      else if (k === 'f5') quicksave();
      else if (k === 'f9') quickload();
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

  // Maus und Finger auf dem Spielfeld
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    /** Abstand zum Ursprung der Karte (dort bleibt beim Zoomen alles stehen). */
    const rel = (e: { clientX: number; clientY: number }): [number, number] => {
      const r = c.getBoundingClientRect();
      const { ox, oy } = mapArea(r.width, r.height);
      return [e.clientX - r.left - ox, e.clientY - r.top - oy];
    };
    const local = (e: { clientX: number; clientY: number }): [number, number] => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      const [ax, ay] = rel(e);
      zoomBy(Math.exp(-e.deltaY * 0.0015), ax, ay);
    };
    /** Nächster Punkt der Vorhersage unter dem Finger (Index oder -1). */
    const nearestPath = (x: number, y: number, max: number): number => {
      const p = hits.current.path;
      if (!p) return -1;
      let best = -1;
      let bestD = max;
      for (let i = 1; i < p.n; i++) {
        const d = Math.hypot(p.xs[i]! - x, p.ys[i]! - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };
    const down = (e: PointerEvent): void => {
      c.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size > 1) {
        drag.current = null;
        return;
      }
      const [x, y] = local(e);
      let kind: Drag['kind'] = 'pan';
      if (mapOpen.current) {
        const h = hits.current;
        const handle = h.handles.find((q) => Math.hypot(q.x - x, q.y - y) < 16);
        if (handle && !flight.current.node?.frozen) kind = handle.kind;
        else if (
          h.node &&
          Math.hypot(h.node.x - x, h.node.y - y) < 13 &&
          !flight.current.node?.frozen
        )
          kind = 'node';
      }
      drag.current = {
        id: e.pointerId,
        kind,
        x0: x,
        y0: y,
        x,
        y,
        time: performance.now(),
        moved: 0,
      };
    };
    const move = (e: PointerEvent): void => {
      const ps = pointers.current;
      const old = ps.get(e.pointerId);
      if (!old) return;
      const d = drag.current;
      if (d && d.id === e.pointerId) {
        const [x, y] = local(e);
        d.moved = Math.max(d.moved, Math.hypot(x - d.x0, y - d.y0));
        d.x = x;
        d.y = y;
      }
      if (ps.size === 1 && mapOpen.current && (!d || d.kind === 'pan')) {
        const cam = mapCam.current;
        cam.panX -= (e.clientX - old.x) / cam.scale;
        cam.panY += (e.clientY - old.y) / cam.scale;
      } else if (ps.size === 1 && d?.kind === 'node') {
        // Manöver entlang der Bahn verschieben
        const i = nearestPath(d.x, d.y, 60);
        const p = hits.current.path;
        if (i > 0 && p) {
          flight.current.editNode({ t: p.ts[i]! });
          predDirty.current = true;
        }
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
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      const held = performance.now() - d.time;
      const tap = d.moved < 7 && held < 450;
      // In der Flugansicht dreht erst längeres Drücken die Rakete – ein knapp verfehlter
      // Knopf soll sie nicht herumreißen.
      const hold = d.moved < 7 && held >= 350 && held < 2500;
      if (d.kind !== 'pan' || (mapOpen.current ? !tap : !hold)) {
        refresh();
        return;
      }
      const fl = flight.current;
      if (mapOpen.current) {
        // Klick auf die Bahn: Manöver planen oder dorthin verschieben
        const i = nearestPath(d.x, d.y, 18);
        const p = hits.current.path;
        if (i > 0 && p && fl.status === 'flying') {
          if (fl.node && !fl.node.frozen) fl.editNode({ t: p.ts[i]! });
          else if (!fl.node) {
            fl.setNode(p.ts[i]!, 0, 0);
            toast(
              'Manöver gesetzt: Die Anfasser ziehen – grün = in Flugrichtung, türkis = radial.',
            );
          }
          refresh();
        }
      } else if (fl.status === 'flying' && lastView.current) {
        // Gedrückt halten in der Flugansicht: Rakete zeigt in diese Richtung (SAS „Zeigen“).
        const [wx, wy] = toWorld(lastView.current, d.x, d.y);
        const [cx, cy] = fl.center();
        if (Math.hypot(wx - cx, wy - cy) * lastView.current.scale > 30) {
          fl.sasAngle = Math.atan2(wy - cy, wx - cx);
          fl.sas = 'point';
          if (pilot.current) stopPilots();
          refresh();
        }
      }
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
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    box.current?.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
  }, []);

  // Spielschleife
  useEffect(() => {
    let id = 0;
    let last = performance.now();
    let hudTimer = 0;
    let predTimer = 1;
    let lastEvent = 0;
    let alarmTimer = 0;
    let segCount = flight.current.segs.length;
    let satCount = flight.current.satellites.length;
    let landings = flight.current.stats.landings;
    let status = flight.current.status;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const frame = (now: number): void => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const fl = flight.current;
      const k = keys.current;

      // Gamepad: linker Stick drehen, Trigger Schub, A Stufe, B Fallschirm, X RCS, Y Karte.
      let padTurn = 0;
      let padThrottle = 0;
      let padMove = { x: 0, y: 0 };
      const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const pad = [...pads].find((p) => p && p.connected);
      if (pad) {
        const dead = (x: number): number => (Math.abs(x) < 0.15 ? 0 : x);
        padTurn = dead(pad.axes[0] ?? 0);
        padMove = { x: dead(pad.axes[2] ?? 0), y: -dead(pad.axes[3] ?? 0) };
        padThrottle = (pad.buttons[7]?.value ?? 0) - (pad.buttons[6]?.value ?? 0);
        const pressed = pad.buttons.map((b) => b.pressed);
        const edge = (i: number): boolean => !!pressed[i] && !gamepadPrev.current[i];
        if (pausedRef.current || fl.status === 'crashed') {
          // Bei offenem Dialog nur die Start-Taste (Pause an/aus).
          if (edge(9) && !briefing && !report && result === null) setPaused((p) => !p);
          gamepadPrev.current = pressed;
          padTurn = 0;
          padThrottle = 0;
          padMove = { x: 0, y: 0 };
        } else {
          if (edge(0)) fl.stage();
          if (edge(1)) fl.deployChute();
          if (edge(2)) fl.rcs = !fl.rcs;
          if (edge(3)) openMap(!mapOpen.current);
          if (edge(4)) warpBy(-1);
          if (edge(5)) warpBy(1);
          if (edge(9)) setPaused((p) => !p);
          if (edge(12)) setSas('prograde');
          if (edge(13)) setSas('retrograde');
          if (edge(14) || edge(15)) setSas('off');
          gamepadPrev.current = pressed;
          if (padTurn || padThrottle) {
            audio.current.unlock();
            if (pilot.current) stopPilots();
          }
        }
      }

      if (!pausedRef.current) {
        // Countdown
        const cd = countdownRef.current;
        if (cd !== null) {
          const next = cd - dt;
          if (Math.ceil(next) < Math.ceil(cd) && next > 0) {
            audio.current.beep();
            const n = Math.ceil(next);
            audio.current.say(
              ['', 'Eins', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun'][n] ??
                String(n),
            );
          }
          if (next <= 0) {
            fl.throttle = 1;
            audio.current.beep(true);
            audio.current.say('Start!');
            countdownRef.current = null;
            setCountdown(null);
          } else {
            countdownRef.current = next;
            setCountdown(next);
          }
        }
        // Autopiloten
        if (pilot.current === 'orbit' && orbitPilot.current) {
          const phase = orbitPilot.current.update(fl);
          if (phase === 'failed') {
            toast(orbitPilot.current.message, 'warn');
            stopPilots();
          } else if (phase === 'done') {
            stopPilots();
            if (fl.status !== 'crashed')
              toast('Hilfe-Pilot: Umlaufbahn erreicht. Jetzt übernimmst du!');
          }
        } else if (pilot.current === 'node' && executor.current) {
          const phase = executor.current.update(fl);
          if (phase === 'done' || phase === 'failed') {
            if (phase === 'failed') toast(executor.current.message, 'warn');
            stopPilots();
            fl.throttle = 0;
          }
        } else if (pilot.current === 'land' && lander.current) {
          const phase = lander.current.update(fl);
          if (phase === 'done' || phase === 'failed') {
            if (phase === 'failed') toast(lander.current.message || 'Landung abgebrochen.', 'warn');
            stopPilots();
            fl.throttle = 0;
          }
        } else {
          const turn =
            (k.has('arrowright') || k.has('d') ? 1 : 0) -
            (k.has('arrowleft') || k.has('a') ? 1 : 0) +
            touchTurn.current +
            padTurn;
          fl.turn = Math.max(-1, Math.min(1, turn));
          if (fl.rcs) {
            const fwd =
              (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
            const side = (k.has('e') ? 1 : 0) - (k.has('q') ? 1 : 0);
            fl.translate = {
              x: Math.max(-1, Math.min(1, side + touchMove.current.x + padMove.x)),
              y: Math.max(-1, Math.min(1, fwd + touchMove.current.y + padMove.y)),
            };
          } else {
            fl.translate = { x: 0, y: 0 };
            if (k.has('arrowup') || k.has('w') || k.has('shift'))
              fl.throttle = Math.min(1, fl.throttle + 0.8 * dt);
            if (k.has('arrowdown') || k.has('s')) fl.throttle = Math.max(0, fl.throttle - 0.8 * dt);
          }
          if (padThrottle) fl.throttle = Math.max(0, Math.min(1, fl.throttle + padThrottle * dt));
        }
        // Anfasser am Manöver: je weiter gezogen, desto schneller ändert sich das Δv.
        const d = drag.current;
        if (d && d.kind !== 'pan' && d.kind !== 'node' && fl.node && !fl.node.frozen) {
          const h = hits.current.handles.find((q) => q.kind === d.kind);
          if (h) {
            const along = (d.x - d.x0) * h.dx + (d.y - d.y0) * h.dy;
            const rate = Math.sign(along) * Math.min(3_000, 0.02 * along * along);
            const n = fl.node;
            if (d.kind === 'pro') fl.editNode({ prograde: n.prograde + rate * dt });
            else if (d.kind === 'retro') fl.editNode({ prograde: n.prograde - rate * dt });
            else if (d.kind === 'out') fl.editNode({ radial: n.radial + rate * dt });
            else fl.editNode({ radial: n.radial - rate * dt });
            predDirty.current = true;
          }
        }
        fl.update(dt);
        // Herausforderung werten
        if (challenge && !judged.current) {
          const r = challenge.judge(fl, memo.current);
          if (r) {
            judged.current = true;
            setResult(r);
            challengeCallback.current(challenge.id, r);
            if (r.success) audio.current.fanfare(r.stars);
            stopPilots();
          }
        }
      }
      if (fl.segs.length !== segCount) {
        segCount = fl.segs.length;
        audio.current.clunk();
      }
      if (fl.satellites.length !== satCount) {
        satCount = fl.satellites.length;
        if (!challenge) satCallback.current(fl.satellites);
      }
      if (fl.status !== status) {
        if (fl.status === 'docked') audio.current.dock();
        status = fl.status;
      }
      if (fl.stats.landings !== landings) {
        landings = fl.stats.landings;
        const far = fl.maxAltitude > 1_500 || fl.stats.lastLanding?.body !== 'earth';
        if (!challenge && fl.stats.liftoff !== null && far) setReport(true);
      }
      const air = fl.air();
      audio.current.engine(fl.thrusting && !pausedRef.current ? fl.throttle : 0, air.rho);
      const bodyV = fl.state(air.body);
      const q =
        0.5 *
        densityAt(air.body, air.altitude) *
        ((fl.vx - bodyV.vx) ** 2 + (fl.vy - bodyV.vy) ** 2);
      audio.current.ambience(
        pausedRef.current || fl.status !== 'flying' ? 0 : q,
        !pausedRef.current && fl.rcs && !!(fl.translate.x || fl.translate.y),
      );

      const fresh = fl.eventsAfter(lastEvent);
      if (fresh.length) {
        lastEvent = fresh[fresh.length - 1]!.id;
        for (const e of fresh) {
          if (e.kind === 'goal') audio.current.chime();
          if (e.kind === 'fail') {
            audio.current.explosion();
            audio.current.engine(0, 0);
          }
          if (e.text === 'Fallschirm offen!') audio.current.chute();
          // Punkte nur für echte Flüge – nicht im Sandkasten, auch nicht nach dem Laden eines
          // Sandkasten-Spielstands.
          if (e.goal && career && !fl.sandbox) goalCallback.current(e.goal);
        }
        // In Herausforderungen und im Sandkasten zählen Ziele nicht – ihre Meldungen stören dort nur.
        const shown = challenge || fl.sandbox ? fresh.filter((e) => e.kind !== 'goal') : fresh;
        if (shown.length) setToasts((t) => [...t, ...shown].slice(-MAX_TOASTS));
      }

      predTimer += dt;
      const dragging = drag.current && drag.current.kind !== 'pan';
      const every = dragging ? 0.05 : mapOpen.current ? 0.15 : 0.5;
      if (predTimer > every || (predDirty.current && predTimer > 0.05)) {
        predTimer = 0;
        predDirty.current = false;
        pred.current = fl.status === 'flying' ? fl.predict() : null;
      }

      // Warnton, wenn dringend gebremst werden muss
      alarmTimer -= dt;
      if (landingState(fl)?.urgent && alarmTimer <= 0 && !pausedRef.current) {
        audio.current.alarm();
        alarmTimer = 1.2;
      }
      // Blitz und Wackeln klingen auch in der Pause ab.
      if (pausedRef.current) {
        fl.flash = Math.max(0, fl.flash - dt * 1.8);
        fl.shake = Math.max(0, fl.shake - dt * 1.4);
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
            hits.current = drawMap(
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
              {
                time: now / 1000,
                active: drag.current?.kind === 'pan' ? null : (drag.current?.kind ?? null),
              },
            );
          } else {
            // Automatischer Zoom: Mit der Höhe wird herausgezoomt, damit der Boden im Bild bleibt.
            const altitude = Math.max(1, fl.nearest().altitude);
            // Am Boden näher heran, damit die eigene Rakete gut zu sehen ist (etwa 16 % der
            // Bildhöhe); schon nach wenigen hundert Metern gilt wieder der normale Zoom.
            const close = Math.max(1, (0.16 * H) / Math.max(fl.length, 1) / 5);
            const near =
              (5 * (1 + (close - 1) * Math.exp(-altitude / 150))) /
              Math.pow(1 + altitude / 300, 0.7);
            let base = Math.min(near, (H * 0.3) / altitude);
            // Beim Anflug auf die Station so zoomen, dass beide ins Bild passen.
            const ti = fl.target === 'station' ? fl.targetInfo() : null;
            if (ti && ti.distance < 20_000)
              base = Math.max(
                base,
                Math.min(6, (0.3 * Math.min(W, H)) / Math.max(ti.distance + 40, 60)),
              );
            const scale = Math.min(24, Math.max(1e-9, base * zoom.current));
            // Wackeln: Explosion, Stufentrennung und Triebwerk am Boden
            let amp = calm ? 0 : fl.shake * fl.shake * 14;
            if (!calm && fl.thrusting && fl.nearest().altitude < 2_000 && fl.warp <= 2)
              amp += 2.2 * fl.throttle * (1 - fl.nearest().altitude / 2_000);
            const sx = amp ? (Math.random() - 0.5) * 2 * amp : 0;
            const sy = amp ? (Math.random() - 0.5) * 2 * amp : 0;
            const view = flightView(fl, W, H, scale, sx, sy);
            lastView.current = view;
            drawFlight(ctx, fl, view, {
              time: now / 1000,
              flash: calm ? 0 : fl.flash,
              // Selbst herauszoomen macht auch die Rakete kleiner.
              minRocket: 34 * Math.min(1, zoom.current),
            });
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
      audio.current.ambience(0, false);
    };
  }, [run]);

  // Meldungen nach einigen Sekunden ausblenden – gleichzeitig eingetroffene gemeinsam.
  const toastBorn = useRef(new Map<number, number>());
  useEffect(() => {
    if (!toasts.length) {
      toastBorn.current.clear();
      return;
    }
    const now = performance.now();
    for (const t of toasts) if (!toastBorn.current.has(t.id)) toastBorn.current.set(t.id, now);
    const first = Math.min(...toasts.map((t) => toastBorn.current.get(t.id)!));
    const timer = setTimeout(
      () => {
        const cut = performance.now() - TOAST_MS + 600;
        setToasts((list) => list.filter((t) => (toastBorn.current.get(t.id) ?? 0) > cut));
      },
      Math.max(50, first + TOAST_MS - now),
    );
    return () => clearTimeout(timer);
  }, [toasts]);

  const hold = (dir: number) => ({
    onPointerDown: (e: PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      audio.current.unlock();
      if (pilot.current) stopPilots();
      touchTurn.current = dir;
    },
    onPointerUp: () => (touchTurn.current = 0),
    onPointerCancel: () => (touchTurn.current = 0),
    onLostPointerCapture: () => (touchTurn.current = 0),
  });

  const nudge = (x: number, y: number) => ({
    onPointerDown: (e: PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      touchMove.current = { x, y };
    },
    onPointerUp: () => (touchMove.current = { x: 0, y: 0 }),
    onPointerCancel: () => (touchMove.current = { x: 0, y: 0 }),
    onLostPointerCapture: () => (touchMove.current = { x: 0, y: 0 }),
  });

  const fullscreen = (): void => {
    // Das ganze Spiel in den Vollbildmodus, damit auch Dialoge sichtbar bleiben.
    const el = box.current?.closest<HTMLElement>('.game') ?? box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  // ------------------------------------------------------------ Anzeige
  const ref: Body = f.refBody();
  const rel = f.relative(ref);
  const o = f.orbit(ref);
  const sf = f.speedFrame();
  const speed = Math.hypot(sf.vx, sf.vy);
  const vertical = (rel.rx * rel.vx + rel.ry * rel.vy) / rel.r;
  const fuel = f.fuelCapacity > 0 ? f.active.fuel / f.fuelCapacity : 0;
  // In Herausforderungen nur, wenn ein Ziel gewählt ist – sonst lenkt das Fenster ab.
  const win = challenge && !f.target ? null : transferInfo(f);
  const ti = f.targetInfo();
  const site = f.siteInfo();
  const landing = landingState(f);
  const el = f.status === 'flying' && ref !== SUN ? f.elements(ref) : null;
  // Auf einer fast runden Bahn sind Ap und Pe kaum bestimmt: dann keine Zeiten.
  const round = !!el && el.e < CIRCULAR_E;
  const tAp = el && !round ? timeToApoapsis(el, f.t) : Infinity;
  const tPe = el && !round ? timeToPeriapsis(el, f.t) : Infinity;
  const goals = new Set<string>([...knownGoals, ...f.goals]);
  const points = careerPoints(goals, stars);
  const rank = rankFor(points);
  const open = GOALS.filter((g) => !goals.has(g.id)).slice(0, 5);
  const maxWarp = f.maxWarpIndex();
  const pilotLabel =
    pilot.current === 'orbit'
      ? 'Der Hilfe-Pilot fliegt in eine Umlaufbahn. Jede Steuertaste übernimmt wieder.'
      : pilot.current === 'node'
        ? `Autopilot führt das Manöver aus (${executor.current?.phase === 'burn' ? 'brennt' : executor.current?.phase === 'wait' ? 'wartet auf den Zündzeitpunkt' : 'richtet aus'}).`
        : pilot.current === 'land'
          ? `Lande-Autopilot: ${{ aero: 'die Luft bremst.', chute: 'am Fallschirm.', brake: 'Bahngeschwindigkeit abbauen.', fall: 'freier Fall.', suicide: 'Bremsen!', done: 'gelandet.', failed: 'abgebrochen.' }[lander.current?.phase ?? 'brake']}`
          : null;
  // Ein laufender Flug, den ein Fehlklick nicht beenden soll.
  const inProgress = f.stats.liftoff !== null && f.status !== 'crashed' && result === null;
  const orbitPilotAvailable =
    pilot.current !== 'orbit' &&
    (f.status === 'landed' || f.status === 'flying') &&
    ref.solid &&
    ref !== SUN &&
    !(o.bound && o.periapsis > Math.max(ref.atmosphere, 5_000)) &&
    (!challenge || challenge.computer);
  const newGoals = [...f.goals].filter((g) => !startGoals.current.has(g));
  const navSize = size.width < 640 ? 88 : size.width < 1000 ? 112 : 128;
  // Auf dem Handy stehen Meldungen unter dem Tipp, sonst links unter den Flugdaten.
  const phoneLayout = size.width > 0 && size.width < 760;
  const toastList = (
    <div class="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          class={`rocket-toast ${t.kind}`}
          onClick={() => setToasts([])}
          title="Antippen blendet die Meldungen aus"
        >
          {t.title && <strong>{t.title}</strong>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
  const jumps: { label: string; t: number; what: string }[] = [];
  if (f.status === 'flying') {
    if (f.node && !f.node.frozen)
      jumps.push({
        label: 'Zum Manöver',
        t: f.nodeBurnStart() - 15,
        what: 'bis kurz vor das Manöver',
      });
    if (Number.isFinite(tAp) && tAp > 5)
      jumps.push({ label: 'Zum Ap (höchster Punkt)', t: f.t + tAp, what: 'zum Ap' });
    if (Number.isFinite(tPe) && tPe > 5)
      jumps.push({ label: 'Zum Pe (tiefster Punkt)', t: f.t + tPe, what: 'zum Pe' });
    const enc = pred.current?.encounter;
    if (enc && enc.index > 0)
      jumps.push({
        label: `In die Hill-Sphäre: ${enc.body.name}`,
        t: pred.current!.ts[enc.enter]!,
        what: `bis ${enc.body.name}`,
      });
    if (win && win.wait > 60)
      jumps.push({ label: win.title, t: f.t + win.wait - 60, what: 'bis zum Startfenster' });
  }
  // Stundensprünge nur, wenn nichts passieren kann: am Boden, angedockt oder antriebslos auf einer
  // Bahn, die nicht in Luft oder Boden führt (im Steigflug würde der Sprung die Rakete abstürzen lassen).
  const safeCoast =
    f.status === 'flying' &&
    f.throttle === 0 &&
    (!o.bound || o.periapsis > Math.max(ref.atmosphere, 2_000) + 1_000);
  if (f.status === 'landed' || f.status === 'docked' || safeCoast)
    for (const h of [1, 6, 24])
      jumps.push({ label: `+ ${h} h`, t: f.t + h * 3600, what: `um ${h} h` });

  return (
    <div
      class={`rocket-stage ${map ? 'is-map' : ''} ${toasts.length ? 'has-toast' : ''} ${computer ? 'has-computer' : ''}`}
      ref={box}
      onPointerUp={(e) => {
        // Nach einem Klick behält ein Knopf sonst den Fokus – dann löst die Leertaste
        // (Stufe) ihn ein zweites Mal aus. Wer mit der Tastatur navigiert, behält den Fokus.
        const t = (e.target as HTMLElement).closest('button');
        if (t && e.pointerType !== '') t.blur();
      }}
      onPointerDown={(e) => {
        // Klick neben das Zeitsprung-Menü schließt es.
        if (warpMenu && !(e.target as HTMLElement).closest('.warp-menu-wrap')) setWarpMenu(false);
      }}
    >
      <div class="rocket-canvas" ref={stage}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={
            map
              ? 'Karte des Sonnensystems mit vorhergesagter Bahn – Klick auf die Bahn plant ein Manöver'
              : 'Flugansicht der Rakete – gedrückt halten richtet die Rakete aus'
          }
        />
      </div>

      {/* Oben links: Menü, Karte und Flugdaten */}
      <div class="hud-tl">
        <div class="hud-row">
          <button
            type="button"
            class="hbtn icon"
            onClick={() => setPaused(true)}
            aria-label="Menü öffnen (Esc)"
            title="Menü (Esc)"
          >
            <Icon name="menu" />
          </button>
          <button
            type="button"
            class={`hbtn ${map ? 'on' : ''}`}
            onClick={() => openMap(!map)}
            title="Karte (M)"
          >
            <Icon name={map ? 'rocket' : 'map'} />
            <span class="hbtn-label">{map ? 'Rakete' : 'Karte'}</span>
          </button>
          {map && (
            <select
              class="hselect"
              aria-label="Kartenmitte"
              value={mapCam.current.focus}
              onChange={(e) => setFocus((e.target as HTMLSelectElement).value as MapFocus)}
            >
              {FOCI.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div class="telemetry">
          <div class="tele-head">
            {ref.name}
            {sf.mode === 'target' ? ' · relativ zur Station' : ''}
          </div>
          <div class="tele-big">
            <span>Höhe</span>
            <strong>{distance(rel.altitude)}</strong>
          </div>
          <div class="tele-big">
            <span>Tempo</span>
            <strong>
              {fmt(speed, speed < 10 ? 1 : 0)} <small>m/s</small>
            </strong>
          </div>
          <dl class="tele-rows">
            <dt>Ap</dt>
            <dd>
              {o.bound ? distance(o.apoapsis) : 'Flucht'}
              {Number.isFinite(tAp) && f.status === 'flying' && <small>{shortTime(tAp)}</small>}
              {round && <small>Kreisbahn</small>}
            </dd>
            <dt>Pe</dt>
            <dd class={o.periapsis < 0 && f.status === 'flying' ? 'bad' : ''}>
              {o.periapsis < 0 ? (ref.solid ? 'im Boden' : 'im Inneren') : distance(o.periapsis)}
              {Number.isFinite(tPe) && f.status === 'flying' && o.periapsis >= 0 && (
                <small>{shortTime(tPe)}</small>
              )}
            </dd>
            <dt>Steigen</dt>
            <dd>{fmt(vertical)} m/s</dd>
          </dl>
          <div class="tele-foot">
            <span title="Missionszeit seit dem Start">
              {f.stats.liftoff === null && f.status === 'landed'
                ? countdown !== null
                  ? `T− 00:${String(Math.ceil(countdown)).padStart(2, '0')}`
                  : 'T− 00:00'
                : `T+ ${missionClock(f.t - (f.stats.liftoff ?? startT.current))}`}
            </span>
            <span class={f.gForce > 6 ? 'bad' : ''}>{fmt(f.gForce, 1)} g</span>
          </div>
        </div>
      </div>

      {/* Oben Mitte: Zeitraffer, Tipp und Meldungen */}
      <div class="hud-tc">
        <div class="warp" role="group" aria-label="Zeitraffer">
          <button
            type="button"
            onClick={() => warpBy(-1)}
            disabled={f.warpIndex === 0}
            aria-label="Langsamer (Komma)"
            title="Langsamer ( , )"
          >
            <Icon name="chevron" />
          </button>
          <span class="warp-val" title="Zeitraffer">
            {fmt(f.warp)}×
          </span>
          <button
            type="button"
            onClick={() => warpBy(1)}
            disabled={f.warpIndex >= maxWarp}
            aria-label="Schneller (Punkt)"
            title="Schneller ( . )"
          >
            <Icon name="chevron" />
          </button>
          <div class="warp-menu-wrap">
            <button
              type="button"
              class={`warp-jump ${warpMenu || f.warpTarget !== null ? 'on' : ''}`}
              onClick={() => setWarpMenu(!warpMenu)}
              aria-expanded={warpMenu}
              aria-label="Zeitsprung"
              title="Zeitsprung: automatisch vorspulen und rechtzeitig abbremsen"
            >
              <Icon name="forward" />
            </button>
            {warpMenu && (
              <div class="warp-menu" role="menu">
                <div class="warp-menu-title">Zeitsprung</div>
                {f.warpTarget !== null && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      f.setWarp(0);
                      setWarpMenu(false);
                    }}
                  >
                    ■ Anhalten
                  </button>
                )}
                {jumps.map((j) => (
                  <button
                    key={j.label}
                    type="button"
                    role="menuitem"
                    onClick={() => warpTo(j.t, j.what)}
                  >
                    {j.label}
                    <span>{clock(j.t - f.t)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tipp und Meldungen */}
      <div class="hud-msg">
        <div class="hud-pills">
          {win && (
            <div class={`hud-pill ${win.wait < 30 ? 'now' : ''}`} title={win.hint}>
              <strong>{win.title}</strong>
              <span>{win.wait < 30 ? 'jetzt!' : `in ${clockIn(win.wait)}`}</span>
            </div>
          )}
          {f.node && (
            <div class="hud-pill node">
              <strong>
                Manöver {fmt(f.nodeRemaining().mag, f.nodeRemaining().mag < 10 ? 1 : 0)} m/s
              </strong>
              <span>
                {f.node.frozen ? 'jetzt brennen!' : `zünden in ${clockIn(f.nodeBurnStart() - f.t)}`}
              </span>
            </div>
          )}
        </div>
        {f.status !== 'crashed' && !paused && !briefing && (
          <div class="hud-tip">
            {challenge && !pilotLabel
              ? // Tipps der Herausforderung, alle paar Sekunden der nächste
                challenge.tips[Math.floor(performance.now() / 7000) % challenge.tips.length]
              : tipFor(f, pilotLabel)}
          </div>
        )}
        {phoneLayout && toastList}
      </div>
      {/* Meldungen am Rand statt mitten über Rakete und Bahn */}
      {!phoneLayout && <div class="hud-toasts">{toastList}</div>}

      {/* Oben rechts: Ziel, Bordcomputer, Aufgabe */}
      <div class="hud-tr">
        <div class="hud-row">
          <label class="hselect-wrap" title="Ziel wählen">
            <Icon name="target" />
            <select
              class="hselect"
              aria-label="Ziel"
              value={f.target ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                f.target = v ? (v as TargetId) : null;
                refresh();
              }}
            >
              <option value="">Kein Ziel</option>
              {TARGETS.filter((t) => t.id !== ref.id).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            class={`hbtn ${computer ? 'on' : ''}`}
            onClick={() => setComputer(!computer)}
            aria-expanded={computer}
            title="Bordcomputer (B)"
          >
            <Icon name="chip" />
            <span class="hbtn-label">Bordcomputer</span>
          </button>
        </div>
        {(ti || (site && !challenge)) && (
          <dl class="hud-card target-info">
            {ti && (
              <>
                <dt>Abstand</dt>
                <dd>{distance(ti.distance)}</dd>
                <dt>Relativ</dt>
                <dd>{fmt(ti.speed, ti.speed < 10 ? 1 : 0)} m/s</dd>
                <dt>{ti.closing > 0 ? 'Kommt näher' : 'Entfernt sich'}</dt>
                <dd>{fmt(Math.abs(ti.closing), Math.abs(ti.closing) < 10 ? 1 : 0)} m/s</dd>
              </>
            )}
            {site && !challenge && (
              <>
                <dt>{site.name}</dt>
                <dd>{site.distance < 10_000 ? `${fmt(site.distance)} m` : km(site.distance)}</dd>
              </>
            )}
          </dl>
        )}
        {challenge ? (
          <div class="hud-card challenge-box">
            <div class="hud-card-title">{challenge.title}</div>
            <p>{challenge.progress(f)}</p>
            <ol>
              {challenge.stars.map((st, i) => (
                <li key={st}>
                  <span aria-hidden="true">{'★'.repeat(i + 1)}</span> {st}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div class="hud-card goals">
            <div class="hud-card-title">
              {f.sandbox ? 'Sandkasten · keine Punkte' : `${rank.title} · ${points} P.`}
            </div>
            <ul class="goal-list" hidden={f.sandbox}>
              {open.slice(0, 3).map((g) => (
                <li key={g.id} title={g.text}>
                  <span aria-hidden="true">☆</span> {g.title} <span class="pts">+{g.points}</span>
                </li>
              ))}
              {open.length === 0 && <li class="done">★ Alle Ziele erreicht!</li>}
            </ul>
          </div>
        )}
      </div>

      {computer && (
        <ComputerPanel
          flight={flight}
          targets={TARGETS}
          pred={pred}
          executing={pilot.current === 'node'}
          landing={pilot.current === 'land'}
          allowed={!challenge || challenge.computer}
          onExecute={toggleExecute}
          onLand={toggleLanding}
          onChanged={refresh}
          onClose={() => setComputer(false)}
        />
      )}

      <div class="hud-zoom" role="group" aria-label="Zoom">
        <button type="button" class="hbtn icon" onClick={() => zoomBy(1.6)} aria-label="Vergrößern">
          <Icon name="plus" />
        </button>
        <button
          type="button"
          class="hbtn icon"
          onClick={() => zoomBy(1 / 1.6)}
          aria-label="Verkleinern"
        >
          <Icon name="minus" />
        </button>
      </div>

      {landing && (landing.urgent || landing.impact < 60) && !pilot.current && (
        <div class={`landing-alert ${landing.urgent ? 'urgent' : ''}`} role="status">
          {landing.urgent
            ? landing.weak
              ? 'Achtung: Mit diesem Triebwerk reicht der Schub nicht zum Bremsen!'
              : 'Jetzt bremsen! Rakete aufrichten und Gas geben.'
            : `Boden in ${fmt(landing.impact)} s – bald bremsen`}
        </div>
      )}
      {countdown !== null && (
        <div class="countdown" aria-live="assertive">
          {Math.ceil(countdown)}
        </div>
      )}

      {/* Unten links: drehen und RCS */}
      <div class="hud-bl">
        {f.rcs && (
          <div class="rcs-pad" role="group" aria-label="RCS-Düsen">
            <button type="button" class="hbtn icon" aria-label="Vorwärts" {...nudge(0, 1)}>
              <Icon name="up" />
            </button>
            <button type="button" class="hbtn icon" aria-label="Links" {...nudge(-1, 0)}>
              <Icon name="up" />
            </button>
            <button type="button" class="hbtn icon" aria-label="Rechts" {...nudge(1, 0)}>
              <Icon name="up" />
            </button>
            <button type="button" class="hbtn icon" aria-label="Rückwärts" {...nudge(0, -1)}>
              <Icon name="down" />
            </button>
          </div>
        )}
        <div class="turn-pad">
          <button type="button" class="round-btn" aria-label="Nach links drehen" {...hold(-1)}>
            <Icon name="rotl" />
          </button>
          <button type="button" class="round-btn" aria-label="Nach rechts drehen" {...hold(1)}>
            <Icon name="rotr" />
          </button>
        </div>
      </div>

      {/* Unten Mitte: Lageanzeige mit SAS */}
      <div class="hud-bc">
        <Navball flight={flight} size={navSize} onSas={setSas} />
      </div>

      {/* Unten rechts: Aktionen, Stufe und Schub */}
      <div class="hud-br">
        <div class="action-col">
          {f.status === 'docked' ? (
            <>
              <button
                type="button"
                class="abtn go"
                onClick={() => {
                  if (f.refuel()) toast('Alle Tanks sind voll!');
                }}
              >
                Tanken
              </button>
              <button type="button" class="abtn" onClick={() => f.undock()}>
                Ablegen
              </button>
            </>
          ) : (
            <>
              {f.status === 'landed' && f.stats.liftoff === null && f.landedOn === EARTH && (
                <button
                  type="button"
                  class={`abtn ${countdown !== null ? 'on' : ''}`}
                  onClick={startCountdown}
                >
                  {countdown !== null ? 'Abbrechen' : 'Countdown'} <kbd>C</kbd>
                </button>
              )}
              {(orbitPilotAvailable || pilot.current === 'orbit') && (
                <button
                  type="button"
                  class={`abtn ${pilot.current === 'orbit' ? 'on' : ''}`}
                  onClick={togglePilot}
                >
                  {pilot.current === 'orbit' ? 'Hilfe-Pilot aus' : 'Hilfe-Pilot'} <kbd>T</kbd>
                </button>
              )}
              {pilot.current && pilot.current !== 'orbit' && (
                <button type="button" class="abtn on" onClick={() => stopPilots()}>
                  Autopilot aus
                </button>
              )}
              {f.chute === 'stowed' && f.segs.length > 1 && (
                <button type="button" class="abtn" onClick={() => f.toggleChute()}>
                  Fallschirm <kbd>P</kbd>
                </button>
              )}
              {f.chute === 'armed' && (
                <button
                  type="button"
                  class="abtn on"
                  onClick={() => f.toggleChute()}
                  title="Der Schirm öffnet sich von selbst in der unteren Atmosphäre. Klick entschärft ihn wieder."
                >
                  Schirm scharf · aus <kbd>P</kbd>
                </button>
              )}
              {f.chute === 'open' && (
                <button type="button" class="abtn" onClick={() => f.cutChute()}>
                  Schirm abwerfen <kbd>P</kbd>
                </button>
              )}
              {f.satellitesOnBoard > 0 && f.status === 'flying' && (
                <button type="button" class="abtn" onClick={deploySatellite}>
                  Satellit ({f.satellitesOnBoard}) <kbd>N</kbd>
                </button>
              )}
              {f.hasAirbrakes && f.status === 'flying' && (
                <button
                  type="button"
                  class={`abtn ${f.airbrakes ? 'on' : ''}`}
                  onClick={() => f.toggleAirbrakes()}
                  aria-pressed={f.airbrakes}
                >
                  Luftbremse <kbd>U</kbd>
                </button>
              )}
              <button
                type="button"
                class={`abtn ${f.rcs ? 'on' : ''}`}
                onClick={() => (f.rcs = !f.rcs)}
                aria-pressed={f.rcs}
              >
                RCS <kbd>R</kbd>
              </button>
            </>
          )}
        </div>
        <div class="engine">
          <div class="gauges">
            <div
              class={`vgauge fuel ${fuel < 0.15 ? 'low' : ''}`}
              title={`Treibstoff der aktiven Stufe: ${fmt(fuel * 100)} %`}
            >
              <div class="vgauge-fill" style={{ height: `${fuel * 100}%` }} />
              <span>Tank</span>
            </div>
            {f.heat > 0.05 && (
              <div
                class={`vgauge heat ${f.heat > 0.6 ? 'low' : ''}`}
                title="Hitze beim Wiedereintritt – bei 100 % verglüht die Rakete"
              >
                <div class="vgauge-fill" style={{ height: `${Math.min(1, f.heat) * 100}%` }} />
                <span>{f.shielded ? 'Schild' : 'Hitze'}</span>
              </div>
            )}
          </div>
          <Throttle
            value={f.throttle}
            fine={f.fine}
            onChange={(v) => {
              if (pilot.current) stopPilots();
              audio.current.unlock();
              f.throttle = v;
            }}
          />
          <div class="engine-btns">
            {f.status === 'landed' && f.throttle === 0 ? (
              // Vor dem Start ist Abheben die wichtigste Aktion – nicht der Fallschirm.
              <button
                type="button"
                class="stage-btn"
                onClick={() => {
                  if (pilot.current) stopPilots();
                  audio.current.unlock();
                  f.throttle = 1;
                }}
                title="Vollgas geben und abheben (Z)"
              >
                <strong>Start</strong>
                <span>Vollgas</span>
              </button>
            ) : (
              <button
                type="button"
                class="stage-btn"
                onClick={() => {
                  audio.current.unlock();
                  f.stage();
                }}
                disabled={f.status === 'docked' || (f.segs.length <= 1 && f.chute !== 'stowed')}
                title="Nächste Stufe zünden (Leertaste)"
              >
                <strong>{f.segs.length > 1 || f.chute !== 'stowed' ? 'Stufe' : 'Schirm'}</strong>
                <span>
                  {f.segs.length > 1
                    ? `${f.segs.length - 1} übrig`
                    : f.chute === 'stowed'
                      ? 'scharf machen'
                      : 'keine mehr'}
                </span>
              </button>
            )}
            <button
              type="button"
              class="abtn go"
              onClick={() => {
                if (pilot.current) stopPilots();
                audio.current.unlock();
                f.throttle = 1;
              }}
            >
              Vollgas <kbd>Z</kbd>
            </button>
            <button
              type="button"
              class="abtn"
              onClick={() => {
                if (pilot.current) stopPilots();
                f.throttle = 0;
              }}
            >
              Aus <kbd>X</kbd>
            </button>
          </div>
        </div>
        <div class="dv-readout">
          Δv <strong>{f.infiniteFuel ? '∞' : `${fmt(f.deltaV())} m/s`}</strong>
        </div>
      </div>

      {paused && !help && f.status !== 'crashed' && !briefing && (
        <div class="rocket-overlay pause-menu" role="dialog" aria-label="Menü">
          <h3>Pause</h3>
          <div class="menu-list">
            <button type="button" class="mbtn primary" onClick={() => setPaused(false)}>
              <Icon name="play" /> Weiterfliegen <kbd>Esc</kbd>
            </button>
            <button
              type="button"
              class="mbtn"
              onClick={() => {
                if (inProgress && confirm !== 'restart') {
                  setConfirm('restart');
                  return;
                }
                setPaused(false);
                restart();
              }}
            >
              <Icon name="reset" /> {confirm === 'restart' ? 'Wirklich neu starten?' : 'Neustart'}
              {confirm === 'restart' && <small class="mbtn-note">Der Flug geht verloren</small>}
            </button>
            {!challenge && (
              <>
                <button type="button" class="mbtn" onClick={quicksave}>
                  <Icon name="save" /> Spielstand speichern <kbd>F5</kbd>
                </button>
                <button
                  type="button"
                  class="mbtn"
                  onClick={() => {
                    quickload();
                    setPaused(false);
                  }}
                  disabled={!saved}
                  title={saved ? `Gespeichert ${savedLabel(saved)}` : 'Noch kein Spielstand'}
                >
                  <Icon name="folder" /> Spielstand laden
                  {saved?.savedAt ? <small class="mbtn-note">{savedLabel(saved)}</small> : null}
                  <kbd>F9</kbd>
                </button>
              </>
            )}
            <button type="button" class="mbtn" onClick={photo}>
              <Icon name="camera" /> Foto speichern <kbd>O</kbd>
            </button>
            <button type="button" class="mbtn" onClick={() => setHelp(true)}>
              <Icon name="quiz" /> Steuerung <kbd>H</kbd>
            </button>
            <div class="menu-split">
              <button
                type="button"
                class="mbtn"
                onClick={() => {
                  setMuted(!muted);
                  audio.current.setMuted(!muted);
                  writeMuted(!muted);
                }}
                aria-pressed={muted}
              >
                <Icon name={muted ? 'mute' : 'sound'} />{' '}
                {muted ? 'Ton einschalten' : 'Ton ausschalten'}
              </button>
              <button type="button" class="mbtn" onClick={fullscreen}>
                <Icon name="expand" /> Vollbild
              </button>
            </div>
            <button
              type="button"
              class={`mbtn ${confirm === 'exit' ? 'warn' : ''}`}
              onClick={() => {
                if (inProgress && confirm !== 'exit') {
                  setConfirm('exit');
                  return;
                }
                onExit();
              }}
            >
              <Icon name="wrench" />{' '}
              {confirm === 'exit'
                ? 'Wirklich verlassen?'
                : challenge
                  ? 'Zur Übersicht'
                  : 'Zur Werft'}
              {confirm === 'exit' && (
                <small class="mbtn-note">
                  {challenge ? 'Der Versuch endet' : 'Nicht gespeicherter Flug geht verloren'}
                </small>
              )}
            </button>
          </div>
        </div>
      )}

      {help && (
        <div class="rocket-overlay help" role="dialog" aria-label="Hilfe">
          <h3>Steuerung</h3>
          <table class="table">
            <tbody>
              {HELP_ROWS.map(([keys, text]) => (
                <tr key={text}>
                  <td class="keys">
                    <KeyCaps keys={keys} />
                  </td>
                  <td>{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" class="btn primary" onClick={() => setHelp(false)}>
            Verstanden
          </button>
        </div>
      )}

      {briefing && challenge && (
        <ChallengeBrief
          challenge={challenge}
          best={bestMet}
          onStart={() => {
            audio.current.unlock();
            setBriefing(false);
          }}
          onExit={onExit}
        />
      )}

      {result && challenge && (
        <ChallengeResultView
          challenge={challenge}
          result={result}
          best={bestStars}
          bestMet={bestMet}
          f={f}
          onRetry={() => restart()}
          onNext={result.success ? onNextChallenge : null}
          onContinue={result.success && f.status !== 'crashed' ? () => setResult(null) : null}
          onExit={onExit}
        />
      )}

      {report && !result && (
        <FlightReport
          f={f}
          title={`Flugbericht: gelandet auf ${f.landedOn?.name ?? '–'}`}
          newGoals={newGoals}
        >
          <button type="button" class="btn primary" onClick={() => setReport(false)}>
            Weiter
          </button>
          <button type="button" class="btn" onClick={() => restart()}>
            <Icon name="reset" /> Neuer Flug
          </button>
          <button type="button" class="btn" onClick={onExit}>
            Zur Werft
          </button>
        </FlightReport>
      )}

      {f.status === 'crashed' && !result && (
        <div class="rocket-overlay" role="dialog" aria-label="Absturz">
          <h3>
            {f.crashReason.includes('verglüht')
              ? 'Verglüht!'
              : f.crashReason.includes('Gashülle')
                ? 'Verschluckt!'
                : 'Bumm! Die Rakete ist zerschellt.'}
          </h3>
          <p>{f.crashReason}</p>
          <details class="report-more">
            <summary>Flugdaten</summary>
            <FlightStatsTable f={f} />
          </details>
          <div class="btn-row">
            <button type="button" class="btn primary" onClick={() => restart()}>
              <Icon name="reset" /> Nochmal starten
            </button>
            {saved && !challenge && (
              <button type="button" class="btn" onClick={quickload}>
                Spielstand laden
              </button>
            )}
            <button type="button" class="btn" onClick={onExit}>
              Zurück zur Werft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tasten der Hilfe: Wörter wie „oder“ und „/“ stehen zwischen den Tastenkappen. */
const HELP_ROWS: [string[] | string, string][] = [
  [
    ['W', '/', 'S', 'oder', '↑', '/', '↓'],
    'Schub stufenlos (Umschalt: hoch; mit RCS: vor / zurück)',
  ],
  [['Z', '/', 'X'], 'Vollgas / Triebwerk aus'],
  [['A', '/', 'D', 'oder', '←', '/', '→'], 'Drehen (F: Feinsteuerung)'],
  [['1', 'bis', '7'], 'SAS: aus, prograd, retrograd, radial außen/innen, Ziel, Manöver'],
  ['Gedrückt halten', 'In der Flugansicht: Rakete zeigt in diese Richtung'],
  [['R', 'dann', 'Q', '/', 'E'], 'RCS-Düsen: seitwärts schieben (zum Andocken)'],
  [['Leertaste'], 'Nächste Stufe'],
  [['P'], 'Fallschirm scharf machen, entschärfen oder abwerfen'],
  [['N', '/', 'U'], 'Satellit aussetzen / Luftbremsen'],
  [['M'], 'Karte: Klick auf die Bahn plant ein Manöver, Anfasser ziehen'],
  [['B'], 'Bordcomputer: Pläne, Manöver, Autopilot'],
  [['L', '/', 'T', '/', 'C'], 'Lande-Autopilot / Hilfe-Pilot / Countdown'],
  [[',', 'und', '.'], 'Zeitraffer langsamer / schneller (Zeitsprung: automatisch vorspulen)'],
  [['F5', '/', 'F9'], 'Spielstand speichern / laden'],
  [['O'], 'Foto speichern (Buchstabe O)'],
  [['Esc', '/', 'H'], 'Menü (Pause, Speichern, Ton, Vollbild) / diese Hilfe'],
  ['Gamepad', 'Stick drehen, Trigger Schub, A Stufe, B Fallschirm, X RCS, Y Karte'],
];

const KEY_JOINERS = new Set(['/', 'oder', 'und', 'dann', 'bis']);

function KeyCaps({ keys }: { keys: string[] | string }) {
  if (typeof keys === 'string') return <span class="key-word">{keys}</span>;
  return (
    <>
      {keys.map((k, i) =>
        KEY_JOINERS.has(k) ? (
          <span key={i} class="key-join">
            {k}
          </span>
        ) : (
          <kbd key={i}>{k}</kbd>
        ),
      )}
    </>
  );
}

/**
 * Senkrechter Schubregler wie in Spaceflight Simulator: ziehen oder tippen.
 * Die Tasten W/S und die Pfeiltasten steuern ihn über die Tastatursteuerung des Spiels.
 */
function Throttle({
  value,
  fine,
  onChange,
}: {
  value: number;
  fine: boolean;
  onChange: (v: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const set = (clientY: number): void => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.height === 0) return;
    const v = Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height));
    // Oben und unten einrasten, damit 0 % und 100 % leicht zu treffen sind.
    onChange(v > 0.97 ? 1 : v < 0.03 ? 0 : v);
  };
  const pct = Math.round(value * 100);
  return (
    <div
      class="throttle"
      role="slider"
      aria-label="Schub"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct} %`}
      tabIndex={0}
      onKeyDown={(e) => {
        // Bedienbar mit der Tastatur, wenn der Regler den Fokus hat (Tab).
        const step: Record<string, number> = {
          ArrowUp: 0.05,
          ArrowRight: 0.05,
          ArrowDown: -0.05,
          ArrowLeft: -0.05,
          PageUp: 0.25,
          PageDown: -0.25,
        };
        let v: number | null = null;
        if (e.key in step) v = value + step[e.key]!;
        else if (e.key === 'Home') v = 0;
        else if (e.key === 'End') v = 1;
        if (v === null) return;
        e.preventDefault();
        e.stopPropagation();
        onChange(Math.min(1, Math.max(0, Math.round(v * 100) / 100)));
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        set(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) set(e.clientY);
      }}
    >
      <span class="throttle-val">{pct} %</span>
      <div class="throttle-track" ref={track}>
        <div class="throttle-fill" style={{ height: `${value * 100}%` }} />
        <div class="throttle-knob" style={{ bottom: `${value * 100}%` }} />
      </div>
      <span class="throttle-label">{fine ? 'Schub · fein' : 'Schub'}</span>
    </div>
  );
}

/** Landehilfe: Bremsweg bei Vollgas senkrecht nach oben im Vergleich zur Höhe. */
function landingState(f: Flight): { impact: number; urgent: boolean; weak: boolean } | null {
  if (f.status !== 'flying') return null;
  const near = f.nearest();
  const nearRel = f.relative(near.body);
  const descent = -(nearRel.rx * nearRel.vx + nearRel.ry * nearRel.vy) / nearRel.r;
  const gLocal = near.body.mu / nearRel.r ** 2;
  const brake = f.engine().thrust / f.mass - gLocal;
  const stopping = brake > 0 ? (descent * descent) / (2 * brake) : Infinity;
  if (!near.body.solid || descent <= 4 || near.altitude > 30_000 || f.chute === 'open') return null;
  return {
    // Fallzeit mit Schwerkraft: h = v·t + g·t²/2.
    impact: (-descent + Math.sqrt(descent * descent + 2 * gLocal * near.altitude)) / gLocal,
    urgent: stopping > 0.75 * near.altitude,
    weak: brake <= 0 || f.active.fuel <= 0,
  };
}
