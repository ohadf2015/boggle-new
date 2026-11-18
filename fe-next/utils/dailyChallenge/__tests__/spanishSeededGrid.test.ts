import { describe, it, expect } from 'vitest';
import { generateDailyGrid } from '../gridGeneration';

describe('Spanish seeded daily grid', () => {
  it('GIVEN a past date WHEN the es grid is generated THEN it is the board players already saw', () => {
    expect(generateDailyGrid('2026-06-15', 'es')).toEqual([
      ['E', 'M', 'N', 'Ú', 'K', 'Ñ'],
      ['S', 'Á', 'X', 'X', 'E', 'S'],
      ['Á', 'Y', 'É', 'A', 'A', 'E'],
      ['Y', 'T', 'X', 'I', 'J', 'Y'],
      ['C', 'Ó', 'O', 'C', 'N', 'N'],
      ['J', 'M', 'I', 'M', 'Ü', 'Q'],
    ]);
  });
});
