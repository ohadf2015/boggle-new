/**
 * Tests for Word Frequency / Rarity System
 */

import { getWordRarity, getRarityMultiplier, type WordRarity } from '../wordFrequency';

describe('getWordRarity', () => {
  describe('common words', () => {
    it('should classify short common words as common', () => {
      expect(getWordRarity('THE')).toBe('common');
      expect(getWordRarity('AND')).toBe('common');
      expect(getWordRarity('CAT')).toBe('common');
    });

    it('should classify 4-letter common words as common', () => {
      expect(getWordRarity('TREE')).toBe('common');
      expect(getWordRarity('DOOR')).toBe('common');
    });
  });

  describe('uncommon words', () => {
    it('should classify longer words as uncommon', () => {
      expect(getWordRarity('CASTLE')).toBe('uncommon');
      expect(getWordRarity('SIMPLE')).toBe('uncommon');
    });
  });

  describe('rare words', () => {
    it('should classify words with rare letters as rare', () => {
      expect(getWordRarity('JINX')).toBe('rare');
      expect(getWordRarity('VIXEN')).toBe('rare');
    });

    it('should classify long words as at least uncommon', () => {
      const rarity = getWordRarity('EXPLORING');
      expect(['uncommon', 'rare', 'epic']).toContain(rarity);
    });
  });

  describe('epic words', () => {
    it('should classify words with multiple high-rarity letters as epic', () => {
      // QUIZ: Q(10)+U(2)+I(0)+Z(10)=22
      expect(getWordRarity('QUIZ')).toBe('epic');
    });

    it('should classify long words with rare letters as epic', () => {
      expect(getWordRarity('QUIZZIFY')).toBe('epic');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(getWordRarity('')).toBe('common');
    });

    it('should handle single letter', () => {
      expect(getWordRarity('A')).toBe('common');
    });

    it('should be case insensitive', () => {
      expect(getWordRarity('quiz')).toBe(getWordRarity('QUIZ'));
    });
  });
});

describe('getRarityMultiplier', () => {
  it('should return 1.0 for common', () => {
    expect(getRarityMultiplier('common')).toBe(1.0);
  });

  it('should return 1.25 for uncommon', () => {
    expect(getRarityMultiplier('uncommon')).toBe(1.25);
  });

  it('should return 1.5 for rare', () => {
    expect(getRarityMultiplier('rare')).toBe(1.5);
  });

  it('should return 2.0 for epic', () => {
    expect(getRarityMultiplier('epic')).toBe(2.0);
  });
});
