import { describe, it, expect } from 'vitest';
import {
  getWordHuntTargets,
  generateWordHuntPuzzle,
} from '../wordHuntPuzzle';
import { isWordOnBoard } from '@/utils/utils';
import type { Language } from '@/shared/types/game';

const rng0 = () => 0;

describe('getWordHuntTargets', () => {
  it('has embeddable target pools for en/he/sv/es', () => {
    for (const lang of ['en', 'he', 'sv', 'es']) {
      expect(getWordHuntTargets(lang).length).toBeGreaterThan(0);
    }
  });

  it('has no pool for ja (its generator cannot embed)', () => {
    expect(getWordHuntTargets('ja')).toEqual([]);
  });

  it('contains only 3-4 letter words', () => {
    for (const lang of ['en', 'he', 'sv', 'es']) {
      for (const w of getWordHuntTargets(lang)) {
        expect(w.length).toBeGreaterThanOrEqual(3);
        expect(w.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('he targets carry no final-form letters', () => {
    const FINALS = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const w of getWordHuntTargets('he')) {
      for (const f of FINALS) expect(w).not.toContain(f);
    }
  });
});

describe('generateWordHuntPuzzle', () => {
  it('embeds the chosen target with [target] for a pooled language', () => {
    const calls: string[][] = [];
    const puzzle = generateWordHuntPuzzle('en', {
      rng: rng0,
      generate: (words) => {
        calls.push(words);
        return [['A', 'B'], ['C', 'D']];
      },
    });
    expect(puzzle.target).toBe(getWordHuntTargets('en')[0]);
    expect(calls).toEqual([[puzzle.target]]);
  });

  it('falls back to a fixed JA board+target (no embed) for ja', () => {
    const calls: string[][] = [];
    const puzzle = generateWordHuntPuzzle('ja', {
      rng: rng0,
      generate: (words) => {
        calls.push(words);
        return [['x']];
      },
    });
    expect(calls).toHaveLength(0); // generator not used for the fallback
    expect(puzzle.target.length).toBeGreaterThan(0);
    expect(isWordOnBoard(puzzle.target, puzzle.board, 'ja' as Language)).toBe(true);
  });

  it('guarantees the target is findable on a real board (en/he/sv/es)', () => {
    for (const lang of ['en', 'he', 'sv', 'es']) {
      const puzzle = generateWordHuntPuzzle(lang);
      expect(isWordOnBoard(puzzle.target, puzzle.board, lang as Language)).toBe(true);
      expect(puzzle.board).toHaveLength(4);
    }
  });
});
