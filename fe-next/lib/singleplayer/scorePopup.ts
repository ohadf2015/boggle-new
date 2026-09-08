/**
 * Whether a score change should fly a "+N" popup.
 *
 * Extracted from `SinglePlayerGame`'s score effect, which used
 * `delta > 0 && prevScore > 0`. Because `delta > 0` already rules out a
 * no-change render, the `prevScore > 0` half only ever suppressed the FIRST
 * scoring word of a round — the one word where a new player most needs the
 * reward. Introduced in `7b6f43c86` with no comment, and no test pinned it as
 * deliberate.
 *
 * The reason it could not just be dropped: a resumed round can hydrate a saved
 * score in a single jump, and `prevScore > 0` incidentally stopped that from
 * flying one enormous popup. The found-word COUNT separates the two cases
 * cleanly — playing a word advances it by exactly one, restoring a round
 * advances it by many — so that is what this gates on instead.
 */
export function shouldShowScorePopup({
  delta,
  prevWordCount,
  wordCount,
}: {
  /** Score change since the previous render. */
  delta: number;
  /** Found-word count at the previous render. */
  prevWordCount: number;
  /** Found-word count now. */
  wordCount: number;
}): boolean {
  if (delta <= 0) return false;
  // Exactly one new word: a word was played, and the popup has something to
  // anchor to. Anything else is a hydration, a reset, or a detached score
  // adjustment.
  return wordCount === prevWordCount + 1;
}
