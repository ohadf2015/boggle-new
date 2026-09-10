import { describe, it, expect } from 'vitest';
import {
  CEFR_LEVELS,
  cefrList,
  demoBoard,
  findWordOnBoard,
  isAdjacent,
  practiceHref,
  wordFromPath,
} from '../eslCefrDemo';

describe('CEFR lists', () => {
  it('exposes A1, A2 and B1 with at least 12 English words each', () => {
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1']);
    for (const level of CEFR_LEVELS) {
      const words = cefrList(level);
      expect(words.length).toBeGreaterThanOrEqual(12);
      expect(words.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    }
  });

  it('maps each list onto a distinct practice mode', () => {
    expect(practiceHref('A1', 'en')).toContain('/en/education/classroom-game');
    expect(practiceHref('A1', 'en')).toContain('cefr=A1');
    expect(practiceHref('A1', 'en')).toContain('mode=warmup');
    expect(practiceHref('A2', 'es')).toContain('/es/education/classroom-game');
    expect(practiceHref('A2', 'es')).toContain('mode=spelling');
    expect(practiceHref('B1', 'he')).toContain('/he/education/classroom-game');
    expect(practiceHref('B1', 'he')).toContain('mode=blitz');
  });
});

describe('playable demo board', () => {
  it('treats orthogonal and diagonal neighbours as adjacent, not wrap-around', () => {
    expect(isAdjacent(0, 1)).toBe(true);
    expect(isAdjacent(0, 5)).toBe(true);
    expect(isAdjacent(0, 4)).toBe(true);
    expect(isAdjacent(0, 2)).toBe(false);
    expect(isAdjacent(3, 4)).toBe(false);
  });

  it('spells the path in order', () => {
    const board = demoBoard('A1').letters;
    expect(wordFromPath(board, [0, 1, 2])).toBe('CAT');
  });

  it('can find every target word on its CEFR board', () => {
    for (const level of CEFR_LEVELS) {
      const { letters, targets } = demoBoard(level);
      expect(targets.length).toBeGreaterThanOrEqual(4);
      for (const word of targets) {
        const path = findWordOnBoard(letters, word);
        expect(path, `${level} missing ${word}`).not.toBeNull();
        expect(wordFromPath(letters, path!)).toBe(word);
      }
    }
  });
});
