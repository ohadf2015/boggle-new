// One button and card vocabulary for Teacher Home, class setup and their states.
import { NEO_BLOCK_TONES, NEO_BUTTON, NEO_QUIET_FOCUS as FOCUS, NEO_QUIET_PRESS as PRESS } from '@/components/ui/neoStyles';
import { cn } from '@/lib/utils';

export const SECONDARY_BUTTON = NEO_BUTTON.outlineLarge;

export const QUIET_LINK = [
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-neo px-2 font-neo-body text-sm font-bold text-neo-cream/80',
  'underline decoration-1 underline-offset-4 hover:text-neo-cream',
  PRESS,
  FOCUS,
].join(' ');

export const PANEL = 'rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light shadow-hard';
// The one card that leads the page sits a step lighter than the base panels beside it.
export const PANEL_RAISED = 'rounded-neo-lg border-2 border-neo-cream/60 bg-neo-navy-elevated shadow-hard-lg';

export const OUTLINE_BUTTON = NEO_BUTTON.outline;
export const GHOST_BUTTON = NEO_BUTTON.ghost;

export const CHIP = 'inline-flex items-center whitespace-nowrap rounded-neo border border-neo-cream/25 px-1.5 py-px font-neo-body text-xs font-bold text-neo-cream/80';

export const SKELETON = 'animate-pulse rounded-neo bg-neo-cream/10 motion-reduce:animate-none';

// A game piece: chunky black edge, hard offset shadow and a thin top bevel instead of a gradient.
export const GAME_CARD =
  'rounded-neo-lg border-[3px] border-neo-black bg-neo-navy-light shadow-[inset_0_2px_0_color-mix(in_srgb,var(--neo-cream)_22%,transparent),4px_4px_0_rgb(var(--neo-black))]';
export const GAME_CARD_HOVER = [
  'transition-[translate,rotate,scale,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none',
  'hover:-translate-y-1 hover:shadow-[inset_0_2px_0_color-mix(in_srgb,var(--neo-cream)_22%,transparent),6px_7px_0_rgb(var(--neo-black))]',
  'active:translate-y-0.5 active:shadow-[inset_0_2px_0_color-mix(in_srgb,var(--neo-cream)_22%,transparent),1px_1px_0_rgb(var(--neo-black))]',
  'motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0 motion-reduce:active:translate-y-0',
].join(' ');
// Tilted label chip that sits on a card's top edge; pair it with an ARCADE_BLOCK fill.
export const STICKER =
  'inline-flex -rotate-2 items-center gap-1.5 whitespace-nowrap rounded-neo border-[3px] border-neo-black px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-black shadow-hard';

/** The hero's one big secondary action, sized to sit under the primary. */
export const HERO_SECONDARY = cn(NEO_BUTTON.secondary, NEO_BLOCK_TONES.pink, 'min-h-[60px] w-full px-4 text-lg sm:min-h-[68px] sm:text-xl [&_svg]:size-6');
export const HERO_SECONDARY_WRAP = 'w-full items-stretch';

/** A calm one-line row under the hero: icon, words, chevron. */
export const HOME_ROW = cn(
  GAME_CARD,
  GAME_CARD_HOVER,
  'group flex min-h-[60px] w-full min-w-0 items-center gap-3 px-4 py-2 text-start text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
);
