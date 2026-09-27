const PATHS: Record<string, string> = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  reset: 'M12 5a7 7 0 1 1-6.6 4.7M5 4v5h5',
  step: 'M6 5v14l9-7zM17 5h2v14h-2z',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14',
  camera: 'M4 8h3.5L9 6h6l1.5 2H20v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  warn: 'M12 4 2.5 20h19zM12 10v4.5M12 17.2v.3',
  fail: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4',
  info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 11v5.5M12 7.6v.3',
  arrow: 'M5 12h14m0 0-5-5m5 5-5 5',
  star: 'M12 3.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3.1L6.6 20l1.2-6-4.5-4.2 6.1-.7z',
  target: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? 'currentColor' : 'none'}>
      <path
        d={PATHS[name]}
        stroke="currentColor"
        stroke-width={filled ? 0 : 1.8}
        stroke-linecap="round"
        stroke-linejoin="round"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}
