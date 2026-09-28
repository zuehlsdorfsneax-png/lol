import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../ui/Icon';
import type { Flight, Prediction, TargetId } from './flight';
import { clock, clockIn, duration, fmt } from './format';
import { period } from './kepler';
import { makePlan, planOptions, type Plan, type PlanId } from './planner';
import { forms } from './world';

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
  onExecute: (on: boolean) => void;
  onLand: (on: boolean) => void;
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
  onExecute,
  onLand,
  onChanged,
  onClose,
}: Props) {
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [result, setResult] = useState<Plan | null>(null);
  const f = flight.current;
  const node = f.node;

  const plan = (id: PlanId): void => {
    setBusy(id);
    // Kurz warten, damit „rechnet …“ sichtbar wird – die Suche dauert einen Augenblick.
    window.setTimeout(() => {
      const r = makePlan(flight.current, id);
      setResult(r);
      setBusy(null);
      onChanged();
    }, 30);
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

  return (
    <div class="computer-panel" role="dialog" aria-label="Bordcomputer">
      <div class="cp-head">
        <strong>Bordcomputer</strong>
        <button type="button" class="cp-close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
      </div>
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
                  class="cp-plan"
                  title={o.hint}
                  disabled={busy !== null}
                  onClick={() => plan(o.id)}
                >
                  <strong>{busy === o.id ? 'Rechnet …' : o.label}</strong>
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
            <strong>{Number.isFinite(burn) ? duration(burn) : 'Treibstoff reicht nicht!'}</strong>
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
                    action={() => edit({ prograde: (flight.current.node?.prograde ?? 0) - 0.1 })}
                  />
                  <output>{fmt(node.prograde, 1)}</output>
                  <Step
                    label="+0,1"
                    title="0,1 m/s mehr"
                    action={() => edit({ prograde: (flight.current.node?.prograde ?? 0) + 0.1 })}
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
              <Icon name="down" /> Automatisch landen auf {forms(f.refBody()).dat}
            </>
          )}
        </button>
      )}
    </div>
  );
}
