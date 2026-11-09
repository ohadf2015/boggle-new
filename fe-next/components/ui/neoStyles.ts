/**
 * The one source for neo-brutalist button and block classes. Plain strings with no
 * imports, so server components, style modules and NeoButton/NeoPanel can all share it.
 */

export type PressLip = 2 | 4;

const LIP: Record<PressLip, string> = {
  4: 'shadow-[0_4px_0_0] active:translate-y-[4px]',
  2: 'shadow-[0_2px_0_0] active:translate-y-[2px]',
};

/** Live-game press: a solid lip that the button sinks into. */
export function neoPress(lip: PressLip = 4): string {
  return [
    LIP[lip],
    'shadow-neo-black active:shadow-none',
    'transition-[filter] duration-200 [@media(hover:hover)]:hover:brightness-110',
    'disabled:pointer-events-none disabled:shadow-none',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
  ].join(' ');
}

export const NEO_FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

/** Teacher press: lift on hover, drop into the offset shadow on press. */
const NEO_TRANSLATE_PRESS =
  'transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-x-px hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60';

/** Quiet outline press for secondary teacher controls: a small squash instead of a lift. */
export const NEO_QUIET_PRESS =
  'transition-[transform,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60';
export const NEO_QUIET_FOCUS =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

/** Black on navy is 1.2:1, so dark surfaces get a cream outline; color blocks keep the black one. */
export const NEO_DARK_EDGE = 'border-neo-cream/50';

/** Flat color blocks; text and outline are set for contrast on each. */
export const NEO_BLOCK_TONES = {
  lime: 'bg-neo-lime text-neo-black border-neo-black',
  pink: 'bg-neo-pink text-white border-neo-black',
  cyan: 'bg-neo-cyan text-neo-black border-neo-black',
  yellow: 'bg-neo-yellow text-neo-black border-neo-black',
  purple: 'bg-neo-purple text-white border-neo-black',
  orange: 'bg-neo-orange text-neo-black border-neo-black',
  cream: 'bg-neo-cream text-neo-black border-neo-black',
  navy: `bg-neo-navy-light text-neo-cream ${NEO_DARK_EDGE}`,
} as const;
export type NeoBlockTone = keyof typeof NEO_BLOCK_TONES;

const CHUNKY_BASE = [
  'inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black text-center font-neo-display font-black leading-tight shadow-hard-xl',
  NEO_TRANSLATE_PRESS,
  NEO_FOCUS,
].join(' ');

export const NEO_BUTTON = {
  /** The one main action on a teacher screen. */
  primary: `${CHUNKY_BASE} min-h-[56px] px-5 text-xl bg-neo-lime text-neo-black`,
  /** A real second action: dark, still chunky. */
  secondary: `${CHUNKY_BASE} min-h-[48px] px-4 text-base bg-neo-navy-light text-neo-cream ${NEO_DARK_EDGE}`,
  /** Small chunky button inside cards; pair with a block tone. */
  small: [
    'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-black px-3 font-neo-display text-sm font-black shadow-hard-lg',
    NEO_TRANSLATE_PRESS,
    NEO_FOCUS,
  ].join(' '),
  /** Live-game main action (lobby, results); size it with padding/min-h at the call site. */
  livePrimary: `inline-flex items-center justify-center gap-2 rounded-neo border-4 border-neo-black bg-neo-lime font-neo-display font-black uppercase tracking-tight text-neo-black ${neoPress(4)}`,
  liveSecondary: `inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream hover:bg-neo-navy-light ${neoPress(2)}`,
  /** Large cream-outline action beside a primary. */
  outlineLarge: [
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-neo px-5',
    'border-2 border-neo-cream/60 bg-transparent font-neo-display text-base font-bold text-neo-cream',
    'hover:border-neo-cream hover:bg-neo-cream/10',
    NEO_QUIET_PRESS,
    NEO_QUIET_FOCUS,
  ].join(' '),
  outline: [
    'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-neo-cream/40 px-3',
    'font-neo-display text-sm font-bold text-neo-cream hover:border-neo-cream hover:bg-neo-cream/10',
    NEO_QUIET_PRESS,
    NEO_QUIET_FOCUS,
  ].join(' '),
  ghost: [
    'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-neo border-2 border-transparent bg-transparent px-3',
    'font-neo-display text-sm font-bold text-neo-cream hover:border-neo-cream/25 hover:bg-neo-cream/10',
    NEO_QUIET_PRESS,
    NEO_QUIET_FOCUS,
  ].join(' '),
} as const;
export type NeoButtonVariant = keyof typeof NEO_BUTTON;
