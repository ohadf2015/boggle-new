import { describe, it, expect } from 'vitest';
import { evaluateSvClue } from '../evaluateSvClue';

describe('Swedish crossword clue evaluator', () => {
  describe('example from spec', () => {
    it('rates "Gul frukt från varma länder" for "banan" as high (0.8+)', () => {
      const result = evaluateSvClue('banan', 'Gul frukt från varma länder');
      expect(result.score).toBeGreaterThanOrEqual(0.8);
      expect(result.reason.toLowerCase()).toContain('clever');
    });
  });

  describe('circular clues (answer echo)', () => {
    it('rejects "Frukt som är banan"', () => {
      const result = evaluateSvClue('banan', 'Frukt som är banan');
      expect(result.score).toBeLessThan(0.4);
      expect(result.reason).toMatch(/contains|echo/i);
    });

    it('rejects "Bananer är gula"', () => {
      const result = evaluateSvClue('banan', 'Bananer är gula');
      expect(result.score).toBeLessThan(0.4);
    });

    it('rejects "Banan växer i tropiska länder" (stem match)', () => {
      const result = evaluateSvClue('banan', 'Banan växer i tropiska länder');
      expect(result.score).toBeLessThan(0.4);
    });
  });

  describe('dictionary-like patterns', () => {
    it('penalizes "En frukt som är gul"', () => {
      const result = evaluateSvClue('banan', 'En frukt som är gul');
      expect(result.score).toBeLessThan(0.65);
      expect(result.reason).toMatch(/generic|formulaic/i);
    });

    it('penalizes very long definitions (60+ chars)', () => {
      const result = evaluateSvClue(
        'banan',
        'En gul frukt som växer i tropiska länder och är mycket populär som mat överallt i världen',
      );
      expect(result.score).toBeLessThan(0.5);
      expect(result.reason).toMatch(/long/i);
    });

    it('penalizes excessive "är" (is) usage', () => {
      const result = evaluateSvClue('jord', 'Är den planet vi lever på');
      expect(result.score).toBeLessThan(0.65);
    });
  });

  describe('clever indirection (high scorers)', () => {
    it('rewards geography clues: "Ligger i Atlanten"', () => {
      const result = evaluateSvClue('är', 'Ligger i Atlanten');
      expect(result.score).toBeGreaterThanOrEqual(0.75);
    });

    it('rewards usage clues: "Danskar dricker det"', () => {
      const result = evaluateSvClue('kaffe', 'Danskar dricker det');
      expect(result.score).toBeGreaterThanOrEqual(0.75);
    });

    it('rewards indirect color clues: "Röd frukt från Italien"', () => {
      const result = evaluateSvClue('tomat', 'Röd frukt från Italien');
      expect(result.score).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('length scoring', () => {
    it('rewards optimal length (20-40 chars)', () => {
      const result = evaluateSvClue('natt', 'När solen går ned');
      expect(result.score).toBeGreaterThanOrEqual(0.6);
    });

    it('penalizes very short clues (< 10 chars)', () => {
      const result = evaluateSvClue('katt', 'Husdjur');
      expect(result.score).toBeLessThan(0.55);
    });

    it('penalizes overly long clues (> 60 chars)', () => {
      const result = evaluateSvClue(
        'hjärta',
        'Органчеборгскому органе som pumpar blod genom kroppen och är vital för livet',
      );
      expect(result.score).toBeLessThan(0.5);
    });
  });

  describe('Swedish language quality', () => {
    it('accepts correct Swedish accents: "Älskad frukt"', () => {
      const result = evaluateSvClue('banan', 'Älskad frukt från tropikerna');
      expect(result.score).toBeGreaterThanOrEqual(0.65);
    });

    it('detects double spaces (typo)', () => {
      const result = evaluateSvClue('banan', 'Gul frukt  från varma länder');
      expect(result.score).toBeLessThan(0.6);
    });
  });

  describe('edge cases', () => {
    it('handles single-letter answers without crashing', () => {
      const result = evaluateSvClue('a', 'Första bokstaven');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('handles empty clue gracefully', () => {
      const result = evaluateSvClue('ord', '');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('handles case-insensitive matching', () => {
      const result = evaluateSvClue('BANAN', 'gul frukt från varma länder');
      expect(result.score).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('boundary scores', () => {
    it('returns score in [0, 1]', () => {
      const tests = [
        ['banan', 'Gul frukt från varma länder'],
        ['ord', 'Något man säger'],
        ['natt', 'Är motsatsen av dag'],
        ['', ''],
      ];

      for (const [answer, clue] of tests) {
        const result = evaluateSvClue(answer, clue);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result.reason).toBeTruthy();
      }
    });
  });

  describe('batch evaluation from clue bank', () => {
    // Simulate evaluating a sample of Swedish clues
    it('evaluates diverse clues consistently', () => {
      const samples = [
        // High-quality (should be 0.65+)
        { answer: 'sol', clue: 'Varm stjärna på himlen', expectMin: 0.65 },
        // Medium (should be 0.7+, this is a good indirect clue with "lever i")
        { answer: 'fisk', clue: 'Djur som lever i vattnet', expectMin: 0.7 },
        // Low (should be < 0.5, starts with generic "En dag är")
        { answer: 'dag', clue: 'En dag är en tidsperiod på 24 timmar', expectMin: 0, expectMax: 0.5 },
      ];

      for (const { answer, clue, expectMin, expectMax = 1 } of samples) {
        const result = evaluateSvClue(answer, clue);
        expect(result.score, `${answer}: "${clue}"`).toBeGreaterThanOrEqual(expectMin);
        expect(result.score, `${answer}: "${clue}"`).toBeLessThanOrEqual(expectMax);
      }
    });
  });
});

describe('spec example test', () => {
  it('evaluates "Himmelns färg på vacker dag" for "blått"', () => {
    const result = evaluateSvClue('blått', 'Himmelns färg på vacker dag');
    console.log(`blått: "${result.reason}" (score: ${result.score})`);
    expect(result.score).toBeGreaterThan(0.7); // Should be a good clue
  });
});
