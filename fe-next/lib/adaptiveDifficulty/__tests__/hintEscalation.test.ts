import { getHintLevel, generateHint, HintLevel, HintData } from '../hintEscalation';

describe('getHintLevel', () => {
  describe('none level (attempts 0-2)', () => {
    it('should return none for 0 attempts', () => {
      expect(getHintLevel(0)).toBe('none');
    });

    it('should return none for 1 attempt', () => {
      expect(getHintLevel(1)).toBe('none');
    });

    it('should return none for 2 attempts', () => {
      expect(getHintLevel(2)).toBe('none');
    });
  });

  describe('length level (attempt 3)', () => {
    it('should return length for 3 attempts', () => {
      expect(getHintLevel(3)).toBe('length');
    });
  });

  describe('lengthAndStart level (attempt 4)', () => {
    it('should return lengthAndStart for 4 attempts', () => {
      expect(getHintLevel(4)).toBe('lengthAndStart');
    });
  });

  describe('fullReveal level (attempts 5+)', () => {
    it('should return fullReveal for 5 attempts', () => {
      expect(getHintLevel(5)).toBe('fullReveal');
    });

    it('should return fullReveal for 10 attempts', () => {
      expect(getHintLevel(10)).toBe('fullReveal');
    });
  });
});

describe('generateHint', () => {
  const mockWordPath = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
  ];

  describe('none level', () => {
    it('should return none hint data for 1 attempt', () => {
      const result = generateHint({
        attemptCount: 1,
        targetWord: 'MAGIC',
        wordPath: mockWordPath,
      });

      expect(result).toEqual({
        level: 'none',
      });
    });
  });

  describe('length level', () => {
    it('should return length hint data for 3 attempts', () => {
      const result = generateHint({
        attemptCount: 3,
        targetWord: 'MAGIC',
        wordPath: mockWordPath,
      });

      expect(result).toEqual({
        level: 'length',
        message: 'difficulty.hint.length',
        wordLength: 5,
      });
    });

    it('should handle different word lengths', () => {
      const result = generateHint({
        attemptCount: 3,
        targetWord: 'SPARKLE',
        wordPath: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 1, col: 3 },
          { row: 2, col: 3 },
          { row: 2, col: 4 },
        ],
      });

      expect(result.wordLength).toBe(7);
    });
  });

  describe('lengthAndStart level', () => {
    it('should return lengthAndStart hint data for 4 attempts', () => {
      const result = generateHint({
        attemptCount: 4,
        targetWord: 'MAGIC',
        wordPath: mockWordPath,
      });

      expect(result).toEqual({
        level: 'lengthAndStart',
        message: 'difficulty.hint.lengthAndStart',
        wordLength: 5,
        startLetter: 'M',
        highlightTiles: [{ row: 0, col: 0 }],
      });
    });

    it('should uppercase the start letter', () => {
      const result = generateHint({
        attemptCount: 4,
        targetWord: 'magic',
        wordPath: mockWordPath,
      });

      expect(result.startLetter).toBe('M');
    });

    it('should highlight only the first tile', () => {
      const result = generateHint({
        attemptCount: 4,
        targetWord: 'SPARKLE',
        wordPath: [
          { row: 2, col: 3 },
          { row: 1, col: 3 },
          { row: 0, col: 2 },
        ],
      });

      expect(result.highlightTiles).toEqual([{ row: 2, col: 3 }]);
    });
  });

  describe('fullReveal level', () => {
    it('should return fullReveal hint data for 5 attempts', () => {
      const result = generateHint({
        attemptCount: 5,
        targetWord: 'MAGIC',
        wordPath: mockWordPath,
      });

      expect(result).toEqual({
        level: 'fullReveal',
        message: 'difficulty.hint.fullReveal',
        wordLength: 5,
        targetWord: 'MAGIC',
        highlightTiles: mockWordPath,
      });
    });

    it('should uppercase the target word', () => {
      const result = generateHint({
        attemptCount: 5,
        targetWord: 'magic',
        wordPath: mockWordPath,
      });

      expect(result.targetWord).toBe('MAGIC');
    });

    it('should highlight all tiles in the path', () => {
      const fullPath = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
      ];

      const result = generateHint({
        attemptCount: 5,
        targetWord: 'SPARKL',
        wordPath: fullPath,
      });

      expect(result.highlightTiles).toEqual(fullPath);
      expect(result.highlightTiles?.length).toBe(6);
    });

    it('should return fullReveal for attempts beyond 5', () => {
      const result = generateHint({
        attemptCount: 10,
        targetWord: 'MAGIC',
        wordPath: mockWordPath,
      });

      expect(result.level).toBe('fullReveal');
      expect(result.targetWord).toBe('MAGIC');
    });
  });
});
