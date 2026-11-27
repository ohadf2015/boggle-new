import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LandingTone = 'lime' | 'pink' | 'cyan' | 'purple' | 'yellow' | 'orange' | 'paper';

const TONE_BG: Record<LandingTone, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
  yellow: 'bg-neo-yellow',
  orange: 'bg-neo-orange',
  paper: 'bg-neo-cream',
};
const CYCLE: LandingTone[] = ['lime', 'cyan', 'pink', 'yellow', 'purple', 'orange'];
const toneAt = (i: number) => CYCLE[i % CYCLE.length];

const PAPER = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';
const LIFT = 'motion-safe:transition-transform motion-safe:hover:-translate-y-1';
const FOCUS = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-white';
const H2 = 'font-neo-display text-2xl font-bold leading-tight text-balance sm:text-3xl';

export type ButtonVariant = 'primary' | 'secondary' | 'dark';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-neo-lime text-neo-black',
  secondary: 'bg-neo-cream text-neo-black',
  dark: 'bg-neo-navy text-neo-white',
};

/** For tracked/client CTAs that render their own element but must look like the rest. */
export function landingButtonClass(variant: ButtonVariant = 'primary') {
  return cn(
    'inline-flex min-h-14 items-center justify-center gap-2 rounded-neo-lg border-3 border-neo-black px-7 py-3',
    'text-center font-neo-display text-lg font-bold leading-tight shadow-hard-xl',
    'active:translate-y-[3px] active:shadow-hard-pressed motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
    FOCUS,
    BUTTON_VARIANT[variant],
  );
}

export function LandingButton({
  variant = 'primary',
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cn(landingButtonClass(variant), className)} {...props} />;
}

export function Mark({ tone = 'lime', children }: { tone?: LandingTone; children: React.ReactNode }) {
  return (
    <span className={cn('box-decoration-clone rounded-neo px-2 text-neo-black', TONE_BG[tone])}>{children}</span>
  );
}

const CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

export function LandingPage({
  locale,
  play,
  topBar = true,
  className,
  children,
}: {
  locale: string;
  play?: { href: string; label: string };
  /** false when the route already renders the app header */
  topBar?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-neo-navy font-neo-body font-normal text-neo-white">
      {topBar && (
        <nav className={cn(CONTAINER, 'flex items-center justify-between gap-3 py-3')}>
          <Link href={`/${locale}`} dir="ltr" aria-label="LexiClash" className={cn('font-neo-display text-2xl font-bold', FOCUS)}>
            Lexi<span className="text-neo-lime">Clash</span>
          </Link>
          {play && (
            <Link href={play.href} className={cn(landingButtonClass('primary'), 'min-h-11 px-4 py-1.5 text-base')}>
              {play.label}
            </Link>
          )}
        </nav>
      )}
      <div className={cn(CONTAINER, 'flex flex-col gap-14 pb-20 pt-2 sm:gap-20', className)}>{children}</div>
    </main>
  );
}

export interface LandingArt {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function LandingHero({
  eyebrow,
  title,
  lead,
  actions,
  art,
  artTone = 'purple',
  more,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** One or two sentences; the rest of the intro copy goes in `more`. */
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  art?: LandingArt;
  artTone?: LandingTone;
  more?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        'grid items-center gap-6 lg:gap-x-12 lg:pt-6',
        art ? 'lg:grid-cols-[1.2fr_1fr]' : 'max-w-4xl',
      )}
    >
      <div className="order-2 flex flex-col items-start gap-4 lg:order-1">
        {eyebrow && (
          <p className="rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-neo-black shadow-hard-sm">
            {eyebrow}
          </p>
        )}
        <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl lg:text-[3.25rem]">
          {title}
        </h1>
        {lead && <p className="max-w-xl text-lg leading-relaxed text-neo-white/85">{lead}</p>}
        {actions && <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">{actions}</div>}
        {children}
      </div>
      {art && (
        <div className="order-1 flex justify-center lg:order-2">
          <div
            className={cn(
              'flex w-full max-w-[18rem] -rotate-1 justify-center rounded-neo-lg border-3 border-neo-black p-3 shadow-hard-xl sm:max-w-sm sm:p-5 lg:max-w-md lg:p-8',
              TONE_BG[artTone],
            )}
          >
            <Image
              src={art.src}
              alt={art.alt}
              width={art.width}
              height={art.height}
              priority
              sizes="(min-width: 1024px) 384px, 256px"
              className="h-auto max-h-36 w-auto max-w-full object-contain sm:max-h-56 lg:max-h-80"
            />
          </div>
        </div>
      )}
      {more && (
        <div className="order-3 border-t-3 border-neo-white/15 pt-6 lg:col-span-full">
          <Prose className="max-w-none lg:columns-2 lg:gap-12 lg:[&>*]:break-inside-avoid">{more}</Prose>
        </div>
      )}
    </header>
  );
}

