import { pressClasses } from '@/components/education/motion/pressClasses';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** A filter-only press cue: a translate or scale here would override or stack on the lip's sink in cn(PRIMARY_BUTTON, PRESS). */
export const PRESS =
  'active:brightness-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:cursor-not-allowed disabled:opacity-60';

export const PRIMARY_BUTTON = `inline-flex items-center justify-center gap-2 rounded-neo border-4 border-neo-black bg-neo-lime font-neo-display font-black uppercase tracking-tight text-neo-black ${pressClasses(4)}`;

export const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream hover:bg-neo-navy-light ${pressClasses(2)}`;

/** Keyframes as a literal string: transform only, never from scale(0), never an opacity tween (Class 5). */
export const LIVE_KEYFRAMES =
  '@keyframes edu-live-pop{0%{transform:scale(0.85) translateY(6px)}100%{transform:scale(1)}}' +
  '@keyframes edu-live-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}';
