import type { StabilityCheck } from '../physics';
import { Icon } from './Icon';

const ICON = { ok: 'check', warn: 'warn', fail: 'fail', na: 'info' } as const;
const LABEL = { ok: 'erfüllt', warn: 'unsicher', fail: 'verletzt', na: 'entfällt' } as const;

export function CheckList({ checks }: { checks: StabilityCheck[] }) {
  return (
    <ul class="check-list">
      {checks.map((c) => (
        <li key={c.id}>
          <span class={`check-icon ${c.status}`} title={LABEL[c.status]}>
            <Icon name={ICON[c.status]} />
          </span>
          <span>
            {c.title} <span class="visually-hidden">({LABEL[c.status]})</span>
          </span>
          <span class="check-detail">{c.detail}</span>
        </li>
      ))}
    </ul>
  );
}
