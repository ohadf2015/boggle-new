import { vi, type Mock, type MockInstance } from 'vitest';
import { classifyWordSync, categorizeWord, CATEGORIES } from '../wordCategorizer';

// Mock Redis to avoid connection in tests
vi.mock('../../cache/redisCache', () => ({
  getCacheClient: () => null,
}));

describe('wordCategorizer', () => {
  describe('classifyWordSync', () => {
    // English seed words
    it('classifies English seed words correctly', () => {
      expect(classifyWordSync('cat', 'en')).toBe('animals');
      expect(classifyWordSync('bread', 'en')).toBe('food');
      expect(classifyWordSync('tree', 'en')).toBe('nature');
      expect(classifyWordSync('chair', 'en')).toBe('objects');
      expect(classifyWordSync('jump', 'en')).toBe('actions');
      expect(classifyWordSync('red', 'en')).toBe('colors');
      expect(classifyWordSync('hand', 'en')).toBe('body');
      expect(classifyWordSync('shirt', 'en')).toBe('clothes');
      expect(classifyWordSync('bed', 'en')).toBe('home');
      expect(classifyWordSync('wind', 'en')).toBe('weather');
    });

    // Hebrew seed words
    it('classifies Hebrew seed words correctly', () => {
      expect(classifyWordSync('חתול', 'he')).toBe('animals');
      expect(classifyWordSync('לחם', 'he')).toBe('food');
      expect(classifyWordSync('עץ', 'he')).toBe('nature');
      expect(classifyWordSync('אדום', 'he')).toBe('colors');
    });

    // Swedish seed words
    it('classifies Swedish seed words correctly', () => {
      expect(classifyWordSync('katt', 'sv')).toBe('animals');
      expect(classifyWordSync('bröd', 'sv')).toBe('food');
      expect(classifyWordSync('träd', 'sv')).toBe('nature');
    });

    // Japanese seed words
    it('classifies Japanese seed words correctly', () => {
      expect(classifyWordSync('ねこ', 'ja')).toBe('animals');
      expect(classifyWordSync('パン', 'ja')).toBe('food');
      expect(classifyWordSync('あか', 'ja')).toBe('colors');
    });

    // Spanish seed words
    it('classifies Spanish seed words correctly', () => {
      expect(classifyWordSync('gato', 'es')).toBe('animals');
      expect(classifyWordSync('pan', 'es')).toBe('food');
      expect(classifyWordSync('rojo', 'es')).toBe('colors');
    });

    // English suffix rules
    it('classifies English words via suffix rules', () => {
      expect(classifyWordSync('swordfish', 'en')).toBe('animals');
      expect(classifyWordSync('blueberry', 'en')).toBe('food');
      expect(classifyWordSync('driftwood', 'en')).toBe('nature');
    });

    // Unknown words return null (no hint shown)
    it('returns null for unknown words', () => {
      expect(classifyWordSync('xyz', 'en')).toBeNull();
      expect(classifyWordSync('qwerty', 'en')).toBeNull();
      expect(classifyWordSync('מילהלאידועה', 'he')).toBeNull();
    });

    // Case insensitive
    it('is case-insensitive', () => {
      expect(classifyWordSync('CAT', 'en')).toBe('animals');
      expect(classifyWordSync('Dog', 'en')).toBe('animals');
    });

    // Cross-language English fallback
    it('falls back to English seeds for transliterated words', () => {
      // "fish" is English but might appear in non-EN dictionaries
      expect(classifyWordSync('fish', 'sv')).toBe('animals');
    });
  });

  describe('categorizeWord (async)', () => {
    it('returns same results as sync when Redis unavailable', async () => {
      expect(await categorizeWord('cat', 'en')).toBe('animals');
      expect(await categorizeWord('xyz', 'en')).toBeNull();
      expect(await categorizeWord('חתול', 'he')).toBe('animals');
    });
  });

  describe('CATEGORIES constant', () => {
    it('has 10 categories', () => {
      expect(CATEGORIES).toHaveLength(10);
    });
  });
});
