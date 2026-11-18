import { describe, it, expect } from 'vitest';
import { generateRandomTable } from '../gameUtils';
import { isWordOnBoard, makePositionsMap } from '../../modules/wordValidator';
import { boardSeedWord } from '@/shared/utils/wordNormalization';

const SPANISH_LESSON = ['Eficiente', 'Productividad', 'Rentabilidad', 'Honestidad', 'Justicia', 'Equidad', 'Innovación', 'Transparencia'];

describe('server deal with lesson words longer than the board side', () => {
  it('GIVEN a Spanish list of 7-13 letter words WHEN a 6x6 board is dealt THEN several of them are on it', () => {
    for (let run = 0; run < 20; run++) {
      const grid = generateRandomTable(6, 6, 'es', SPANISH_LESSON);
      const positions = makePositionsMap(grid, 'es');
      const placed = SPANISH_LESSON.filter((w) => isWordOnBoard(boardSeedWord(w, 'es'), grid, positions, 'es'));
      expect(placed.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('GIVEN a word with more letters than the board has cells WHEN dealt THEN the deal still returns a full board', () => {
    const grid = generateRandomTable(4, 4, 'en', ['INTERNATIONALIZATION']);
    expect(grid.flat()).toHaveLength(16);
    expect(grid.flat().every(Boolean)).toBe(true);
  });
});
