/**
 * The teacher area's chunky look, shared by every redesigned teacher screen:
 * black 3px outlines, hard offset shadows, flat bold color blocks.
 * Same vocabulary as the live game screens, so the dashboard and the game feel like one product.
 */

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';
const PRESS =
  'transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60';

/** Panel: navy card with a black outline and a hard shadow. Pass a color block for the lead card. */
export const NB_PANEL = 'rounded-neo-xl border-[3px] border-neo-black bg-[#2a2b4a] text-neo-cream shadow-hard-xl';

/** Flat color blocks for lead cards. Text color is set for contrast on each. */
export const NB_BLOCK = {
  lime: 'bg-neo-lime text-neo-black',
  pink: 'bg-neo-pink text-white',
  cyan: 'bg-neo-cyan text-neo-black',
  yellow: 'bg-neo-yellow text-neo-black',
  purple: 'bg-neo-purple text-white',
  orange: 'bg-neo-orange text-neo-black',
  cream: 'bg-neo-cream text-neo-black',
  navy: 'bg-neo-navy-light text-neo-cream',
} as const;
export type NbColor = keyof typeof NB_BLOCK;

const BUTTON_BASE = [
  'inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl',
  PRESS,
  FOCUS,
].join(' ');

/** The one main action on a screen. */
export const NB_PRIMARY = `${BUTTON_BASE} min-h-[56px] px-5 text-xl bg-neo-lime text-neo-black`;
/** A real second action: dark, still chunky. */
export const NB_SECONDARY = `${BUTTON_BASE} min-h-[48px] px-4 text-base bg-neo-navy-light text-neo-cream`;
/** Small chunky button for inside cards. Combine with an NB_BLOCK color. */
export const NB_SMALL = [
  'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-black px-3 font-neo-display text-sm font-black shadow-hard-lg',
  PRESS,
  FOCUS,
].join(' ');

/** Sticker: a small tilted-ready pill for facts and states (defaults, counts, streaks). */
export const NB_STICKER =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-neo-pill border-2 border-neo-black px-2.5 py-0.5 font-neo-body text-xs font-black shadow-hard';

/** Quiet underlined link for the rare way out. */
export const NB_LINK = [
  'inline-flex min-h-[44px] items-center gap-1 rounded-neo px-2 font-neo-body text-sm font-bold text-neo-cream/85 underline decoration-2 underline-offset-4 hover:text-neo-cream',
  FOCUS,
].join(' ');

/** Dashed row that opens rarer options (Advanced). */
export const NB_ADVANCED = [
  'flex min-h-[48px] w-full items-center justify-between gap-2 rounded-neo-lg border-[3px] border-dashed border-neo-cream/35 px-3 text-start font-neo-body text-sm font-bold text-neo-cream/85 hover:border-neo-cream/70 hover:text-neo-cream',
  FOCUS,
].join(' ');

/** Input on a cream field with the same outline and shadow. */
export const NB_INPUT =
  'min-h-[52px] w-full rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 font-neo-body text-base font-bold text-neo-black shadow-hard-lg placeholder:text-neo-black/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';
