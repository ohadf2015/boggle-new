import { describe, it, expect } from 'vitest';
import { computeCompletion } from '../completion';
import type { BlastLevel } from '../../types';
import { LOCALE_CONFIGS } from '../../locale-config';

const config = LOCALE_CONFIGS.en;

function lvl(partial: Partial<BlastLevel>): BlastLevel {
  return {
    id: 'c',
    levelNumber: 1,
    theme: 'onboarding',
    locale: 'en',
    words: [],
    columns: [],
    resolvableOrder: [],
    tileFlags: {},
    difficulty: 1,
    ...partial,
  };
}

describe('computeCompletion', () => {
  it('is complete + "mastered" when every theme word is found', () => {
    const level = lvl({
      words: ['DOG', 'CAT'],
      columns: [
        { index: 0, tiles: ['D', 'C'] },
        { index: 1, tiles: ['O', 'A'] },
        { index: 2, tiles: ['G', 'T'] },
      ],
    });
    const r = computeCompletion(level, new Set(['DOG', 'CAT']), config);
    expect(r.complete).toBe(true);
    expect(r.reason).toBe('mastered');
  });

  it('is NOT complete while a theme word is still findable on the board', () => {
    const level = lvl({
      words: ['DOG', 'CAT'],
      columns: [
        { index: 0, tiles: ['D', 'C'] },
        { index: 1, tiles: ['O', 'A'] },
        { index: 2, tiles: ['G', 'T'] },
      ],
    });
    // Found DOG, CAT still sits on the board → keep playing.
    const r = computeCompletion(level, new Set(['DOG']), config);
    expect(r.complete).toBe(false);
  });

  it('is complete + "partial" when a remaining theme word is no longer formable (soft-lock rescue)', () => {
    // Words DOG + CAT, but the board only physically contains DOG. CAT can
    // never be formed → the player would otherwise be stuck forever. Finding
    // DOG must complete the level as a partial finish.
    const level = lvl({
      words: ['DOG', 'CAT'],
      columns: [
        { index: 0, tiles: ['D'] },
        { index: 1, tiles: ['O'] },
        { index: 2, tiles: ['G'] },
      ],
    });
    const r = computeCompletion(level, new Set(['DOG']), config);
    expect(r.complete).toBe(true);
    expect(r.reason).toBe('partial');
  });

  it('is complete + "partial" when only the tiny-remainder clause fires (<=2 tiles left)', () => {
    // Both theme words still formable, but the whole board is just 2 tiles.
    // The literal-brief clause completes it as a partial.
    const level = lvl({
      words: ['HI', 'NO'],
      columns: [
        { index: 0, tiles: ['H'] },
        { index: 1, tiles: ['I'] },
      ],
    });
    const r = computeCompletion(level, new Set(), config);
    expect(r.complete).toBe(true);
    expect(r.reason).toBe('partial');
  });

  it('all-theme-found takes precedence: reason is "mastered" even if board is tiny', () => {
    const level = lvl({
      words: ['HI'],
      columns: [
        { index: 0, tiles: ['H'] },
        { index: 1, tiles: ['I'] },
      ],
    });
    const r = computeCompletion(level, new Set(['HI']), config);
    expect(r.complete).toBe(true);
    expect(r.reason).toBe('mastered');
  });

  it('a fresh full board with all words formable and >2 tiles is NOT complete', () => {
    const level = lvl({
      words: ['DOG', 'CAT'],
      columns: [
        { index: 0, tiles: ['D', 'C'] },
        { index: 1, tiles: ['O', 'A'] },
        { index: 2, tiles: ['G', 'T'] },
      ],
    });
    const r = computeCompletion(level, new Set(), config);
    expect(r.complete).toBe(false);
  });
});
