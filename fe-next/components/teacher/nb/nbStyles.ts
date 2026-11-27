/**
 * The teacher area's chunky look, shared by every redesigned teacher screen:
 * black 3px outlines, hard offset shadows, flat bold color blocks.
 * Same vocabulary as the live game screens, so the dashboard and the game feel like one product.
 */

import { cn } from '@/lib/utils';
import { EDU_BLOCK_TONES, EDU_BUTTON, EDU_DARK_EDGE, EDU_FOCUS as FOCUS } from '@/components/education/eduNeoStyles';

/** Outline for anything dark sitting on the dark page (cream, since black on navy has no edge). */
export const NB_DARK_EDGE = EDU_DARK_EDGE;

/** Panel: dark card with a cream outline and a hard shadow. Pass a color block for the lead card. */
export const NB_PANEL = `rounded-neo-xl border-[3px] ${NB_DARK_EDGE} bg-edu-surface text-edu-ink shadow-hard-xl`;

/**
 * Bold panel for a screen that should shout: full cream outline and a big colored offset,
 * since a black shadow barely shows on the navy page. Pick the color per panel.
 */
export const NB_PANEL_POP = {
  lime: 'rounded-neo-xl border-[3px] border-edu-line bg-edu-surface text-edu-ink shadow-hard-lime-xl',
  cyan: 'rounded-neo-xl border-[3px] border-edu-line bg-edu-surface text-edu-ink shadow-hard-cyan-xl',
  pink: 'rounded-neo-xl border-[3px] border-edu-line bg-edu-surface text-edu-ink shadow-hard-pink-xl',
  yellow: 'rounded-neo-xl border-[3px] border-edu-line bg-edu-surface text-edu-ink shadow-hard-yellow-xl',
} as const;

/** Tilted icon tile for a panel heading. Combine with an NB_BLOCK color. */
export const NB_ICON_TILE =
  'inline-flex size-10 shrink-0 -rotate-3 items-center justify-center rounded-neo border-[3px] border-neo-black shadow-hard';

/** Flat color blocks for lead cards. Put the block after the base style in cn() so its outline wins. */
export const NB_BLOCK = EDU_BLOCK_TONES;
export type NbColor = keyof typeof NB_BLOCK;

/** The one main action on a screen. */
export const NB_PRIMARY = EDU_BUTTON.primary;
/** NB_PRIMARY's face for a <PressSurface asChild>, which adds the chunky lip and press. */
export const NB_PRIMARY_FACE = `inline-flex items-center justify-center gap-2 rounded-neo-lg border-[3px] border-neo-black bg-neo-lime px-5 text-center font-neo-display text-xl font-black leading-tight text-neo-black ${FOCUS}`;
/** A real second action: dark, still chunky. */
export const NB_SECONDARY = EDU_BUTTON.secondary;
/** NB_SECONDARY's face for a <PressSurface asChild>; pair with a cream/40 lip, since black has no edge on navy. */
export const NB_SECONDARY_FACE = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-neo-lg border-[3px] ${NB_DARK_EDGE} bg-edu-surface px-4 text-center font-neo-display text-base font-black leading-tight text-edu-ink shadow-edu-line ${FOCUS}`;
/** Small chunky button for inside cards. Combine with an NB_BLOCK color. */
export const NB_SMALL = EDU_BUTTON.small;

/** Sticker: a small tilted-ready pill for facts and states (defaults, counts, streaks). */
export const NB_STICKER =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-neo-pill border-2 border-neo-black px-2.5 py-0.5 font-neo-body text-xs font-black shadow-hard';

/** Quiet underlined link for the rare way out. */
export const NB_LINK = [
  'inline-flex min-h-[44px] items-center gap-1 rounded-neo px-2 font-neo-body text-sm font-bold text-edu-ink/85 underline decoration-2 underline-offset-4 hover:text-edu-ink',
  FOCUS,
].join(' ');

/** Dashed row that opens rarer options (Advanced). */
export const NB_ADVANCED = [
  'flex min-h-[48px] w-full items-center justify-between gap-2 rounded-neo-lg border-[3px] border-dashed border-edu-line px-3 text-start font-neo-body text-sm font-bold text-edu-ink/85 hover:border-edu-line hover:text-edu-ink',
  FOCUS,
].join(' ');

/** A fold that opens rarer options, drawn as a solid white card with a lip instead of a dashed row. */
export const NB_FOLD = cn(NB_ADVANCED, 'rounded-neo-xl border-solid bg-edu-surface p-4 text-base font-black text-edu-ink shadow-edu-lip sm:p-5');

/** Input on a cream field with the same outline and shadow. */
export const NB_INPUT =
  'min-h-[52px] w-full rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 font-neo-body text-base font-bold text-neo-black shadow-hard-lg placeholder:text-neo-black/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';