/** Long-form copy: regular weight, readable measure. `paper` for whole articles. */
export function Prose({
  paper = false,
  className,
  children,
}: {
  paper?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'max-w-3xl space-y-4 text-base font-normal leading-relaxed',
        '[&_a]:font-bold [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-neo-display [&_h2]:text-2xl [&_h2]:font-bold',
        '[&_h3]:font-neo-display [&_h3]:text-xl [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:ps-5',
        paper
          ? cn(PAPER, 'p-5 sm:p-8 [&_a]:decoration-neo-pink [&_a]:decoration-2')
          : 'text-neo-white/85 [&_a]:text-neo-cyan [&_h2]:text-neo-white [&_h3]:text-neo-white [&_strong]:text-neo-white',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  title,
  intro,
  id,
  className,
  children,
}: {
  title?: React.ReactNode;
  intro?: React.ReactNode;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('flex scroll-mt-20 flex-col gap-5', className)}>
      {(title || intro) && (
        <div className="flex flex-col gap-2">
          {title && <h2 className={H2}>{title}</h2>}
          {intro && <div className="max-w-3xl leading-relaxed text-neo-white/80">{intro}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' } as const;

export interface TileItem {
  title: React.ReactNode;
  body?: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  tone?: LandingTone;
}

/** `color` for short link tiles, `paper` for tiles that carry real reading. */
export function TileGrid({
  items,
  columns = 3,
  variant = 'color',
}: {
  items: TileItem[];
  columns?: keyof typeof COLS;
  variant?: 'color' | 'paper';
}) {
  return (
    <div className={cn('grid gap-4', COLS[columns])}>
      {items.map((item, i) => {
        const tone = item.tone ?? toneAt(i);
        const cls = cn(
          'flex flex-col overflow-hidden rounded-neo-lg border-3 border-neo-black text-neo-black shadow-hard-xl',
          variant === 'paper' ? 'bg-neo-cream' : TONE_BG[tone],
        );
        const inner = (
          <>
            {variant === 'paper' && <span aria-hidden className={cn('h-3 border-b-3 border-neo-black', TONE_BG[tone])} />}
            <span className="flex flex-col gap-1.5 p-5">
              {item.icon}
              <h3 className="font-neo-display text-xl font-bold leading-tight">{item.title}</h3>
              {item.body && <span className="text-[15px] leading-relaxed">{item.body}</span>}
            </span>
          </>
        );
        return item.href ? (
          <Link key={i} href={item.href} className={cn(cls, LIFT, FOCUS)}>
            {inner}
          </Link>
        ) : (
          <div key={i} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function Steps({ items }: { items: { title: React.ReactNode; body?: React.ReactNode }[] }) {
  return (
    <ol className={cn('grid gap-4', items.length === 3 ? 'md:grid-cols-3' : COLS[items.length >= 4 ? 4 : 2])}>
      {items.map((item, i) => (
        <li key={i} className={cn(PAPER, 'flex flex-col gap-2 p-5')}>
          <span
            aria-hidden
            className={cn(
              'flex h-11 w-11 -rotate-3 items-center justify-center rounded-neo border-3 border-neo-black font-neo-display text-xl font-bold',
              TONE_BG[toneAt(i)],
            )}
          >
            {i + 1}
          </span>
          <h3 className="font-neo-display text-xl font-bold leading-tight">{item.title}</h3>
          {item.body && <div className="text-[15px] leading-relaxed">{item.body}</div>}
        </li>
      ))}
    </ol>
  );
}

export function CheckList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className={cn(PAPER, 'grid gap-x-8 gap-y-3 p-5 sm:grid-cols-2 sm:p-7')}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 leading-snug">
          <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-neo-black bg-neo-lime">
            <Check className="h-4 w-4" strokeWidth={3.5} />
          </span>
          <span className="font-medium">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatStrip({ items }: { items: { value: React.ReactNode; label: React.ReactNode }[] }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-3', items.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
      {items.map((item, i) => (
        <div key={i} className={cn('flex flex-col-reverse justify-end rounded-neo-lg border-3 border-neo-black p-4 text-neo-black shadow-hard-lg', TONE_BG[toneAt(i)])}>
          <dt className="text-sm font-bold leading-tight">{item.label}</dt>
          <dd className="font-neo-display text-3xl font-bold leading-none sm:text-4xl">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CompareTable({
  columns,
  rows,
  highlight = 1,
  caption,
}: {
  columns: React.ReactNode[];
  /** first cell of each row is its row header */
  rows: React.ReactNode[][];
  /** column index to tint, -1 for none */
  highlight?: number;
  caption?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn(PAPER, 'relative overflow-x-auto')}>
        <table className="w-full border-collapse text-start text-sm sm:text-base">
          <thead className="bg-neo-black text-neo-white">
            <tr>
              {columns.map((col, i) => (
                <th key={i} scope="col" className={cn('px-3 py-3 text-start font-neo-display font-bold sm:px-5', i === highlight && 'text-neo-lime')}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t-2 border-neo-black/15">
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="px-3 py-3 text-start font-bold sm:px-5">
                      {cell}
                    </th>
                  ) : (
                    <td key={c} className={cn('px-3 py-3 align-top sm:px-5', c === highlight && 'bg-neo-lime/45 font-bold')}>
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="text-xs leading-relaxed text-neo-white/70">{caption}</p>}
    </div>
  );
}

export function FaqList({ items }: { items: { q: React.ReactNode; a: React.ReactNode }[] }) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      {items.map((item, i) => (
        <details key={i} className="group rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-lg">
          <summary className={cn('flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-neo-lg px-4 py-3 font-bold [&::-webkit-details-marker]:hidden', FOCUS)}>
            <span>{item.q}</span>
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-neo-black bg-neo-yellow group-open:rotate-45 motion-safe:transition-transform">
              <Plus className="h-5 w-5" strokeWidth={3} />
            </span>
          </summary>
          <div className="px-4 pb-4 leading-relaxed [&_a]:font-bold [&_a]:underline">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/** Secondary internal links, kept compact so they don't compete with the page's CTA. */
export function LinkPills({ items }: { items: { href: string; label: React.ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap gap-3">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={cn('inline-flex min-h-11 items-center rounded-full border-3 border-neo-black bg-neo-cream px-4 py-1.5 text-sm font-bold text-neo-black shadow-hard-lg', LIFT, FOCUS)}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CtaBand({
  title,
  body,
  actions,
  art,
  tone = 'purple',
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
  art?: LandingArt;
  tone?: LandingTone;
}) {
  return (
    <section
      className={cn(
        'flex flex-col items-center gap-6 rounded-neo-lg border-3 border-neo-black p-6 text-center text-neo-black shadow-hard-xl sm:p-10 lg:flex-row lg:justify-between lg:text-start',
        TONE_BG[tone],
      )}
    >
      <div className="flex flex-col items-center gap-4 lg:items-start">
        <h2 className={H2}>{title}</h2>
        {body && <div className="max-w-2xl font-medium leading-relaxed">{body}</div>}
        {actions && <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">{actions}</div>}
      </div>
      {art && (
        <Image src={art.src} alt={art.alt} width={art.width} height={art.height} sizes="192px" className="h-auto max-h-40 w-auto lg:max-h-48" />
      )}
    </section>
  );
}
