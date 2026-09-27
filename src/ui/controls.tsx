import type { ComponentChildren } from 'preact';

interface SliderProps {
  id: string;
  label: ComponentChildren;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Logarithmische Skala – für Größen über mehrere Zehnerpotenzen. */
  log?: boolean;
  format?: (v: number) => string;
  hint?: ComponentChildren;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export function Slider({ id, label, value, min, max, step, log, format, hint, disabled, onChange }: SliderProps) {
  const toPos = (v: number): number =>
    log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min);
  const fromPos = (p: number): number =>
    log ? Math.exp(Math.log(min) + p * (Math.log(max) - Math.log(min))) : min + p * (max - min);
  const pos = Math.min(1, Math.max(0, toPos(value)));
  const resolution = 1000;
  return (
    <div class="field">
      <div class="field-head">
        <label class="field-label" for={id}>
          {label}
        </label>
        <output class="field-value" for={id}>
          {format ? format(value) : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={resolution}
        step={1}
        value={Math.round(pos * resolution)}
        disabled={disabled}
        style={{ '--fill': `${pos * 100}%` }}
        onInput={(e) => {
          let v = fromPos(Number((e.target as HTMLInputElement).value) / resolution);
          if (step) v = Math.round(v / step) * step;
          onChange(Math.min(max, Math.max(min, v)));
        }}
      />
      {hint && <div class="field-hint">{hint}</div>}
    </div>
  );
}

interface ToggleProps {
  id: string;
  label: ComponentChildren;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ id, label, checked, disabled, onChange }: ToggleProps) {
  return (
    <label class="switch" for={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span>{label}</span>
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div class="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SelectProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Select<T extends string>({ id, label, value, options, onChange }: SelectProps<T>) {
  return (
    <div class="field">
      <label class="field-label" for={id}>
        {label}
      </label>
      <select
        id={id}
        class="select"
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
