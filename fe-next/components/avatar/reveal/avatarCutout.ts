/**
 * Turns the player's avatar tile into a free-standing figure for the reveal
 * stage (so it can pop out of the reward box instead of sitting in a square).
 *
 * The renderer has no public "no backdrop" prop, so the reveal hides the tile
 * layers of its output with CSS scoped to `.lcr-cutout`: the background shape,
 * halftone and glow sit beside ONE filtered character group inside the tile
 * clip. Render the avatar with `forceTier="free"` (no rarity frame outside the
 * clip) and `disableEffects` (a bare <svg>, nestable in the stage SVG).
 * __tests__/avatarCutout.test.tsx renders the REAL renderer against these
 * selectors, so a change in the art track fails loudly, and a mismatch only
 * ever degrades to the old tile, never to a blank.
 */
export const CUTOUT_CLASS = 'lcr-cutout';
export const CUTOUT_SVG = 'svg[data-testid="custom-avatar"]';
const CLIP_GROUP = `${CUTOUT_SVG} > g[clip-path]`;
export const CUTOUT_FIGURE = `${CLIP_GROUP} > g[filter]`;
export const CUTOUT_TILE_LAYERS = `${CLIP_GROUP} > :not([filter])`;

export const CUTOUT_CSS = [
  `.${CUTOUT_CLASS} ${CUTOUT_SVG} { overflow: visible; }`,
  `.${CUTOUT_CLASS} ${CLIP_GROUP} { clip-path: none; }`,
  `.${CUTOUT_CLASS} ${CUTOUT_TILE_LAYERS} { display: none; }`,
].join('\n');
