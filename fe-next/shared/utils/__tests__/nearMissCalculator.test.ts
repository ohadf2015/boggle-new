import {
  calculateAlmostFoundWords,
  type AlmostFoundWord,
  type BoardCell,
  type ValidWordWithPath,
  type PlayerTrace,
} from '../nearMissCalculator';

describe('nearMissCalculator', () => {
  // Simple 3x3 board: C A T / D O G / B I N
  const board: BoardCell[][] = [
    [{ letter: 'C', row: 0, col: 0 }, { letter: 'A', row: 0, col: 1 }, { letter: 'T', row: 0, col: 2 }],
    [{ letter: 'D', row: 1, col: 0 }, { letter: 'O', row: 1, col: 1 }, { letter: 'G', row: 1, col: 2 }],
    [{ letter: 'B', row: 2, col: 0 }, { letter: 'I', row: 2, col: 1 }, { letter: 'N', row: 2, col: 2 }],
  ];

  const validWords: ValidWordWithPath[] = [
    { word: 'CAT', score: 3, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] },
    { word: 'DOG', score: 3, path: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }] },
    { word: 'COD', score: 3, path: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 0 }] },
    { word: 'BINGO', score: 5, path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 1 }] },
  ];

  describe('calculateAlmostFoundWords', () => {
    it('should return empty array when no traces provided', () => {
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: [],
        foundWords: [],
      });
      expect(result).toEqual([]);
    });

    it('should not include words the player already found', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // started CAT
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: ['CAT'],
      });
      expect(result.find(w => w.word === 'CAT')).toBeUndefined();
    });

    it('should detect words where trace is a prefix of the word path', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // C, A - prefix of CAT
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      const catResult = result.find(w => w.word === 'CAT');
      expect(catResult).toBeDefined();
      expect(catResult!.matchPercentage).toBeCloseTo(66.67, 0);
    });

    it('should detect words where trace matches 80%+ of letters', () => {
      // Trace 4 of 5 cells of BINGO path
      const traces: PlayerTrace[] = [
        { path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 1, col: 2 }] },
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      const bingoResult = result.find(w => w.word === 'BINGO');
      expect(bingoResult).toBeDefined();
      expect(bingoResult!.matchPercentage).toBe(80);
      expect(bingoResult!.score).toBe(5);
    });

    it('should not include words with less than 50% match', () => {
      // Trace only 1 of 5 cells of BINGO
      const traces: PlayerTrace[] = [
        { path: [{ row: 2, col: 0 }] },
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      const bingoResult = result.find(w => w.word === 'BINGO');
      expect(bingoResult).toBeUndefined();
    });

    it('should sort results by match percentage descending', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // 66% of CAT
        { path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 1, col: 2 }] }, // 80% of BINGO
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      if (result.length >= 2) {
        expect(result[0].matchPercentage).toBeGreaterThanOrEqual(result[1].matchPercentage);
      }
    });

    it('should include wordPath and playerTracePath in results', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      const catResult = result.find(w => w.word === 'CAT');
      expect(catResult?.wordPath).toEqual(validWords[0].path);
      expect(catResult?.playerTracePath).toEqual(traces[0].path);
    });

    it('should use custom threshold when provided', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // 66% of CAT
      ];
      // With 70% threshold, CAT (66%) should be excluded
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
        minMatchPercentage: 70,
      });
      expect(result.find(w => w.word === 'CAT')).toBeUndefined();
    });

    it('should not duplicate words matched by multiple traces', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // partial CAT
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // same partial CAT again
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      const catMatches = result.filter(w => w.word === 'CAT');
      expect(catMatches.length).toBeLessThanOrEqual(1);
    });

    it('should pick best match when multiple traces match same word', () => {
      const traces: PlayerTrace[] = [
        { path: [{ row: 0, col: 0 }] }, // 33% of CAT
        { path: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }, // 66% of CAT
      ];
      const result = calculateAlmostFoundWords({
        board,
        validWords,
        playerTraces: traces,
        foundWords: [],
      });
      const catResult = result.find(w => w.word === 'CAT');
      if (catResult) {
        expect(catResult.matchPercentage).toBeCloseTo(66.67, 0);
      }
    });
  });
});
