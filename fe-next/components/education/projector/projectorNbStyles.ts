/**
 * The projector wall's neo-brutalist pieces. Cream edges, never black: the wall is navy, and black on navy is no edge.
 * Widths are literal (`border-[3px]`) so cn() never merges them away with a colour.
 */
export const WALL_EDGE = 'border-[3px] border-edu-line';

export const WALL_PANEL = `rounded-neo-lg ${WALL_EDGE} bg-edu-surface text-edu-ink shadow-hard-xl`;

/** A small chunky square control on the dark wall (exit, copy, cancel). */
export const WALL_SQUARE = `grid size-11 shrink-0 place-items-center rounded-neo ${WALL_EDGE} bg-edu-surface text-edu-ink shadow-hard hover:bg-edu-surface`;

/** A fact pinned to the wall: dark pill, chunky edge, hard shadow. */
export const WALL_STICKER = `inline-flex min-w-0 max-w-full items-center gap-[0.4em] rounded-neo ${WALL_EDGE} bg-edu-surface px-[0.6em] py-[0.2em] font-neo-display font-bold text-edu-ink shadow-hard`;

/** The one cream label that names the hero: black edge on its own cream fill, tilted like a sticker. */
export const CREAM_STICKER = 'inline-flex -rotate-2 items-center gap-[0.35em] whitespace-nowrap rounded-neo border-[3px] border-neo-black bg-neo-cream px-[0.6em] py-[0.15em] font-neo-display font-black text-neo-black shadow-hard';
