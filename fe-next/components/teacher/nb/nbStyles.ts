/**
 * The teacher area's chunky look, shared by every redesigned teacher screen:
 * black 3px outlines, hard offset shadows, flat bold color blocks.
 * Same vocabulary as the live game screens, so the dashboard and the game feel like one product.
 */

import { NEO_BLOCK_TONES, NEO_BUTTON, NEO_DARK_EDGE, NEO_FOCUS as FOCUS } from '@/components/ui/neoStyles';

/** Outline for anything dark sitting on the dark page (cream, since black on navy has no edge). */
export const NB_DARK_EDGE = NEO_DARK_EDGE;

/** Panel: dark card with a cream outline and a hard shadow. Pass a color block for the lead card. */
export const NB_PANEL = `rounded-neo-xl border-[3px] ${NB_DARK_EDGE} bg-[#2a2b4a] text-neo-cream shadow-hard-xl`;

/** Flat color blocks for lead cards. Put the block after the base style in cn() so its outline wins. */
export const NB_BLOCK = NEO_BLOCK_TONES;
export type NbColor = keyof typeof NB_BLOCK;

/** The one main action on a screen. */
export const NB_PRIMARY = NEO_BUTTON.primary;
/** A real second action: dark, still chunky. */
export const NB_SECONDARY = NEO_BUTTON.secondary;
/** Small chunky button for inside cards. Combine with an NB_BLOCK color. */
export const NB_SMALL = NEO_BUTTON.small;

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
