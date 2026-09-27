/**
 * Tests for Wikipedia Word Processor
 */

import {
  validateGameWord,
  normalizeWord,
  calculateInterestingnessScore,
  rankWordsByInterest,
  selectBestWord
} from '../wikipediaWordProcessor';

describe('WikipediaWordProcessor', () => {
  describe('validateGameWord', () => {
    describe('English words', () => {
      it('should accept valid 4-6 letter English words', () => {
        const result = validateGameWord('CASTLE', 'en');
        expect(result.valid).toBe(true);
        expect(result.normalizedWord).toBe('CASTLE');
      });

      it('should reject 3-letter English words', () => {
        const result = validateGameWord('CAT', 'en');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('at least 4');
      });

      it('should reject words longer than 6 letters', () => {
        const result = validateGameWord('EXTREME', 'en');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('at most 6');
      });

      it('should reject words with numbers', () => {
        const result = validateGameWord('WO123', 'en');
        expect(result.valid).toBe(false);
        // May fail on character set or numbers check
        expect(result.reason).toMatch(/invalid characters|numbers/);
      });

      it('should reject words with spaces', () => {
        const result = validateGameWord('NE YO', 'en');
        expect(result.valid).toBe(false);
        // May fail on character set or single word check
        expect(result.reason).toMatch(/invalid characters|single word/);
      });

      it('should reject words with hyphens', () => {
        const result = validateGameWord('WE-LL', 'en');
        expect(result.valid).toBe(false);
        // May fail on length, character set, or single word check
        expect(result.reason).toMatch(/invalid characters|single word|at most 6/);
      });
    });

    describe('Hebrew words', () => {
      it('should accept valid 4-6 character Hebrew words', () => {
        const result = validateGameWord('שלומי', 'he');
        expect(result.valid).toBe(true);
      });

      it('should reject 3-character Hebrew words', () => {
        const result = validateGameWord('בית', 'he');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('at least 4');
      });

      it('should reject mixed Hebrew and Latin characters', () => {
        const result = validateGameWord('שלוםHello', 'he');
        expect(result.valid).toBe(false);
        // May fail on length or character set check
        expect(result.reason).toMatch(/invalid characters|at most 6/);
      });
    });

    describe('Japanese words', () => {
      it('should accept 2+ character Japanese words', () => {
        const result = validateGameWord('東京', 'ja');
        expect(result.valid).toBe(true);
      });

      it('should accept 3-character Japanese words', () => {
        const result = validateGameWord('日本語', 'ja');
        expect(result.valid).toBe(true);
      });

      it('should reject 5+ character Japanese words', () => {
        const result = validateGameWord('日本語学校生', 'ja');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('at most 4');
      });
    });

    describe('Swedish words', () => {
      it('should accept words with Swedish special characters', () => {
        const result = validateGameWord('FÅGEL', 'sv');
        expect(result.valid).toBe(true);
      });

      it('should reject 3-letter Swedish words', () => {
        const result = validateGameWord('DAG', 'sv');
        expect(result.valid).toBe(false);
      });
    });

    describe('Spanish words', () => {
      it('should accept words with Spanish accents', () => {
        const result = validateGameWord('MAÑANA', 'es');
        expect(result.valid).toBe(true);
      });

      it('should accept words with ñ', () => {
        const result = validateGameWord('NIÑO', 'es');
        expect(result.valid).toBe(true);
      });
    });

    describe('French words', () => {
      it('should accept words with French accents', () => {
        const result = validateGameWord('ÉTOILE', 'fr');
        expect(result.valid).toBe(true);
      });

      it('should accept words with cedilla', () => {
        const result = validateGameWord('GARÇON', 'fr');
        expect(result.valid).toBe(true);
      });
    });

    describe('German words', () => {
      it('should accept words with umlauts', () => {
        const result = validateGameWord('GÄRTEN', 'de');
        expect(result.valid).toBe(true);
      });

      it('should accept words with ß', () => {
        const result = validateGameWord('GROẞ', 'de');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('normalizeWord', () => {
    it('should convert English words to uppercase', () => {
      expect(normalizeWord('mountain', 'en')).toBe('MOUNTAIN');
    });

    it('should trim whitespace', () => {
      expect(normalizeWord('  WORD  ', 'en')).toBe('WORD');
    });

    it('should normalize Hebrew final letters', () => {
      // ך → כ, ם → מ, ן → נ, ף → פ, ץ → צ
      expect(normalizeWord('שלום', 'he')).toBe('שלומ'); // ם → מ
    });

    it('should not modify Japanese words', () => {
      expect(normalizeWord('東京', 'ja')).toBe('東京');
    });
  });

  describe('calculateInterestingnessScore', () => {
    it('should give higher scores to TFA words', () => {
      const tfaScore = calculateInterestingnessScore('AURORA', 'en', 'tfa');
      const randomScore = calculateInterestingnessScore('AURORA', 'en', 'random');

      expect(tfaScore).toBeGreaterThan(randomScore);
    });

    it('should penalize overused words', () => {
      const overusedScore = calculateInterestingnessScore('TREE', 'en', 'tfa');
      const uniqueScore = calculateInterestingnessScore('AURORA', 'en', 'tfa');

      expect(uniqueScore).toBeGreaterThan(overusedScore);
    });

    it('should reward character variety', () => {
      // AURORA has 5 unique chars out of 6
      // MAMMAM has 2 unique chars out of 6
      const variedScore = calculateInterestingnessScore('AURORA', 'en', 'tfa');
      const repetitiveScore = calculateInterestingnessScore('BANANA', 'en', 'tfa');

      expect(variedScore).toBeGreaterThan(repetitiveScore);
    });

    it('should reward longer words', () => {
      const longScore = calculateInterestingnessScore('MOUNTAIN', 'en', 'tfa');
      const shortScore = calculateInterestingnessScore('HILL', 'en', 'tfa');

      expect(longScore).toBeGreaterThan(shortScore);
    });

    it('should keep score within bounds', () => {
      const score = calculateInterestingnessScore('TEST', 'en', 'random');

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('rankWordsByInterest', () => {
    it('should return words sorted by score descending', () => {
      const candidates = [
        { word: 'TREE', source: 'random' },
        { word: 'AURORA', source: 'tfa' },
        { word: 'MOUNTAIN', source: 'mostread' }
      ];

      const ranked = rankWordsByInterest(candidates, 'en');

      expect(ranked.length).toBeGreaterThan(0);
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
      }
    });

    it('should filter out invalid words', () => {
      const candidates = [
        { word: 'CAT', source: 'tfa' }, // Too short
        { word: 'AURORA', source: 'tfa' }, // Valid
        { word: 'A B C', source: 'tfa' } // Has spaces
      ];

      const ranked = rankWordsByInterest(candidates, 'en');

      expect(ranked.length).toBe(1);
      expect(ranked[0].word).toBe('AURORA');
    });

    it('should remove duplicates', () => {
      const candidates = [
        { word: 'AURORA', source: 'tfa' },
        { word: 'aurora', source: 'mostread' }, // Duplicate (case-insensitive)
        { word: 'MOUNTAIN', source: 'onthisday' }
      ];

      const ranked = rankWordsByInterest(candidates, 'en');

      const auroraCount = ranked.filter(w => w.word === 'AURORA').length;
      expect(auroraCount).toBe(1);
    });
  });

  describe('selectBestWord', () => {
    it('should select the first word not in exclude set', () => {
      const rankedWords = [
        { word: 'AURORA', score: 80, source: 'tfa' },
        { word: 'MOUNTAIN', score: 75, source: 'tfa' },
        { word: 'CASTLE', score: 70, source: 'tfa' }
      ];

      const excludeWords = new Set(['AURORA']);
      const selected = selectBestWord(rankedWords, excludeWords);

      expect(selected?.word).toBe('MOUNTAIN');
    });

    it('should return null if all words are excluded', () => {
      const rankedWords = [
        { word: 'AURORA', score: 80, source: 'tfa' }
      ];

      const excludeWords = new Set(['AURORA']);
      const selected = selectBestWord(rankedWords, excludeWords);

      expect(selected).toBeNull();
    });

    it('should select first word if no exclusions', () => {
      const rankedWords = [
        { word: 'AURORA', score: 80, source: 'tfa' },
        { word: 'MOUNTAIN', score: 75, source: 'tfa' }
      ];

      const selected = selectBestWord(rankedWords);

      expect(selected?.word).toBe('AURORA');
    });
  });
});
