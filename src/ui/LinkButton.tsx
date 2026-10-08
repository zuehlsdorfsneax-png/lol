import type { ComponentChildren } from 'preact';

/** Link im Knopf-Stil zu einer Seite der App (Hash-Route). */
export function LinkButton({
  to,
  children,
  primary = false,
}: {
  to: string;
  children: ComponentChildren;
  primary?: boolean;
}) {
  return (
    <a class={`btn ${primary ? 'primary' : ''}`} href={`#${to}`}>
      {children}
    </a>
  );
}
