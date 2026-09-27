import katex from 'katex';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { Icon } from './Icon';

/** Formel mit KaTeX (inline). */
export function Tex({ children, block = false }: { children: string; block?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(children, { displayMode: block, throwOnError: false, strict: false }),
    [children, block],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Abgesetzte, nummerierte Formel. */
export function Equation({ tex, n }: { tex: string; n?: string }) {
  return (
    <div class="equation">
      <div class="equation-body">
        <Tex block>{tex}</Tex>
      </div>
      {n && <span class="equation-num">({n})</span>}
    </div>
  );
}

export function Figure({
  n,
  caption,
  children,
}: {
  n: string;
  caption: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <figure class="figure">
      <div class="figure-body">{children}</div>
      <figcaption class="figure-caption">
        <b>Abb. {n}</b>
        {caption}
      </figcaption>
    </figure>
  );
}

const CALLOUT_TITLES = {
  merke: 'Merke',
  fakt: 'Wusstest du?',
  beweis: 'Beweisidee',
  seminar: 'Für die Seminararbeit',
} as const;

export function Callout({
  kind,
  title,
  children,
}: {
  kind: keyof typeof CALLOUT_TITLES;
  title?: string;
  children: ComponentChildren;
}) {
  return (
    <aside class={`callout ${kind}`}>
      <div class="callout-title">{title ?? CALLOUT_TITLES[kind]}</div>
      <div class="callout-body">{children}</div>
    </aside>
  );
}

export function PageHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ComponentChildren;
}) {
  return (
    <header class="page-head">
      <div class="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <p class="lead">{children}</p>}
    </header>
  );
}

export function SectionTitle({ n, children }: { n: string; children: ComponentChildren }) {
  return (
    <h2 class="section-title">
      <span class="section-num">{n}</span>
      <span>{children}</span>
    </h2>
  );
}

export type Status = 'ok' | 'warn' | 'fail' | 'na';

const STATUS_ICON = { ok: 'check', warn: 'warn', fail: 'fail', na: 'info' } as const;

export function StatusChip({ status, children }: { status: Status; children: ComponentChildren }) {
  return (
    <span class={`chip ${status === 'na' ? '' : status}`}>
      <Icon name={STATUS_ICON[status]} />
      {children}
    </span>
  );
}

export { LinkButton } from './LinkButton';
