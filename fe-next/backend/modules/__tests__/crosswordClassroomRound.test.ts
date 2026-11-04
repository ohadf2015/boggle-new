import { describe, it, expect } from 'vitest';
import { crosswordClassroomWords } from '../crosswordClassroomRound';

const puzzle = { slots: [{ id: 'A1', answer: 'CAT' }, { id: 'D1', answer: 'DOG' }] };

describe('crosswordClassroomWords', () => {
  it('returns null when the game has no crossword state (null or undefined)', () => {
    expect(crosswordClassroomWords(null, ['cat'])).toBeNull();
    expect(crosswordClassroomWords(undefined, ['cat'])).toBeNull();
  });

  it('keeps only lesson words placed on the grid', () => {
    const r = crosswordClassroomWords({ puzzle, progress: {} }, ['cat', 'bird', 'Dog']);
    expect(r?.placedWords).toEqual(['cat', 'Dog']);
  });

  it('credits every answer to a player who solved the grid and nothing otherwise', () => {
    const r = crosswordClassroomWords({ puzzle, progress: { ana: { solved: true }, ben: { solved: false } } }, []);
    expect(r?.wordDetailsFor('ana')).toEqual([
      { word: 'cat', validated: true },
      { word: 'dog', validated: true },
    ]);
    expect(r?.wordDetailsFor('ben')).toEqual([]);
    expect(r?.wordDetailsFor('guest')).toEqual([]);
  });

  it('on a lesson grid, credits each solved clue with the lesson word as the teacher wrote it', () => {
    const state = {
      puzzle: { slots: [{ id: 'A1', answer: 'שלומ' }, { id: 'D2', answer: 'מלכ' }] },
      lessonWordBySlot: { A1: 'שָׁלוֹם', D2: 'מלך' },
      progress: { ana: { solved: false, solvedSlotIds: ['D2'] }, ben: { solved: true }, kim: { solved: false } },
    };
    const r = crosswordClassroomWords(state, ['שָׁלוֹם', 'מלך', 'ספר']);
    expect(r?.placedWords).toEqual(['שָׁלוֹם', 'מלך']);
    expect(r?.wordDetailsFor('ana')).toEqual([{ word: 'מלך', validated: true }]);
    expect(r?.wordDetailsFor('ben')).toEqual([{ word: 'שָׁלוֹם', validated: true }, { word: 'מלך', validated: true }]);
    expect(r?.wordDetailsFor('kim')).toEqual([]);
  });

  it('credits partly solved arcade grids per solved slot too', () => {
    const r = crosswordClassroomWords({ puzzle, progress: { ana: { solved: false, solvedSlotIds: ['D1'] } } }, ['dog']);
    expect(r?.wordDetailsFor('ana')).toEqual([{ word: 'dog', validated: true }]);
  });
});
