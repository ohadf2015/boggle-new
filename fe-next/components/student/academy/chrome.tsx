'use client';

/**
 * Illustrated chrome for the Academy Map — panels, medallions and ribbons that
 * belong to the painted world instead of sitting on top of it as flat boxes.
 *
 * Language: the art's own thick black ink line (border-3 black) around a rich
 * gradient sampled from the map (twilight indigo, gold path, teal aurora,
 * sunset pink), a gold or cream INNER trim so the edge stays visible on the
 * dark sky (black ink alone on indigo is invisible — see the education
 * border-contrast guard), a glossy top highlight, and a hard ink drop shadow.
 */

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'night' | 'gold' | 'teal' | 'pink' | 'lime' | 'ember' | 'plum';

/** Gradients sampled from academy-map-*.webp. */
export const TONE_FILL: Record<Tone, string> = {
  night: 'linear-gradient(180deg,#5140b0 0%,#33287e 42%,#211a57 100%)',
  gold: 'linear-gradient(180deg,#fff27a 0%,#ffcf3a 45%,#f39a1c 100%)',
  teal: 'linear-gradient(180deg,#7ff7e6 0%,#1fc9c0 50%,#0f8a97 100%)',
  pink: 'linear-gradient(180deg,#ff8fc8 0%,#ff3d9a 50%,#c2186f 100%)',
  lime: 'linear-gradient(180deg,#eaff7a 0%,#bfff00 50%,#6fbf00 100%)',
  ember: 'linear-gradient(180deg,#ffb36b 0%,#ff6b35 50%,#d23a12 100%)',
  plum: 'linear-gradient(180deg,#b394ff 0%,#8b5cf6 50%,#5b30c4 100%)',
};

/** Inner trim per tone: gold on the dark tones, cream highlight on the bright ones. */
const TONE_TRIM: Record<Tone, string> = {
  night: '#f5c542',
  gold: '#fff8d0',
  teal: '#d8fffa',
  pink: '#ffd6ea',
  lime: '#f6ffd0',
  ember: '#ffe3c8',
  plum: '#e6dcff',
};

export function toneStyle(tone: Tone, opts: { shadow?: number; trim?: number } = {}): CSSProperties {
  const shadow = opts.shadow ?? 4;
  const trim = opts.trim ?? 2;
  return {
    backgroundImage: TONE_FILL[tone],
    boxShadow: [
      `inset 0 0 0 ${trim}px ${TONE_TRIM[tone]}`,
      `inset 0 ${trim + 3}px 0 ${trim}px rgba(255,255,255,0.22)`,
      `inset 0 -${trim + 3}px 0 ${trim}px rgba(0,0,0,0.18)`,
      shadow > 0 ? `${shadow}px ${shadow}px 0 #000` : '',
    ]
      .filter(Boolean)
      .join(','),
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
      style={{ width: size, height: size, ...toneStyle(tone, { shadow, trim: 2 }) }}
    >
      {/* Glossy crescent — the lacquered look of the node art. */}
      <span
        className="pointer-events-none absolute left-[18%] top-[10%] h-[30%] w-[52%] rounded-full bg-white/35"
        style={{ filter: 'blur(0.5px)' }}
      />
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
      <polygon points="0,6 22,0 22,34 0,40 9,23" fill={tone === 'pink' ? '#9e1259' : '#1d6f7a'} stroke="#000" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
  return (
    <div className={cn('flex h-9 items-stretch drop-shadow-[3px_3px_0_#000] sm:h-10', className)}>
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

/** Title text with a hard ink under-shadow, like the painted signage. */
export const INK_TEXT = '[text-shadow:0_2px_0_#000,1px_0_0_#000,-1px_0_0_#000,0_-1px_0_#000]';
