/**
 * Adaptive Difficulty (Zone of Proximal Development) Tests
 *
 * Tests for the ZPD-based adaptive difficulty system that sequences vocabulary
 * words at the right challenge level for each student.
 */

import {
  scoreWordDifficulty,
  assessZPD,
  sequenceWords,
  type DifficultyLevel,
  type ZPDAssessment,
} from '../adaptiveDifficulty';

describe('scoreWordDifficulty', () => {
  describe('easy words', () => {
    it('classifies short word with low error rate as easy', () => {
      const result = scoreWordDifficulty('cat', 0.1, 1.2);
      expect(result.level).toBe('easy');
    });

    it('returns difficultyScore between 0 and 1', () => {
      const result = scoreWordDifficulty('cat', 0.0, 1.0);
      expect(result.difficultyScore).toBeGreaterThanOrEqual(0);
      expect(result.difficultyScore).toBeLessThanOrEqual(1);
    });

    it('preserves the word field', () => {
      const result = scoreWordDifficulty('banana', 0.2, 1.5);
      expect(result.word).toBe('banana');
    });
  });

  describe('hard words', () => {
    it('classifies long word with high error rate as hard', () => {
      const result = scoreWordDifficulty('incomprehensible', 0.9, 4.0);
      expect(result.level).toBe('hard');
    });

    it('short word with very high error rate can be medium or hard', () => {
      const result = scoreWordDifficulty('cat', 0.95, 5.0);
      expect(['medium', 'hard']).toContain(result.level);
    });
  });

  describe('medium words', () => {
    it('classifies medium-length word with moderate error rate as medium', () => {
      const result = scoreWordDifficulty('orange', 0.4, 2.0);
      expect(result.level).toBe('medium');
    });
  });

  describe('masteryProbability', () => {
    it('returns masteryProbability between 0 and 1', () => {
      const result = scoreWordDifficulty('test', 0.5, 2.5);
      expect(result.masteryProbability).toBeGreaterThanOrEqual(0);
      expect(result.masteryProbability).toBeLessThanOrEqual(1);
    });

    it('easy words have higher mastery probability than hard words', () => {
      const easy = scoreWordDifficulty('cat', 0.05, 1.1);
      const hard = scoreWordDifficulty('photosynthesis', 0.85, 4.5);
      expect(easy.masteryProbability).toBeGreaterThan(hard.masteryProbability);
    });
  });

  describe('word length factor', () => {
    it('uses word.length when wordLength param is not provided', () => {
      const withoutParam = scoreWordDifficulty('hello', 0.3, 2.0);
      const withParam = scoreWordDifficulty('hello', 0.3, 2.0, 5);
      expect(withoutParam.difficultyScore).toBeCloseTo(withParam.difficultyScore, 5);
    });

    it('longer wordLength increases difficulty', () => {
      const short = scoreWordDifficulty('hi', 0.3, 2.0, 2);
      const long = scoreWordDifficulty('hi', 0.3, 2.0, 15);
      expect(long.difficultyScore).toBeGreaterThan(short.difficultyScore);
    });
  });
});

describe('assessZPD', () => {
  describe('shouldChallenge flag', () => {
    it('sets shouldChallenge = true when accuracy > 85% and high mastery', () => {
      const zpd = assessZPD(0.9, 70, 100);
      expect(zpd.shouldChallenge).toBe(true);
    });

    it('does not challenge when accuracy is low', () => {
      const zpd = assessZPD(0.4, 70, 100);
      expect(zpd.shouldChallenge).toBe(false);
    });
  });

  describe('shouldEaseOff flag', () => {
    it('sets shouldEaseOff = true when accuracy < 40%', () => {
      const zpd = assessZPD(0.35, 10, 100);
      expect(zpd.shouldEaseOff).toBe(true);
    });

    it('does not ease off when accuracy is adequate', () => {
      const zpd = assessZPD(0.7, 30, 100);
      expect(zpd.shouldEaseOff).toBe(false);
    });
  });

  describe('currentMasteryLevel', () => {
    it('calculates mastery fraction correctly', () => {
      const zpd = assessZPD(0.7, 30, 100);
      expect(zpd.currentMasteryLevel).toBeCloseTo(0.3, 5);
    });

    it('returns 0 when no words mastered', () => {
      const zpd = assessZPD(0.7, 0, 50);
      expect(zpd.currentMasteryLevel).toBe(0);
    });

    it('returns 1 when all words mastered', () => {
      const zpd = assessZPD(0.7, 50, 50);
      expect(zpd.currentMasteryLevel).toBe(1);
    });
  });

  describe('recommendedDifficulty', () => {
    it('recommends easy when student is struggling', () => {
      const zpd = assessZPD(0.2, 5, 100);
      expect(zpd.recommendedDifficulty).toBe('easy');
    });

    it('recommends hard when student is breezing through', () => {
      const zpd = assessZPD(0.92, 80, 100);
      expect(zpd.recommendedDifficulty).toBe('hard');
    });

    it('recommends medium for average performance', () => {
      const zpd = assessZPD(0.65, 40, 100);
      expect(zpd.recommendedDifficulty).toBe('medium');
    });
  });
});

