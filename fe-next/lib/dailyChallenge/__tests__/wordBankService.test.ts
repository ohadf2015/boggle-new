import { vi, type Mock, } from 'vitest';
/**
 * Word Bank Service Tests
 *
 * Tests for Wikipedia word import functionality with language-specific
 * length filtering requirements.
 *
 * Requirements:
 * - Filter words by language-specific length constraints
 * - Japanese: min 2, max 4 characters
 * - Other languages: min 4, max 8 characters
 * - Use 'wikipedia' as source
 */

import { importWikipediaWordsToBank, WORD_LENGTH_RANGE } from '../wordBankService';
import type { Language } from '@/types';

// Mock Supabase
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

const mockSupabaseClient = {
  from: mockFrom,
} as any;

describe('importWikipediaWordsToBank', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behavior for Supabase
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    mockUpsert.mockResolvedValue({
      error: null,
      data: null,
    });
  });

  describe('Length filtering for English', () => {
    const language: Language = 'en';

    it('should filter out words shorter than 4 characters', async () => {
      const words = ['cat', 'dog', 'bird', 'test', 'hello']; // 3, 3, 4, 4, 5 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert words with 4+ characters (bird, test, hello = 3 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      // Verify the words passed were the valid ones
      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['BIRD', 'TEST', 'HELLO']);
    });

    it('should filter out words longer than 6 characters', async () => {
      const words = ['test', 'hello', 'wonder', 'wonderful', 'extraordinary']; // 4, 5, 6, 9, 13 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert words with 4-6 characters (test, hello, wonder = 3 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['TEST', 'HELLO', 'WONDER']);
    });

    it('should pass all valid words (4-6 characters)', async () => {
      const words = ['test', 'hello', 'world', 'wonder']; // 4, 5, 5, 6 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // All words should be upserted
      expect(mockUpsert).toHaveBeenCalledTimes(4);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['TEST', 'HELLO', 'WORLD', 'WONDER']);
    });
  });

  describe('Length filtering for Japanese', () => {
    const language: Language = 'ja';

    it('should filter out words shorter than 2 characters', async () => {
      const words = ['猫', '犬', '鳥', '人間']; // 1, 1, 1, 2 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert words with 2+ characters (人間 = 1 call)
      expect(mockUpsert).toHaveBeenCalledTimes(1);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['人間']);
    });

    it('should filter out words longer than 4 characters', async () => {
      const words = ['人間', '動物', '植物園']; // 2, 2, 3 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // All words are 2-4 chars, so all should be upserted
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['人間', '動物', '植物園']);
    });

    it('should filter based on Japanese length range (2-4 chars)', async () => {
      const words = ['猫', '人間', '動物', '植物', '植物園']; // 1, 2, 2, 2, 3 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should upsert 2-4 char words (人間, 動物, 植物, 植物園 = 4 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(4);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['人間', '動物', '植物', '植物園']);
    });
  });

  describe('Length filtering for Hebrew', () => {
    const language: Language = 'he';

    it('should filter words by Hebrew length requirements (4-6 chars)', async () => {
      // 3, 3, 4, 4, 5, 8 chars — 8-char 'אוקיינוס' must be rejected per gameplay cap
      const words = ['אני', 'אמא', 'מילה', 'תפוח', 'שלושה', 'אוקיינוס'];

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert 4-6 char words (מילה, תפוח, שלושה = 3 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['מילה', 'תפוח', 'שלושה']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty word array', async () => {
      const result = await importWikipediaWordsToBank(mockSupabaseClient, 'en', []);

      expect(mockUpsert).not.toHaveBeenCalled();
      expect(result.inserted).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle array with all invalid words', async () => {
      const words = ['a', 'b', 'c']; // All too short for English (min 4)

      await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should normalize words to uppercase before checking length', async () => {
      const words = ['Test', 'HELLO', 'WoRlD']; // Mixed case, all 4-5 chars

      await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      // All words should pass (normalization doesn't affect length check)
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['TEST', 'HELLO', 'WORLD']);
    });
  });

  describe('Source parameter', () => {
    it('should always use "wikipedia" as the source', async () => {
      const words = ['test', 'hello'];

      await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      // Check all upsert calls have source: 'wikipedia'
      mockUpsert.mock.calls.forEach(call => {
        expect(call[0].source).toBe('wikipedia');
      });
    });
  });

  describe('Return value', () => {
    it('should return correct counts', async () => {
      const words = ['test', 'hello', 'world', 'wonder'];

      const result = await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      expect(result.inserted).toBe(4);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should pre-filter invalid words (skipped count is always 0 due to pre-filtering)', async () => {
      const words = ['a', 'b', 'test', 'hello']; // 2 too short, 2 valid

      const result = await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      // Pre-filtering removes 'a' and 'b' before they reach importWordsFromDictionary
      // So only 'test' and 'hello' are processed
      expect(result.inserted).toBe(2);
      expect(result.skipped).toBe(0); // Pre-filtered words don't count as "skipped"
      expect(result.errors).toBe(0);

      // Verify only valid words were upserted
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      const words = ['test', 'hello'];

      // Make first upsert fail
      mockUpsert.mockResolvedValueOnce({ error: { message: 'DB error' }, data: null });
      mockUpsert.mockResolvedValueOnce({ error: null, data: null });

      const result = await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      expect(result.inserted).toBe(1); // Only second succeeded
      expect(result.errors).toBe(1); // First failed
    });
  });

  describe('Language-specific length ranges', () => {
    it('should respect WORD_LENGTH_RANGE configuration', () => {
      // Verify the expected length ranges are configured
      expect(WORD_LENGTH_RANGE.en).toEqual({ min: 4, max: 6 });
      expect(WORD_LENGTH_RANGE.he).toEqual({ min: 4, max: 6 });
      expect(WORD_LENGTH_RANGE.sv).toEqual({ min: 4, max: 6 });
      expect(WORD_LENGTH_RANGE.ja).toEqual({ min: 2, max: 4 });
      expect(WORD_LENGTH_RANGE.es).toEqual({ min: 4, max: 6 });
    });

    it('should apply different length filters for different languages', async () => {
      // English: min 4, so 'cat' should be filtered
      await importWikipediaWordsToBank(mockSupabaseClient, 'en', ['cat', 'test']);
      expect(mockUpsert).toHaveBeenCalledTimes(1); // Only 'test'

      vi.clearAllMocks();

      // Japanese: min 2, so single char should be filtered
      await importWikipediaWordsToBank(mockSupabaseClient, 'ja', ['猫', '人間']);
      expect(mockUpsert).toHaveBeenCalledTimes(1); // Only '人間'
    });
  });
});
