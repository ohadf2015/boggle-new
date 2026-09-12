import { describe, it, expect } from 'vitest';
import {
  generatePlayablePracticeBoard,
  PRACTICE_BOARD_MAX_ATTEMPTS,
} from '../practiceBoard';
import { isWordOnBoard } from '../previewBoard';

describe('generatePlayablePracticeBoard', () => {
  it('returns a board that contains at least one placeable lesson word', () => {
    const result = generatePlayablePracticeBoard({
      words: ['cat', 'dog'],
      language: 'en',
      rows: 5,
      cols: 5,
      seed: 7,
    });

    expect(result).not.toBeNull();
    expect(result!.embedded.length).toBeGreaterThan(0);
    expect(
      result!.embedded.some((word) => isWordOnBoard(word, result!.grid, 'en')),
    ).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const a = generatePlayablePracticeBoard({
      words: ['light', 'night'],
      language: 'en',
      rows: 6,
      cols: 6,
      seed: 42,
    });
    const b = generatePlayablePracticeBoard({
      words: ['light', 'night'],
      language: 'en',
      rows: 6,
      cols: 6,
      seed: 42,
    });

    expect(a?.grid).toEqual(b?.grid);
    expect(a?.embedded).toEqual(b?.embedded);
    expect(a?.seed).toEqual(b?.seed);
  });

  it('returns null when no lesson word can ever fit the grid', () => {
    const result = generatePlayablePracticeBoard({
      words: ['supercalifragilistic'],
      language: 'en',
      rows: 4,
      cols: 4,
      seed: 1,
      maxAttempts: PRACTICE_BOARD_MAX_ATTEMPTS,
    });

    expect(result).toBeNull();
  });

  it('returns null when the lesson has no usable words', () => {
    expect(
      generatePlayablePracticeBoard({
        words: ['  ', ''],
        language: 'en',
        rows: 5,
        cols: 5,
        seed: 1,
      }),
    ).toBeNull();
  });
});
