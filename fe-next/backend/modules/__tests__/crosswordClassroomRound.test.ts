import { describe, it, expect } from 'vitest';
import { crosswordClassroomWords } from '../crosswordClassroomRound';

const puzzle = { slots: [{ answer: 'CAT' }, { answer: 'DOG' }] };

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
});
