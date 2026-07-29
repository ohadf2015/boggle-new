import { computeGemDetectorHighlights } from '../useGemDetectorHighlights';

describe('computeGemDetectorHighlights', () => {
  const gridSize = 4;

  it('returns empty array when gemDetectorLevel is 0', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 0,
      remainingWords: ['CAT', 'DOG', 'ELEPHANT'],
      findPathForWord: () => [{ row: 0, col: 0 }],
      gridSize,
    });
    expect(result).toEqual([]);
  });

  it('returns 1 highlight index at level 1', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 1,
      remainingWords: ['ELEPHANT', 'CAT', 'DOG'],
      findPathForWord: (word: string) => {
        if (word === 'ELEPHANT') return [{ row: 0, col: 1 }, { row: 0, col: 2 }];
        if (word === 'CAT') return [{ row: 1, col: 0 }];
        if (word === 'DOG') return [{ row: 2, col: 0 }];
        return null;
      },
      gridSize,
    });
    // ELEPHANT is longest (highest score), starting at (0,1) => index 1
    expect(result).toEqual([1]);
  });

  it('returns 2 highlight indices at level 2', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 2,
      remainingWords: ['ELEPHANT', 'TIGER', 'CAT'],
      findPathForWord: (word: string) => {
        if (word === 'ELEPHANT') return [{ row: 0, col: 0 }];
        if (word === 'TIGER') return [{ row: 1, col: 1 }];
        if (word === 'CAT') return [{ row: 2, col: 2 }];
        return null;
      },
      gridSize,
    });
    // ELEPHANT and TIGER are top 2 longest
    expect(result).toHaveLength(2);
    expect(result).toContain(0); // ELEPHANT at (0,0)
    expect(result).toContain(5); // TIGER at (1,1)
  });

  it('returns 3 highlight indices at level 3', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 3,
      remainingWords: ['ELEPHANT', 'TIGER', 'LION', 'CAT'],
      findPathForWord: (word: string) => {
        if (word === 'ELEPHANT') return [{ row: 0, col: 0 }];
        if (word === 'TIGER') return [{ row: 1, col: 0 }];
        if (word === 'LION') return [{ row: 2, col: 0 }];
        if (word === 'CAT') return [{ row: 3, col: 0 }];
        return null;
      },
      gridSize,
    });
    expect(result).toHaveLength(3);
    expect(result).toContain(0);  // ELEPHANT at (0,0)
    expect(result).toContain(4);  // TIGER at (1,0)
    expect(result).toContain(8);  // LION at (2,0)
  });

  it('skips words with no path found', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 2,
      remainingWords: ['ELEPHANT', 'TIGER', 'CAT'],
      findPathForWord: (word: string) => {
        if (word === 'ELEPHANT') return null; // no path
        if (word === 'TIGER') return [{ row: 1, col: 1 }];
        if (word === 'CAT') return [{ row: 2, col: 2 }];
        return null;
      },
      gridSize,
    });
    // ELEPHANT has no path, so TIGER and CAT are shown
    expect(result).toHaveLength(2);
    expect(result).toContain(5); // TIGER at (1,1)
    expect(result).toContain(10); // CAT at (2,2)
  });

  it('returns empty array when no remaining words', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 3,
      remainingWords: [],
      findPathForWord: () => null,
      gridSize,
    });
    expect(result).toEqual([]);
  });

  it('deduplicates highlight indices when multiple words start at same tile', () => {
    const result = computeGemDetectorHighlights({
      gemDetectorLevel: 2,
      remainingWords: ['ELEPHANT', 'EAGLE'],
      findPathForWord: () => [{ row: 0, col: 0 }], // both start at same tile
      gridSize,
    });
    // Should deduplicate to 1 index, then look for more
    expect(result).toHaveLength(1);
    expect(result).toContain(0);
  });
});
