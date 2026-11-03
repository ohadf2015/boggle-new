/** Average advance of one uppercase Fredoka-black letter with `tracking-wide`, in em. */
const LETTER_EM = 0.68;
const MIN_LETTERS = 4;

/**
 * Width, in em, of the longest unbreakable word on a plate. The plate divides its
 * free width by this to pick a font size, so a long word shrinks to one line
 * instead of breaking mid-word.
 */
export function plateFitEms(word: string): number {
  const longest = Math.max(MIN_LETTERS, ...word.split(/\s+/).map((token) => [...token].length));
  return Number((longest * LETTER_EM).toFixed(2));
}
