import { describe, it, expect } from 'vitest';
import { ENGLISH_LETTER_POOL } from '../englishLetters';
import { generateRandomTable as backendTable } from '../../../backend/utils/gameUtils';
import { generateRandomTable as clientTable } from '../../../utils/utils';
import { generateCustomChallengeGrid } from '../../../utils/customChallengeGrid';

const RARE = new Set(['Q', 'Z', 'X', 'J']);

function rareShare(boards: string[][][]): number {
  const cells = boards.flat(2);
  return cells.filter((c) => RARE.has(c)).length / cells.length;
}

describe('English letter pool', () => {
  it('can still produce every letter', () => {
    expect(new Set(ENGLISH_LETTER_POOL).size).toBe(26);
  });

  it('draws E far more often than Q', () => {
    const count = (l: string) => ENGLISH_LETTER_POOL.filter((x) => x === l).length;
    expect(count('E')).toBeGreaterThanOrEqual(10 * count('Q'));
  });

  // A uniform A–Z draw puts Q/Z/X/J on ~15% of tiles; a frequency-weighted one
  // on ~4%. 400 boards × 25 cells keeps the uniform case well above the bar.
  it.each([
    ['backend', () => backendTable(5, 5, 'en')],
    ['client host', () => clientTable(5, 5, 'en')],
    // Daily and classroom rooms embed lesson words, then fill the rest from the pool.
    ['backend, with embedded words', () => backendTable(5, 5, 'en', ['CAT', 'DOG'])],
    ['custom challenge', () => generateCustomChallengeGrid(5, 5, 'en', 'CAT')],
  ])('%s English boards rarely show Q/Z/X/J', (_name, make) => {
    const boards = Array.from({ length: 400 }, make) as string[][][];
    expect(rareShare(boards)).toBeLessThan(0.08);
  });
});
