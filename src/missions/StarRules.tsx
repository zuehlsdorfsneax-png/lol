import { Icon } from '../ui/Icon';

export function StarRules({ rules, stars }: { rules: [string, string, string]; stars: number }) {
  return (
    <ul class="rule-list">
      {rules.map((r, i) => (
        <li key={r}>
          <span class={i < stars ? 'star on' : 'star'} style={{ width: '16px', height: '16px' }}>
            <Icon name="star" filled />
          </span>
          {r}
        </li>
      ))}
    </ul>
  );
}
