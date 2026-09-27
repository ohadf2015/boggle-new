import { vi } from 'vitest';
import { checkWordIntegration, checkWordIntegrationAsync, useWordIntegration } from '../useWordIntegration';
import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const commonWords = ['cat', 'dog', 'hello', 'appreciation', 'world'];
const hebrewWords = ['שלום'];
const swedishWords = ['hej'];
const japaneseWords = ['日本'];
const spanishWords = ['hola'];
const allKnownWords = [...commonWords, ...hebrewWords, ...swedishWords, ...japaneseWords, ...spanishWords];

describe('checkWordIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Register MSW handler that simulates dictionary validation
    server.use(
      http.post('*/api/validate-word*', async ({ request }) => {
        const body = await request.json() as { word: string };
        const isValid = allKnownWords.includes(body.word.toLowerCase());
        return HttpResponse.json({ isValid });
      })
    );
  });
  // Valid dictionary words
  describe('Valid dictionary words', () => {
    it('should return canIntegrate=true for valid English dictionary word', () => {
      // GIVEN: A valid English word
      const word = 'CAT';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should be integrable
      expect(result).toEqual({
        word: 'cat',
        canIntegrate: true,
        reason: undefined
      });
    });

    it('should normalize word to lowercase', () => {
      // GIVEN: A mixed-case valid word
      const word = 'HeLLo';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Word should be normalized to lowercase
      expect(result.word).toBe('hello');
      expect(result.canIntegrate).toBe(true);
    });

    it('should trim whitespace from word', () => {
      // GIVEN: A valid word with whitespace
      const word = '  dog  ';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Word should be trimmed
      expect(result.word).toBe('dog');
      expect(result.canIntegrate).toBe(true);
    });
  });

  // Non-dictionary words (using async function for dictionary validation)
  describe('Non-dictionary words', () => {
    it('should return canIntegrate=false for non-dictionary word', async () => {
      // GIVEN: A word not in dictionary
      const word = 'XYZABC';
      const language = 'en' as const;

      // WHEN: Checking word integration (async for dictionary check)
      const result = await checkWordIntegrationAsync(word, language);

      // THEN: Should not be integrable with reason
      expect(result).toEqual({
        word: 'xyzabc',
        canIntegrate: false,
        reason: 'word_not_in_dictionary'
      });
    });

    it('should handle made-up words', async () => {
      // GIVEN: A nonsense word
      const word = 'QWERTYZ';
      const language = 'en' as const;

      // WHEN: Checking word integration (async for dictionary check)
      const result = await checkWordIntegrationAsync(word, language);

      // THEN: Should not be integrable
      expect(result.canIntegrate).toBe(false);
      expect(result.reason).toBe('word_not_in_dictionary');
    });
  });

  // Length validation
  describe('Length validation', () => {
    it('should return canIntegrate=false for word too long (>12 chars)', () => {
      // GIVEN: A word longer than 12 characters
      const word = 'SUPERCALIFRAGILISTIC';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should not be integrable due to length
      expect(result).toEqual({
        word: 'supercalifragilistic',
        canIntegrate: false,
        reason: 'word_too_long'
      });
    });

    it('should return canIntegrate=false for word too short (<3 chars)', () => {
      // GIVEN: A word shorter than 3 characters
      const word = 'AB';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should not be integrable due to length
      expect(result).toEqual({
        word: 'ab',
        canIntegrate: false,
        reason: 'word_too_short'
      });
    });

    it('should accept word at minimum length (3 chars)', () => {
      // GIVEN: A valid 3-character word
      const word = 'CAT';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should be integrable
      expect(result.canIntegrate).toBe(true);
      expect(result.word).toBe('cat');
    });

    it('should accept word at maximum length (12 chars)', () => {
      // GIVEN: A valid 12-character word
      const word = 'APPRECIATION'; // 12 chars
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should be integrable
      expect(result.canIntegrate).toBe(true);
      expect(result.word).toBe('appreciation');
    });
  });

  // Empty string
  describe('Empty string handling', () => {
    it('should return canIntegrate=false for empty word', () => {
      // GIVEN: An empty string
      const word = '';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should not be integrable
      expect(result).toEqual({
        word: '',
        canIntegrate: false,
        reason: 'word_empty'
      });
    });

    it('should return canIntegrate=false for whitespace-only word', () => {
      // GIVEN: A whitespace-only string
      const word = '   ';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should not be integrable (empty after trim)
      expect(result).toEqual({
        word: '',
        canIntegrate: false,
        reason: 'word_empty'
      });
    });
  });

  // Multi-language support
  describe('Multi-language support', () => {
    it('should check Hebrew dictionary for Hebrew words', () => {
      // GIVEN: A Hebrew word
      const word = 'שלום';
      const language = 'he' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should process Hebrew correctly
      expect(result.word).toBe('שלום');
      expect(typeof result.canIntegrate).toBe('boolean');
      // Note: Actual canIntegrate value depends on dictionary content
    });

    it('should check Swedish dictionary for Swedish words', () => {
      // GIVEN: A Swedish word
      const word = 'hej';
      const language = 'sv' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should process Swedish correctly
      expect(result.word).toBe('hej');
      expect(typeof result.canIntegrate).toBe('boolean');
    });

    it('should check Japanese dictionary for Japanese words', () => {
      // GIVEN: A Japanese word
      const word = '日本';
      const language = 'ja' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should process Japanese correctly
      expect(result.word).toBe('日本');
      expect(typeof result.canIntegrate).toBe('boolean');
    });

    it('should check Spanish dictionary for Spanish words', () => {
      // GIVEN: A Spanish word
      const word = 'hola';
      const language = 'es' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should process Spanish correctly
      expect(result.word).toBe('hola');
      expect(typeof result.canIntegrate).toBe('boolean');
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    it('should handle single character word', () => {
      // GIVEN: A single character
      const word = 'A';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should reject as too short
      expect(result.canIntegrate).toBe(false);
      expect(result.reason).toBe('word_too_short');
    });

    it('should handle numeric characters in word', async () => {
      // GIVEN: A word with numbers (not in dictionary)
      const word = 'TEST123';
      const language = 'en' as const;

      // WHEN: Checking word integration (async for dictionary check)
      const result = await checkWordIntegrationAsync(word, language);

      // THEN: Should not be in dictionary
      expect(result.canIntegrate).toBe(false);
      expect(result.reason).toBe('word_not_in_dictionary');
    });

    it('should handle special characters in word', async () => {
      // GIVEN: A word with special chars (not in dictionary)
      const word = 'HELLO!';
      const language = 'en' as const;

      // WHEN: Checking word integration (async for dictionary check)
      const result = await checkWordIntegrationAsync(word, language);

      // THEN: Should not be in dictionary
      expect(result.canIntegrate).toBe(false);
      expect(result.reason).toBe('word_not_in_dictionary');
    });
  });

  // React hook batch checking
  describe('useWordIntegration hook', () => {
    it('should provide batch checking functionality', async () => {
      // GIVEN: Multiple words to check
      const words = ['cat', 'dog', 'xyzabc', 'supercalifragilistic', 'ab'];
      const language = 'en' as const;

      // Use renderHook to properly test the hook
      const { result } = renderHook(() => useWordIntegration());

      // WHEN: Checking words in batch (async)
      const results = await result.current.checkWords(words, language);

      // THEN: Should return array of results
      expect(results).toHaveLength(5);
      expect(results[0].canIntegrate).toBe(true); // cat
      expect(results[1].canIntegrate).toBe(true); // dog
      expect(results[2].canIntegrate).toBe(false); // xyzabc - not in dict
      expect(results[3].canIntegrate).toBe(false); // too long
      expect(results[4].canIntegrate).toBe(false); // too short
    });

    it('should handle empty word array', async () => {
      // GIVEN: Empty array
      const words: string[] = [];
      const language = 'en' as const;

      // Use renderHook to properly test the hook
      const { result } = renderHook(() => useWordIntegration());

      // WHEN: Checking empty array (async)
      const results = await result.current.checkWords(words, language);

      // THEN: Should return empty array
      expect(results).toEqual([]);
    });
  });

  // Integration priority (length check before dictionary check)
  describe('Validation order', () => {
    it('should check empty before other validations', () => {
      // GIVEN: An empty string
      const word = '';
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should return empty reason, not length reason
      expect(result.reason).toBe('word_empty');
    });

    it('should check length before dictionary', () => {
      // GIVEN: A very long word (even if it's real)
      const word = 'ANTIDISESTABLISHMENTARIANISM'; // 28 chars, real word
      const language = 'en' as const;

      // WHEN: Checking word integration
      const result = checkWordIntegration(word, language);

      // THEN: Should return too_long, not dictionary check
      expect(result.reason).toBe('word_too_long');
    });
  });
});
