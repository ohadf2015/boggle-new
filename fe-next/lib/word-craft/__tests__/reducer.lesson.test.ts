import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';

const letters = (rack: { letter: string }[]) => rack.map((t) => t.letter);
const hasAll = (rack: { letter: string }[], word: string) => {
  const pool = letters(rack);
  return Array.from(word).every((l) => {
    const i = pool.indexOf(l);
    if (i < 0) return false;
    pool.splice(i, 1);
    return true;
  });
};

describe('reducer — lesson mode', () => {
  it('Given lesson targets, Then the opening rack can spell the first one', () => {
    for (const seed of [1, 2, 3, 99]) {
      const s = buildInitialState({ seed, boardSize: 15, locale: 'en', modifierOverride: 'none', lesson: { targets: ['QUIZ', 'DOG'], language: 'en' } });
      expect(hasAll(s.player.rack, 'QUIZ')).toBe(true);
      expect(s.lesson?.found).toEqual([]);
    }
  });

  it('Given the player plays a lesson word, Then it is marked found and the refill steers to the next target', () => {
    let s = buildInitialState({ seed: 4, boardSize: 15, locale: 'en', modifierOverride: 'none', lesson: { targets: ['CAT', 'DOG'], language: 'en' } });
    const rack = s.player.rack.slice();
    const pick = (l: string) => rack.splice(rack.findIndex((t) => t.letter === l), 1)[0];
    const placements = ['C', 'A', 'T'].map((l, i) => {
      const t = pick(l);
      return { rackTileId: t.id, row: 7, col: 7 + i, letter: l, value: 1, isBlank: false };
    });
    s = wordCraftReducer(s, { type: 'COMMIT_PLAYER', placements, score: 5, words: ['CAT'], wordCells: [placements.map((p) => ({ row: p.row, col: p.col }))] });
    expect(s.lesson?.found).toEqual(['CAT']);
    expect(hasAll(s.player.rack, 'DOG')).toBe(true);
  });

  it('Given no lesson, Then lesson state is null (normal game untouched)', () => {
    expect(buildInitialState({ seed: 1, boardSize: 15, locale: 'en' }).lesson).toBeNull();
  });
});
