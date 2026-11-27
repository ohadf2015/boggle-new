'use client';

/**
 * Chrome for the Academy Map: flat sky-skin cards that float over the painted
 * daytime world. Thick black outline, solid fill, solid black bottom lip.
 */

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'night' | 'gold' | 'teal' | 'pink' | 'lime' | 'ember' | 'plum';

/** 'night' is the white card; the rest are the accent fills, always under black ink. */
export const TONE_FILL: Record<Tone, string> = {
  night: 'var(--edu-surface)',
  gold: 'var(--neo-yellow)',
  teal: 'var(--neo-cyan)',
  pink: 'var(--neo-pink)',
  lime: 'var(--neo-lime)',
  ember: 'var(--neo-orange)',
  plum: 'var(--neo-purple)',
};

export function toneStyle(tone: Tone, opts: { shadow?: number; trim?: number } = {}): CSSProperties {
  const shadow = opts.shadow ?? 4;
  return {
    backgroundColor: TONE_FILL[tone],
    color: tone === 'night' ? 'var(--edu-ink)' : '#101114',
    boxShadow: shadow > 0 ? `0 ${shadow}px 0 #101114` : 'none',
  };
}

/** A chunky ink-outlined panel with a painted gradient. */
export function InkPanel({
  tone = 'night',
  className,
  style,
  children,
  as: Tag = 'div',
  shadow,
  ...rest
}: {
  tone?: Tone;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  as?: 'div' | 'header' | 'nav' | 'section';
  shadow?: number;
} & Record<string, unknown>) {
  return (
    <Tag
      {...rest}
      className={cn('relative rounded-[18px] border-3 border-neo-black', className)}
      style={{ ...toneStyle(tone, { shadow }), ...style }}
    >
      {children}
    </Tag>
  );
}

/** A round ink medallion (icon badges, avatar frame, count bubbles). */
export function Medallion({
  tone,
  size,
  className,
  children,
  shadow = 2,
}: {
  tone: Tone;
  size: number;
  className?: string;
  children?: ReactNode;
  shadow?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full border-3 border-neo-black', className)}
      style={{ width: size, height: size, maxWidth: 'none', ...toneStyle(tone, { shadow, trim: 2 }) }}
    >
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

/**
 * A banner ribbon with notched tails — the class name hangs over the sky like
 * a pennant. Tails are symmetric, so the ribbon reads the same in RTL.
 */
export function Ribbon({ children, tone = 'pink', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const tail = (flip: boolean) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 40"
      className={cn('relative z-0 h-full w-[18px] shrink-0 self-stretch', flip ? '-ms-[3px] -scale-x-100' : '-me-[3px]')}
      preserveAspectRatio="none"
    >
      <polygon points="0,6 22,0 22,34 0,40 9,23" fill={TONE_FILL[tone]} stroke="#101114" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
  return (
    <div className={cn('flex h-9 items-stretch drop-shadow-[0_3px_0_#101114] sm:h-10', className)}>
      {tail(false)}
      <div
        className="relative z-10 flex min-w-0 items-center rounded-[6px] border-3 border-neo-black px-3"
        style={toneStyle(tone, { shadow: 0, trim: 2 })}
      >
        {children}
      </div>
      {tail(true)}
    </div>
  );
}

