/**
 * Test: Daily Challenge Word Hunt minimum length validation
 *
 * Two distinct minimums:
 * 1. Target word: 5+ letters for non-Japanese, 2+ for Japanese
 * 2. Discovery words: 2+ letters for ALL languages
 *
 * TARGET_WORD_LISTS should not contain words shorter than the target minimum.
 */

import { MIN_ANSWER_LENGTH, MIN_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';
import { TARGET_WORD_LISTS } from '@/utils/dailyChallenge/wordLists';

describe('Word Hunt Minimum Length Requirements', () => {
  describe('Target word minimums (MIN_ANSWER_LENGTH)', () => {
    it('should require 5+ letters for English target words', () => {
      expect(MIN_ANSWER_LENGTH.en).toBeGreaterThanOrEqual(5);
    });

    it('should require 5+ letters for Hebrew target words', () => {
      expect(MIN_ANSWER_LENGTH.he).toBeGreaterThanOrEqual(5);
    });

    it('should require 5+ letters for Swedish target words', () => {
      expect(MIN_ANSWER_LENGTH.sv).toBeGreaterThanOrEqual(5);
    });

    it('should require 5+ letters for Spanish target words', () => {
      expect(MIN_ANSWER_LENGTH.es).toBeGreaterThanOrEqual(5);
    });

    it('should allow 2+ letters for Japanese target words (kanji exception)', () => {
      expect(MIN_ANSWER_LENGTH.ja).toBe(2);
    });
  });

  describe('Discovery word minimum (MIN_DISCOVERY_WORD_LENGTH)', () => {
    it('should be 2 letters for all languages', () => {
      expect(MIN_DISCOVERY_WORD_LENGTH).toBe(2);
    });

    it('should be less than or equal to target minimum for all languages', () => {
      for (const [, minLen] of Object.entries(MIN_ANSWER_LENGTH)) {
        expect(MIN_DISCOVERY_WORD_LENGTH).toBeLessThanOrEqual(minLen);
      }
    });
  });

  describe('TARGET_WORD_LISTS respect minimum lengths', () => {
    const nonJapaneseLanguages = ['en', 'sv', 'es', 'he'] as const;

    it.each(nonJapaneseLanguages)(
      'should not contain words shorter than 5 letters for %s',
      (lang) => {
        const words = TARGET_WORD_LISTS[lang] || [];
        const tooShort = words.filter(w => w.length < 5);
        expect(tooShort).toEqual([]);
      }
    );

    it('should allow 2+ letter words for Japanese', () => {
      const words = TARGET_WORD_LISTS['ja'] || [];
      const tooShort = words.filter(w => w.length < 2);
      expect(tooShort).toEqual([]);
    });
  });
});
