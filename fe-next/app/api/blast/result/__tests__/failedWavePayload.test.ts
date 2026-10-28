import { describe, it, expect } from 'vitest';
import { validateBlastResult } from '../../utils';

describe('validateBlastResult — run that ends on a failed wave', () => {
  it('accepts a sub-90% final wave with the run total score', () => {
    const result = validateBlastResult({
      score: 1834,
      tilesCleared: 15,
      totalTiles: 36,
      clearPercentage: 42,
      wordsFound: ['cat', 'dog', 'sun'],
      bestWord: 'cat',
      maxCombo: 3,
      stars: 1,
      difficulty: 'medium',
      language: 'he',
    });
    expect(result.valid).toBe(true);
  });
});
