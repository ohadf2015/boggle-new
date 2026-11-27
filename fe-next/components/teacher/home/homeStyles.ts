// One button and card vocabulary for Teacher Home, class setup and their states.
import { NEO_QUIET_PRESS as PRESS, neoChunkyPress } from '@/components/ui/neoStyles';
import { EDU_BUTTON, EDU_FOCUS, EDU_QUIET_FOCUS as FOCUS } from '@/components/education/eduNeoStyles';
import { cn } from '@/lib/utils';

export const SECONDARY_BUTTON = EDU_BUTTON.outlineLarge;

export const QUIET_LINK = [
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-neo px-2 font-neo-body text-sm font-bold text-edu-ink/80',
  'underline decoration-1 underline-offset-4 hover:text-edu-ink',
  PRESS,
  FOCUS,
].join(' ');

export const PANEL = 'rounded-neo-xl border-[3px] border-edu-line bg-edu-surface shadow-edu-lip';
export const PANEL_RAISED = PANEL;
/** Turns a row's leading lucide icon into a small coloured square; add the fill (bg-neo-yellow, bg-neo-cyan …). */
export const ICON_SQUARE = 'box-content size-6 shrink-0 rounded-neo border-[3px] border-neo-black p-1.5 text-neo-black';

export const OUTLINE_BUTTON = EDU_BUTTON.outline;
export const GHOST_BUTTON = EDU_BUTTON.ghost;

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

/** The class-code button: an outlined pill with a thin lip. Needs usePress for data-pressed. */
export const HERO_CHIP = cn(
  'inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-neo-pill border-2 border-edu-line bg-edu-surface px-3 font-neo-display text-[0.8125rem] font-bold sm:px-3.5 sm:text-sm text-edu-ink [&_svg]:size-4',
  neoChunkyPress(2),
  'shadow-edu-line',
  EDU_FOCUS,
);

// A second action on the desk: a white pressable tile whose leading icon becomes a coloured square.
const HERO_TILE = cn(
  'inline-flex min-h-14 min-w-0 items-center gap-3 rounded-neo-lg border-[3px] border-edu-line bg-edu-surface px-3 py-2 text-start font-neo-display text-base font-black leading-tight text-edu-ink sm:text-lg',
  '[&>svg]:box-content [&>svg]:size-6 [&>svg]:shrink-0 [&>svg]:rounded-neo [&>svg]:border-[3px] [&>svg]:border-neo-black [&>svg]:p-1.5 [&>svg]:text-neo-black',
  neoChunkyPress(4),
  'shadow-edu-line',
  EDU_FOCUS,
);
export const HERO_SECONDARY = cn(HERO_TILE, '[&>svg]:bg-neo-cyan');
export const HERO_PICK = cn(HERO_TILE, '[&>svg]:bg-neo-yellow');
export const HERO_SECONDARY_WRAP = 'contents';

/** A calm one-line row under the hero: icon, words, chevron. */
/** Use inside <PressSurface lip={4}>, which adds the lip and the press. */
export const HOME_ROW = cn(
  'rounded-neo-lg border-[3px] border-neo-black bg-edu-surface',
  'group flex min-h-[60px] w-full min-w-0 items-center gap-3 px-4 py-2 text-start text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
);
