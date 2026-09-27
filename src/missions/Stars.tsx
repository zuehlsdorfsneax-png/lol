import { Icon } from '../ui/Icon';

export function Stars({
  count,
  size = 18,
  label = true,
}: {
  count: number;
  size?: number;
  label?: boolean;
}) {
  return (
    <span
      class="stars"
      aria-label={label ? `${count} von 3 Sternen` : undefined}
      role={label ? 'img' : undefined}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          class={i < count ? 'star on' : 'star'}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <Icon name="star" filled />
        </span>
      ))}
    </span>
  );
}
