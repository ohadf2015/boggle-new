export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Press feedback shared by every control on the live screens: 150ms ease-out, scale .97, visible focus. */
export const PRESS =
  'transition-[transform,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:cursor-not-allowed disabled:opacity-60';

export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-neo border-4 border-neo-black bg-neo-lime font-neo-display font-black uppercase tracking-tight text-neo-black shadow-hard-lg hover:-translate-y-0.5 hover:shadow-hard-xl';

export const SECONDARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream shadow-hard-sm hover:bg-neo-navy-light';

/** Keyframes as a literal string: transform only, never from scale(0), never an opacity tween (Class 5). */
export const LIVE_KEYFRAMES =
  '@keyframes edu-live-pop{0%{transform:scale(0.85) translateY(6px)}100%{transform:scale(1)}}' +
  '@keyframes edu-live-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}';
