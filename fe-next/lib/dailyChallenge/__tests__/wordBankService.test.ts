import { vi, type Mock, } from 'vitest';
/**
 * Word Bank Service Tests
 *
 * Tests for Wikipedia word import functionality with language-specific
 * length filtering requirements.
 *
 * Requirements (must mirror the DB check_word_length constraint,
 * migration 20260625000000_enforce_word_hunt_target_5to7):
 * - Filter words by language-specific length constraints
 * - Japanese: min 2, max 4 characters
 * - Other languages: min 5, max 7 characters
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

    it('should filter out words shorter than 5 characters', async () => {
      const words = ['cat', 'test', 'hello', 'wonder']; // 3, 4, 5, 6 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert words with 5+ characters (hello, wonder = 2 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(2);

      // Verify the words passed were the valid ones
      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['HELLO', 'WONDER']);
    });

    it('should filter out words longer than 7 characters', async () => {
      const words = ['hello', 'wonder', 'awesome', 'wonderful', 'extraordinary']; // 5, 6, 7, 9, 13 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert words with 5-7 characters (hello, wonder, awesome = 3 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['HELLO', 'WONDER', 'AWESOME']);
    });

    it('should pass all valid words (5-7 characters)', async () => {
      const words = ['hello', 'world', 'wonder', 'awesome']; // 5, 5, 6, 7 chars

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // All words should be upserted
      expect(mockUpsert).toHaveBeenCalledTimes(4);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['HELLO', 'WORLD', 'WONDER', 'AWESOME']);
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

    it('should filter words by Hebrew length requirements (5-7 chars)', async () => {
      // 4, 5, 6, 8 chars — 4-char 'מילה' and 8-char 'אוקיינוס' rejected
      const words = ['מילה', 'שלושה', 'מכונית', 'אוקיינוס'];

      await importWikipediaWordsToBank(mockSupabaseClient, language, words);

      // Should only upsert 5-7 char words (שלושה, מכונית = 2 calls)
      expect(mockUpsert).toHaveBeenCalledTimes(2);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['שלושה', 'מכונית']);
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
      const words = ['a', 'b', 'c']; // All too short for English (min 5)

      await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should normalize words to uppercase before checking length', async () => {
      const words = ['Hello', 'WORLD', 'WoNdEr']; // Mixed case, all 5-6 chars

      await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      // All words should pass (normalization doesn't affect length check)
      expect(mockUpsert).toHaveBeenCalledTimes(3);

      const upsertedWords = mockUpsert.mock.calls.map(call => call[0].word);
      expect(upsertedWords).toEqual(['HELLO', 'WORLD', 'WONDER']);
    });
  });

  describe('Source parameter', () => {
    it('should always use "wikipedia" as the source', async () => {
      const words = ['hello', 'world'];

      await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      // Check all upsert calls have source: 'wikipedia'
      mockUpsert.mock.calls.forEach(call => {
        expect(call[0].source).toBe('wikipedia');
      });
    });
  });

  describe('Return value', () => {
    it('should return correct counts', async () => {
      const words = ['hello', 'world', 'wonder', 'awesome']; // 5, 5, 6, 7 chars

      const result = await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      expect(result.inserted).toBe(4);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should pre-filter invalid words (skipped count is always 0 due to pre-filtering)', async () => {
      const words = ['a', 'b', 'hello', 'wonder']; // 2 too short, 2 valid

      const result = await importWikipediaWordsToBank(mockSupabaseClient, 'en', words);

      // Pre-filtering removes 'a' and 'b' before they reach importWordsFromDictionary
      // So only 'hello' and 'wonder' are processed
      expect(result.inserted).toBe(2);
      expect(result.skipped).toBe(0); // Pre-filtered words don't count as "skipped"
      expect(result.errors).toBe(0);

      // Verify only valid words were upserted
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      const words = ['hello', 'world'];

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
      // Verify the expected length ranges are configured (mirror DB check_word_length)
      expect(WORD_LENGTH_RANGE.en).toEqual({ min: 5, max: 7 });
      expect(WORD_LENGTH_RANGE.he).toEqual({ min: 5, max: 7 });
      expect(WORD_LENGTH_RANGE.sv).toEqual({ min: 5, max: 7 });
      expect(WORD_LENGTH_RANGE.ja).toEqual({ min: 2, max: 4 });
      expect(WORD_LENGTH_RANGE.es).toEqual({ min: 5, max: 7 });
    });

    it('should apply different length filters for different languages', async () => {
      // English: min 5, so 'cat' (3) is filtered, only 'hello' (5) passes
      await importWikipediaWordsToBank(mockSupabaseClient, 'en', ['cat', 'hello']);
      expect(mockUpsert).toHaveBeenCalledTimes(1); // Only 'hello'

      vi.clearAllMocks();

      // Japanese: min 2, so single char should be filtered
      await importWikipediaWordsToBank(mockSupabaseClient, 'ja', ['猫', '人間']);
      expect(mockUpsert).toHaveBeenCalledTimes(1); // Only '人間'
    });
  });
});
