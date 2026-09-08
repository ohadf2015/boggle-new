/**
 * The flying "+N" popup is the flagship reward for finding a word, and it never
 * fired for the FIRST word of a single-player round.
 *
 * The old guard was `delta > 0 && prevScore > 0`. Since `delta > 0` already
 * excludes the no-change case, the only thing `prevScore > 0` actually
 * suppressed was the first scoring word of every round — on a mode where the
 * median player quits 17 seconds into 60, that is the single word where the
 * reward matters most.
 *
 * It could not simply be deleted: it also stops a spurious popup when a resumed
 * round hydrates a saved score in one jump (0 -> 87 would have flown a "+87").
 * The discriminator that separates the two is the found-word COUNT — one word
 * played increments it by exactly one, a bulk hydration by many.
 */
import { describe, it, expect } from 'vitest';
import { shouldShowScorePopup } from '../scorePopup';

describe('shouldShowScorePopup', () => {
  it('fires for the very first word of a round', () => {
    // The regression this exists for.
    expect(shouldShowScorePopup({ delta: 12, prevWordCount: 0, wordCount: 1 })).toBe(true);
  });

  it('fires for each subsequent word', () => {
    expect(shouldShowScorePopup({ delta: 8, prevWordCount: 1, wordCount: 2 })).toBe(true);
    expect(shouldShowScorePopup({ delta: 30, prevWordCount: 9, wordCount: 10 })).toBe(true);
  });

  it('stays silent when the score did not go up', () => {
    expect(shouldShowScorePopup({ delta: 0, prevWordCount: 3, wordCount: 3 })).toBe(false);
    expect(shouldShowScorePopup({ delta: -5, prevWordCount: 3, wordCount: 4 })).toBe(false);
  });

  it('stays silent when a resumed round hydrates several words at once', () => {
    // 0 -> 87 across 9 restored words must not fly a "+87".
    expect(shouldShowScorePopup({ delta: 87, prevWordCount: 0, wordCount: 9 })).toBe(false);
  });

  it('stays silent when the score moves but no new word was found', () => {
    // e.g. a bonus/multiplier settling after the fact — the popup is anchored to
    // a word, so without a new word there is nothing to fly.
    expect(shouldShowScorePopup({ delta: 25, prevWordCount: 4, wordCount: 4 })).toBe(false);
  });

  it('stays silent if the word count somehow goes backwards (round reset)', () => {
    expect(shouldShowScorePopup({ delta: 10, prevWordCount: 7, wordCount: 1 })).toBe(false);
  });
});