describe('sequenceWords', () => {
  const mockWords = [
    { word: 'cat', errorRate: 0.05, avgAttempts: 1.1 },
    { word: 'orange', errorRate: 0.45, avgAttempts: 2.2 },
    { word: 'photosynthesis', errorRate: 0.85, avgAttempts: 4.5 },
    { word: 'banana', errorRate: 0.15, avgAttempts: 1.3 },
  ];

  it('excludes already mastered words', () => {
    const zpd: ZPDAssessment = {
      currentMasteryLevel: 0.5,
      recommendedDifficulty: 'medium',
      nextWords: [],
      shouldEaseOff: false,
      shouldChallenge: false,
    };
    const result = sequenceWords(mockWords, zpd, ['cat', 'banana']);
    expect(result).not.toContain('cat');
    expect(result).not.toContain('banana');
  });

  it('returns non-mastered words', () => {
    const zpd: ZPDAssessment = {
      currentMasteryLevel: 0.5,
      recommendedDifficulty: 'medium',
      nextWords: [],
      shouldEaseOff: false,
      shouldChallenge: false,
    };
    const result = sequenceWords(mockWords, zpd, ['cat']);
    expect(result).toContain('orange');
    expect(result).toContain('photosynthesis');
    expect(result).toContain('banana');
  });

  it('puts easier words first when shouldEaseOff is true', () => {
    const zpd: ZPDAssessment = {
      currentMasteryLevel: 0.1,
      recommendedDifficulty: 'easy',
      nextWords: [],
      shouldEaseOff: true,
      shouldChallenge: false,
    };
    const result = sequenceWords(mockWords, zpd, []);
    // cat (easy) should appear before photosynthesis (hard)
    const catIdx = result.indexOf('cat');
    const hardIdx = result.indexOf('photosynthesis');
    expect(catIdx).toBeLessThan(hardIdx);
  });

  it('puts harder words first when shouldChallenge is true', () => {
    const zpd: ZPDAssessment = {
      currentMasteryLevel: 0.9,
      recommendedDifficulty: 'hard',
      nextWords: [],
      shouldEaseOff: false,
      shouldChallenge: true,
    };
    const result = sequenceWords(mockWords, zpd, []);
    // photosynthesis (hard) should appear before cat (easy)
    const catIdx = result.indexOf('cat');
    const hardIdx = result.indexOf('photosynthesis');
    expect(hardIdx).toBeLessThan(catIdx);
  });

  it('returns empty array when all words are mastered', () => {
    const zpd: ZPDAssessment = {
      currentMasteryLevel: 1.0,
      recommendedDifficulty: 'medium',
      nextWords: [],
      shouldEaseOff: false,
      shouldChallenge: false,
    };
    const result = sequenceWords(mockWords, zpd, mockWords.map(w => w.word));
    expect(result).toEqual([]);
  });

  it('handles words without errorRate/avgAttempts by using defaults', () => {
    const zpd: ZPDAssessment = {
      currentMasteryLevel: 0.5,
      recommendedDifficulty: 'medium',
      nextWords: [],
      shouldEaseOff: false,
      shouldChallenge: false,
    };
    const wordsWithoutStats = [{ word: 'unknown' }];
    expect(() => sequenceWords(wordsWithoutStats, zpd, [])).not.toThrow();
    const result = sequenceWords(wordsWithoutStats, zpd, []);
    expect(result).toContain('unknown');
  });
});
