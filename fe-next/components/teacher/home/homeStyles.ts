// One button and card vocabulary for Teacher Home, class setup and their states.
import { NEO_BLOCK_TONES, NEO_BUTTON, NEO_FOCUS, NEO_QUIET_FOCUS as FOCUS, NEO_QUIET_PRESS as PRESS, neoChunkyPress } from '@/components/ui/neoStyles';
import { cn } from '@/lib/utils';

export const SECONDARY_BUTTON = NEO_BUTTON.outlineLarge;

export const QUIET_LINK = [
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-neo px-2 font-neo-body text-sm font-bold text-edu-ink/80',
  'underline decoration-1 underline-offset-4 hover:text-edu-ink',
  PRESS,
  FOCUS,
].join(' ');

export const PANEL = 'rounded-neo-lg border-2 border-edu-line bg-edu-surface shadow-hard';
// The one card that leads the page sits a step lighter than the base panels beside it.
export const PANEL_RAISED = 'rounded-neo-lg border-2 border-edu-line bg-edu-surface shadow-hard-lg';

export const OUTLINE_BUTTON = NEO_BUTTON.outline;
export const GHOST_BUTTON = NEO_BUTTON.ghost;

export const CHIP = 'inline-flex items-center whitespace-nowrap rounded-neo border border-edu-line px-1.5 py-px font-neo-body text-xs font-bold text-edu-ink/80';

export const SKELETON = 'animate-pulse rounded-neo bg-edu-ink/10 motion-reduce:animate-none';

// A game piece: chunky black edge, hard offset shadow and a thin top bevel instead of a gradient.
export const GAME_CARD =
  'rounded-neo-lg border-[3px] border-neo-black bg-edu-surface shadow-[inset_0_2px_0_color-mix(in_srgb,var(--neo-cream)_22%,transparent),4px_4px_0_rgb(var(--neo-black))]';
export const GAME_CARD_HOVER = [
  'transition-[translate,rotate,scale,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none',
  'hover:-translate-y-1 hover:shadow-[inset_0_2px_0_color-mix(in_srgb,var(--neo-cream)_22%,transparent),6px_7px_0_rgb(var(--neo-black))]',
  'active:translate-y-0.5 active:shadow-[inset_0_2px_0_color-mix(in_srgb,var(--neo-cream)_22%,transparent),1px_1px_0_rgb(var(--neo-black))]',
  'motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:active:translate-y-0',
].join(' ');
// Tilted label chip that sits on a card's top edge; pair it with an ARCADE_BLOCK fill.
export const STICKER =
  'inline-flex -rotate-2 items-center gap-1.5 whitespace-nowrap rounded-neo border-[3px] border-neo-black px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard';

/** A small secondary on the desk: an outlined pill with a thin cream lip, so Start stays the one big thing. Needs usePress for data-pressed. */
export const HERO_CHIP = cn(
  'inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-neo-pill border-2 border-edu-line bg-edu-surface px-3 font-neo-display text-[0.8125rem] font-bold sm:px-3.5 sm:text-sm text-edu-ink [&_svg]:size-4',
  neoChunkyPress(2),
  'shadow-edu-line',
  NEO_FOCUS,
);
export const HERO_SECONDARY = HERO_CHIP;
export const HERO_SECONDARY_WRAP = 'contents';

/** A calm one-line row under the hero: icon, words, chevron. */
/** Use inside <PressSurface lip={4}>, which adds the lip and the press. */
export const HOME_ROW = cn(
  'rounded-neo-lg border-[3px] border-neo-black bg-edu-surface',
  'group flex min-h-[60px] w-full min-w-0 items-center gap-3 px-4 py-2 text-start text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
);
