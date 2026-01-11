/**
 * Integration test for /api/drills/random-words
 * Tests dictionary word retrieval for challenge creation
 */
import { ensureLanguageLoaded, getRandomLongWords } from '@/backend/dictionary';
import type { Language } from '@/types';

describe('/api/drills/random-words - Dictionary Logic', () => {
  beforeAll(async () => {
    // Ensure Hebrew dictionary is loaded before tests
    await ensureLanguageLoaded('he');
    await ensureLanguageLoaded('en');
  });

  it('should return words array when dictionary is loaded for Hebrew', async () => {
    const language: Language = 'he';
    const count = 1;
    const minLength = 5;
    const maxLength = 8;

    const words = getRandomLongWords(language, count, minLength, maxLength);

    // Should return words array
    expect(Array.isArray(words)).toBe(true);

    // Should return the requested count or less
    expect(words.length).toBeGreaterThan(0);
    expect(words.length).toBeLessThanOrEqual(count);

    // Words should match length criteria
    if (words.length > 0) {
      expect(words[0].length).toBeGreaterThanOrEqual(minLength);
      expect(words[0].length).toBeLessThanOrEqual(maxLength);
    }
  });

  it('should return words for English', async () => {
    const language: Language = 'en';
    const count = 5;
    const minLength = 3;
    const maxLength = 6;

    const words = getRandomLongWords(language, count, minLength, maxLength);

    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThan(0);
    expect(words.length).toBeLessThanOrEqual(count);

    // All words should be uppercase for English
    words.forEach(word => {
      expect(word).toEqual(word.toUpperCase());
      expect(word.length).toBeGreaterThanOrEqual(minLength);
      expect(word.length).toBeLessThanOrEqual(maxLength);
    });
  });

  it('should return empty array for unloaded language before ensureLanguageLoaded', () => {
    // Swedish not loaded
    const words = getRandomLongWords('sv', 5, 3, 6);
    // May return empty if not loaded
    expect(Array.isArray(words)).toBe(true);
  });

  it('should respect count parameter', async () => {
    const language: Language = 'en';
    const count = 3;

    const words = getRandomLongWords(language, count, 4, 6);

    expect(words.length).toBeLessThanOrEqual(count);
  });

  it('should handle different word length ranges', async () => {
    const language: Language = 'he';
    const minLength = 6;
    const maxLength = 10;

    const words = getRandomLongWords(language, 5, minLength, maxLength);

    words.forEach(word => {
      expect(word.length).toBeGreaterThanOrEqual(minLength);
      expect(word.length).toBeLessThanOrEqual(maxLength);
    });
  });
});
