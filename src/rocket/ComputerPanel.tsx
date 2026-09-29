import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../ui/Icon';
import type { Flight, Prediction, TargetId } from './flight';
import { clock, clockIn, duration, fmt } from './format';
import { period } from './kepler';
import {
  canReturnHome,
  landable,
  missionBudget,
  missionSteps,
  missionTitle,
  stepLabel,
  type MissionPilot,
  type MissionSpec,
  type MissionTarget,
} from './mission';
import { runPlan, warmPlanner } from './planClient';
import { planOptions, recommendedPlan, type Plan, type PlanId } from './planner';
import { EARTH, bodyById, forms, tinyBody } from './world';

/** Knopf, der beim Festhalten immer schneller wiederholt. */
function useRepeat(action: () => void) {
  const timer = useRef(0);
  const count = useRef(0);
  const stop = (): void => {
    window.clearTimeout(timer.current);
    timer.current = 0;
  };
  useEffect(() => stop, []);
  const tick = (): void => {
    action();
    count.current++;
    timer.current = window.setTimeout(tick, Math.max(40, 260 - count.current * 25));
  };
  return {
    onPointerDown: (e: PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      count.current = 0;
      stop();
      tick();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
  };
}

function Step({ label, action, title }: { label: string; action: () => void; title: string }) {
  const hold = useRepeat(action);
  return (
    <button type="button" class="step-btn" title={title} aria-label={title} {...hold}>
      {label}
    </button>
  );
}

interface Props {
  flight: { current: Flight };
  targets: readonly { id: TargetId; label: string }[];
  pred: { current: Prediction | null };
  executing: boolean;
  landing: boolean;
  allowed: boolean;
  /** Laufende Mission (Missions-Autopilot) oder null. */
  mission: MissionPilot | null;
  onExecute: (on: boolean) => void;
  onLand: (on: boolean) => void;
  onMission: (spec: MissionSpec | null) => void;
  onChanged: () => void;
  onClose: () => void;
}

/** Bordcomputer: Pläne auf Knopfdruck, Manöver fein einstellen, automatisch ausführen. */
export function ComputerPanel({
  flight,
  targets,
  pred,
  executing,
  landing,
  allowed,
  mission,
  onExecute,
  onLand,
  onMission,
  onChanged,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'plan' | 'mission'>(mission ? 'mission' : 'plan');
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [result, setResult] = useState<Plan | null>(null);
  const f = flight.current;
  const node = f.node;

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    warmPlanner();
    return () => {
      alive.current = false;
    };
  }, []);

  const plan = (id: PlanId): void => {
    setBusy(id);
    // Die Suche läuft im Hintergrund – das Spiel läuft währenddessen flüssig weiter.
    void runPlan(flight.current, id).then((r) => {
      onChanged();
      if (!alive.current) return;
      setResult(r);
      setBusy(null);
    });
  };

  const edit = (change: { t?: number; prograde?: number; radial?: number }): void => {
    const n = flight.current.node;
    if (!n || n.frozen) return;
    flight.current.editNode(change);
    onChanged();
  };

  if (!allowed)
    return (
      <div class="computer-panel" role="dialog" aria-label="Bordcomputer">
        <div class="cp-head">
          <strong>Bordcomputer</strong>
          <button type="button" class="cp-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <p class="small">
          In dieser Herausforderung fliegst du ohne Bordcomputer – Manöver kannst du auf der Karte
          trotzdem von Hand planen.
        </p>
      </div>
    );

  const options = planOptions(f, pred.current);
  const rec = recommendedPlan(f, options, pred.current);
  const rem = f.nodeRemaining();
  const total = node ? Math.hypot(node.prograde, node.radial) : 0;
  const burn = node ? f.burnTime(node.frozen ? rem.mag : total) : 0;
  const start = f.nodeBurnStart();
  const refOrbit = node ? f.orbit() : null;
  const P = node && refOrbit?.bound ? period(f.elements()) : Infinity;
  const ref = f.refBody();
  const rel = f.relative(ref);
  const climbing = (rel.rx * rel.vx + rel.ry * rel.vy) / rel.r > 5;
  // Landen nur anbieten, wenn es passt – nicht im Steigflug unter Schub.
  const solidRef = f.status === 'flying' && ref.solid && !(climbing && f.thrusting);
  // Ein naher winziger Mond als Ziel (Phobos): Dort landet der Autopilot, nicht auf dem Planeten.
  const tiny = f.target && f.target !== 'station' ? bodyById(f.target) : null;
  const near = tiny && tinyBody(tiny) ? f.targetInfo() : null;
  const landOn = tiny && near && near.distance < 30_000 ? tiny : ref;

  return (
    <div class="computer-panel" role="dialog" aria-label="Bordcomputer">
      <div class="cp-head">
        <strong>Bordcomputer</strong>
        <button type="button" class="cp-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
      </div>
      <div class="cp-tabs" role="tablist" aria-label="Bordcomputer-Modus">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plan'}
          class={tab === 'plan' ? 'on' : ''}
          onClick={() => setTab('plan')}
        >
          Manöver
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'mission'}
          class={tab === 'mission' ? 'on' : ''}
          onClick={() => setTab('mission')}
        >
          Mission{mission ? ' ●' : ''}
        </button>
      </div>
      {tab === 'mission' ? (
        <MissionTab flight={flight} targets={targets} mission={mission} onMission={onMission} />
      ) : (
        <>
          <label class="cp-target">
            <span class="small">Ziel</span>
            <select
              value={f.target ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                flight.current.target = v ? (v as TargetId) : null;
                setResult(null);
                onChanged();
              }}
            >
              <option value="">– keins –</option>
              {targets
                .filter((t) => t.id !== ref.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
            </select>
          </label>

          {!node && (
            <>
              {options.length === 0 ? (
                <p class="small muted">
                  {f.status === 'flying'
                    ? 'Gerade gibt es nichts zu planen. Wähle ein Ziel oder tippe auf der Karte (M) auf die Bahn.'
                    : 'Der Bordcomputer plant Manöver im Flug.'}
                </p>
              ) : (
                <div class="cp-plans">
                  {options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      class={`cp-plan ${o.id === rec ? 'rec' : ''}`}
                      title={o.hint}
                      disabled={busy !== null}
                      onClick={() => plan(o.id)}
                    >
                      <strong>
                        {busy === o.id ? 'Rechnet …' : o.label}
                        {o.id === rec && busy !== o.id && <em>nächster Schritt</em>}
                      </strong>
                      <span>{o.hint}</span>
                    </button>
                  ))}
                </div>
              )}
              {result && (
                <p class={`cp-result ${result.ok ? 'ok' : 'bad'}`}>
                  <strong>{result.title}:</strong> {result.text}
                </p>
              )}
              {!result?.ok && result?.wait && (
                <button
                  type="button"
                  class="cp-action"
                  onClick={() => {
                    const fl = flight.current;
                    const o = fl.orbit();
                    fl.warpTo(fl.t + result.wait! - (o.bound ? o.period : 600));
                    onChanged();
                  }}
                >
                  <Icon name="forward" /> Zeitsprung bis kurz vor das Fenster
                </button>
              )}
            </>
          )}

          {node && (
            <div class="cp-node">
              <div class="cp-row">
                <span>Manöver</span>
                <strong>
                  {fmt(total, total < 10 ? 1 : 0)} m/s ·{' '}
                  {node.t > f.t ? `in ${clockIn(node.t - f.t)}` : 'jetzt'}
                </strong>
              </div>
              <div class="cp-row">
                <span>Brenndauer</span>
                <strong>
                  {Number.isFinite(burn) ? duration(burn) : 'Treibstoff reicht nicht!'}
                </strong>
              </div>
              {!node.frozen && start > f.t && (
                <div class="cp-row">
                  <span>Zünden in</span>
                  <strong class={start - f.t < 30 ? 'soon' : ''}>{clock(start - f.t)}</strong>
                </div>
              )}
              {node.frozen ? (
                <div class="cp-progress">
                  <span>Noch {fmt(rem.mag, rem.mag < 10 ? 1 : 0)} m/s</span>
                  <div class="bar">
                    <div
                      class="fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, (1 - rem.mag / Math.max(total, 1e-6)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div class="cp-edit">
                    <span title="Schub in Flugrichtung (negativ = bremsen)">Flugrichtung</span>
                    <div class="cp-steps">
                      <Step
                        label="−10"
                        title="10 m/s weniger"
                        action={() => edit({ prograde: (flight.current.node?.prograde ?? 0) - 10 })}
                      />
                      <Step
                        label="−1"
                        title="1 m/s weniger"
                        action={() => edit({ prograde: (flight.current.node?.prograde ?? 0) - 1 })}
                      />
                      <Step
                        label="−0,1"
                        title="0,1 m/s weniger"
                        action={() =>
                          edit({ prograde: (flight.current.node?.prograde ?? 0) - 0.1 })
                        }
                      />
                      <output>{fmt(node.prograde, 1)}</output>
                      <Step
                        label="+0,1"
                        title="0,1 m/s mehr"
                        action={() =>
                          edit({ prograde: (flight.current.node?.prograde ?? 0) + 0.1 })
                        }
                      />
                      <Step
                        label="+1"
                        title="1 m/s mehr"
                        action={() => edit({ prograde: (flight.current.node?.prograde ?? 0) + 1 })}
                      />
                      <Step
                        label="+10"
                        title="10 m/s mehr"
                        action={() => edit({ prograde: (flight.current.node?.prograde ?? 0) + 10 })}
                      />
                    </div>
                  </div>
                  <div class="cp-edit">
                    <span title="Schub vom Körper weg (negativ = zum Körper hin)">Radial</span>
                    <div class="cp-steps">
                      <Step
                        label="−10"
                        title="10 m/s nach innen"
                        action={() => edit({ radial: (flight.current.node?.radial ?? 0) - 10 })}
                      />
                      <Step
                        label="−1"
                        title="1 m/s nach innen"
                        action={() => edit({ radial: (flight.current.node?.radial ?? 0) - 1 })}
                      />
                      <Step
                        label="−0,1"
                        title="0,1 m/s nach innen"
                        action={() => edit({ radial: (flight.current.node?.radial ?? 0) - 0.1 })}
                      />
                      <output>{fmt(node.radial, 1)}</output>
                      <Step
                        label="+0,1"
                        title="0,1 m/s nach außen"
                        action={() => edit({ radial: (flight.current.node?.radial ?? 0) + 0.1 })}
                      />
                      <Step
                        label="+1"
                        title="1 m/s nach außen"
                        action={() => edit({ radial: (flight.current.node?.radial ?? 0) + 1 })}
                      />
                      <Step
                        label="+10"
                        title="10 m/s nach außen"
                        action={() => edit({ radial: (flight.current.node?.radial ?? 0) + 10 })}
                      />
                    </div>
                  </div>
                  <div class="cp-edit">
                    <span>Zeitpunkt</span>
                    <div class="cp-steps">
                      {Number.isFinite(P) && (
                        <Step
                          label="−⟲"
                          title="Einen Umlauf früher"
                          action={() => edit({ t: (flight.current.node?.t ?? 0) - P })}
                        />
                      )}
                      <Step
                        label="−1m"
                        title="1 Minute früher"
                        action={() => edit({ t: (flight.current.node?.t ?? 0) - 60 })}
                      />
                      <Step
                        label="−10s"
                        title="10 Sekunden früher"
                        action={() => edit({ t: (flight.current.node?.t ?? 0) - 10 })}
                      />
                      <Step
                        label="+10s"
                        title="10 Sekunden später"
                        action={() => edit({ t: (flight.current.node?.t ?? 0) + 10 })}
                      />
                      <Step
                        label="+1m"
                        title="1 Minute später"
                        action={() => edit({ t: (flight.current.node?.t ?? 0) + 60 })}
                      />
                      {Number.isFinite(P) && (
                        <Step
                          label="+⟲"
                          title="Einen Umlauf später"
                          action={() => edit({ t: (flight.current.node?.t ?? 0) + P })}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
              <div class="cp-buttons">
                <button
                  type="button"
                  class={`cp-action go ${executing ? 'on' : ''}`}
                  onClick={() => onExecute(!executing)}
                >
                  {executing ? (
                    <>
                      <Icon name="stop" /> Autopilot stoppen
                    </>
                  ) : (
                    <>
                      <Icon name="play" /> Automatisch ausführen
                    </>
                  )}
                </button>
                {!node.frozen && start - f.t > 20 && (
                  <button
                    type="button"
                    class="cp-action"
                    onClick={() => {
                      flight.current.warpTo(flight.current.nodeBurnStart() - 15);
                      onChanged();
                    }}
                  >
                    <Icon name="forward" /> Bis kurz davor
                  </button>
                )}
                <button
                  type="button"
                  class="cp-action"
                  onClick={() => {
                    flight.current.clearNode();
                    onExecute(false);
                    setResult(null);
                    onChanged();
                  }}
                >
                  Löschen
                </button>
              </div>
              {result && <p class="cp-result ok small">{result.text}</p>}
            </div>
          )}

          {solidRef && (
            <button
              type="button"
              class={`cp-action land ${landing ? 'on' : ''}`}
              onClick={() => onLand(!landing)}
              title="Lande-Autopilot: bremst, fällt und bremst im letzten Moment (Taste L)"
            >
              {landing ? (
                <>
                  <Icon name="stop" /> Lande-Autopilot aus
                </>
              ) : (
                <>
                  <Icon name="down" /> Automatisch landen auf {forms(landOn).dat}
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Missions-Autopilot: Ziel wählen, starten, Fortschritt verfolgen. */
function MissionTab({
  flight,
  targets,
  mission,
  onMission,
}: {
  flight: { current: Flight };
  targets: readonly { id: TargetId; label: string }[];
  mission: MissionPilot | null;
  onMission: (spec: MissionSpec | null) => void;
}) {
  const f = flight.current;
  const here = f.status === 'landed' && f.landedOn ? f.landedOn : f.refBody();
  const [target, setTarget] = useState<MissionTarget>(() =>
    f.target && f.target !== here.id ? f.target : 'moon',
  );
  const [land, setLand] = useState(true);
  const [home, setHome] = useState(false);

  if (mission) {
    const steps = mission.overview;
    return (
      <div class="cp-mission">
        <p class="cp-mission-title">
          <strong>{missionTitle(mission.spec)}</strong>
          <span>
            Schritt {Math.min(mission.index + 1, steps.length)} von {steps.length}
          </span>
        </p>
        <ol class="cp-steplist">
          {steps.map((st, i) => (
            <li key={i} class={st.state}>
              <span aria-hidden="true">
                {st.state === 'done' ? '✓' : st.state === 'active' ? '▶' : '○'}
              </span>
              {st.label}
            </li>
          ))}
        </ol>
        {mission.detail && <p class="cp-result ok small">{mission.detail}</p>}
        <button type="button" class="cp-action on" onClick={() => onMission(null)}>
          <Icon name="stop" /> Mission abbrechen
        </button>
      </div>
    );
  }

  const choices: { id: MissionTarget; label: string }[] = [
    { id: 'orbit', label: `Umlaufbahn um ${forms(here).acc}` },
    ...targets.filter((t) => {
      if (t.id === 'station') return here === EARTH;
      const b = bodyById(t.id);
      // Hier kann man nur landen (oder heimfliegen, wenn „hier“ ein Mond der Erde ist).
      if (b === here) return landable(b) && f.status !== 'landed';
      return true;
    }),
  ];
  const valid = choices.some((c) => c.id === target) ? target : 'orbit';
  const body = valid !== 'orbit' && valid !== 'station' ? bodyById(valid) : null;
  const canLand = !!body && landable(body) && body !== EARTH;
  const canHome = canReturnHome(valid);
  const spec: MissionSpec = {
    target: valid,
    land: body === EARTH || (canLand && land) || (!!body && body === here),
    home: canHome && home,
  };
  const steps = missionSteps(spec, f);
  const inOrbit = f.status === 'flying' && f.orbit(EARTH).bound && f.refBody() === EARTH;
  const need = missionBudget(spec, inOrbit || f.status === 'docked');
  const dv = f.deltaV();
  const short = !f.infiniteFuel && dv < need * 0.9;

  return (
    <div class="cp-mission">
      <p class="small muted">
        Der Missions-Autopilot fliegt alles allein: Start, Startfenster abwarten, Transfer,
        Kurskorrekturen, Einschwenken, Landung – Wartezeiten spult er im Zeitraffer vor. Jede
        Steuertaste gibt dir die Kontrolle zurück.
      </p>
      <label class="cp-field">
        <span class="small">Ziel der Mission</span>
        <select
          value={valid}
          onChange={(e) => setTarget((e.target as HTMLSelectElement).value as MissionTarget)}
        >
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {(canLand || canHome) && (
        <div class="cp-checks">
          {canLand && body !== here && (
            <label>
              <input
                type="checkbox"
                checked={land}
                onChange={(e) => setLand((e.target as HTMLInputElement).checked)}
              />{' '}
              Landen
            </label>
          )}
          {canHome && (
            <label>
              <input
                type="checkbox"
                checked={home}
                onChange={(e) => setHome((e.target as HTMLInputElement).checked)}
              />{' '}
              Danach zurück zur Erde
            </label>
          )}
        </div>
      )}
      {steps.length > 0 ? (
        <ol class="cp-steplist preview">
          {steps.map((st, i) => (
            <li key={i}>{stepLabel(st)}</li>
          ))}
        </ol>
      ) : (
        <p class="small muted">Da bist du schon.</p>
      )}
      <div class={`cp-row ${short ? 'warn' : ''}`}>
        <span>Δv an Bord / Bedarf etwa</span>
        <strong>
          {f.infiniteFuel ? '∞' : fmt(dv)} / {fmt(need)} m/s
        </strong>
      </div>
      {short && (
        <p class="cp-result bad small">
          Der Treibstoff reicht wahrscheinlich nicht – mehr Tanks, eine weitere Stufe oder ein
          näheres Ziel wählen. Starten kannst du trotzdem.
        </p>
      )}
      <button
        type="button"
        class="cp-action go"
        disabled={
          steps.length === 0 ||
          (f.status !== 'flying' && f.status !== 'landed' && f.status !== 'docked')
        }
        onClick={() => onMission(spec)}
      >
        <Icon name="play" /> Mission starten: {missionTitle(spec)}
      </button>
    </div>
  );
}
