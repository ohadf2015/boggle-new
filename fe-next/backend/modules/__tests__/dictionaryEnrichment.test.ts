/**
 * Tests for Dictionary Enrichment Module
 * Handles promoting verified words to dictionary
 */

import * as fs from 'fs/promises';
import {
  promoteVerifiedWordsToDictionary,
  addWordToHebrewDictionary,
  normalizeHebrewWordForDictionary,
} from '../dictionaryEnrichment';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock milogWordVerifier
jest.mock('../../services/milogWordVerifier', () => ({
  getVerifiedWordsForPromotion: jest.fn(),
  markWordPromoted: jest.fn(),
}));

// Mock dictionary module with hebrewWords Set
const mockHebrewWords = new Set<string>();
jest.mock('../../dictionary', () => ({
  dictionary: {
    hebrewWords: mockHebrewWords,
  },
}));

describe('DictionaryEnrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeHebrewWordForDictionary', () => {
    it('should normalize final letters to standard forms', () => {
      // Final letters should become standard forms
      expect(normalizeHebrewWordForDictionary('שלום')).toBe('שלומ'); // ם -> מ
      expect(normalizeHebrewWordForDictionary('ארון')).toBe('ארונ'); // ן -> נ
      expect(normalizeHebrewWordForDictionary('כף')).toBe('כפ'); // ף -> פ
      expect(normalizeHebrewWordForDictionary('עץ')).toBe('עצ'); // ץ -> צ
      expect(normalizeHebrewWordForDictionary('מלך')).toBe('מלכ'); // ך -> כ
    });

    it('should handle words without final letters', () => {
      expect(normalizeHebrewWordForDictionary('בית')).toBe('בית');
      expect(normalizeHebrewWordForDictionary('ספר')).toBe('ספר');
    });

    it('should handle empty string', () => {
      expect(normalizeHebrewWordForDictionary('')).toBe('');
    });
  });

  describe('addWordToHebrewDictionary', () => {
    const mockDictionaryPath = '/path/to/hebrew_words_approved.txt';

    it('should append word to dictionary file', async () => {
      mockedFs.appendFile.mockResolvedValueOnce(undefined);

      const result = await addWordToHebrewDictionary('שלום', mockDictionaryPath);

      expect(result).toBe(true);
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        mockDictionaryPath,
        'שלומ\n', // Normalized form
        'utf-8'
      );
    });

    it('should return false on file error', async () => {
      mockedFs.appendFile.mockRejectedValueOnce(new Error('File error'));

      const result = await addWordToHebrewDictionary('שלום', mockDictionaryPath);

      expect(result).toBe(false);
    });

    it('should normalize word before appending', async () => {
      mockedFs.appendFile.mockResolvedValueOnce(undefined);

      await addWordToHebrewDictionary('מלך', mockDictionaryPath);

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        mockDictionaryPath,
        'מלכ\n', // ך normalized to כ
        'utf-8'
      );
    });
  });

  describe('promoteVerifiedWordsToDictionary', () => {
    beforeEach(() => {
      mockHebrewWords.clear();
    });

    it('should promote verified words and update database', async () => {
      const { getVerifiedWordsForPromotion, markWordPromoted } = require('../../services/milogWordVerifier');

      // Mock verified words
      getVerifiedWordsForPromotion.mockResolvedValueOnce([
        { id: 'uuid-1', word: 'שלום', url: 'https://milog.co.il/שלום' },
        { id: 'uuid-2', word: 'בוקר', url: 'https://milog.co.il/בוקר' },
      ]);

      // Mock successful promotion
      markWordPromoted.mockResolvedValue(true);
      mockedFs.appendFile.mockResolvedValue(undefined);

      const result = await promoteVerifiedWordsToDictionary();

      expect(result.promoted).toBe(2);
      expect(result.failed).toBe(0);
      expect(markWordPromoted).toHaveBeenCalledTimes(2);
    });

    it('should handle empty verified words list', async () => {
      const { getVerifiedWordsForPromotion } = require('../../services/milogWordVerifier');

      getVerifiedWordsForPromotion.mockResolvedValueOnce([]);

      const result = await promoteVerifiedWordsToDictionary();

      expect(result.promoted).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should continue on individual word failure', async () => {
      const { getVerifiedWordsForPromotion, markWordPromoted } = require('../../services/milogWordVerifier');

      getVerifiedWordsForPromotion.mockResolvedValueOnce([
        { id: 'uuid-1', word: 'שלום', url: null },
        { id: 'uuid-2', word: 'בוקר', url: null },
      ]);

      // First word fails, second succeeds
      mockedFs.appendFile
        .mockRejectedValueOnce(new Error('Write error'))
        .mockResolvedValueOnce(undefined);

      markWordPromoted.mockResolvedValue(true);

      const result = await promoteVerifiedWordsToDictionary();

      expect(result.promoted).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should add words to in-memory dictionary', async () => {
      const { getVerifiedWordsForPromotion, markWordPromoted } = require('../../services/milogWordVerifier');

      getVerifiedWordsForPromotion.mockResolvedValueOnce([
        { id: 'uuid-1', word: 'מילה', url: null },
      ]);

      markWordPromoted.mockResolvedValue(true);
      mockedFs.appendFile.mockResolvedValue(undefined);

      await promoteVerifiedWordsToDictionary();

      // Should have added normalized word to in-memory dictionary
      expect(mockHebrewWords.has('מילה')).toBe(true);
    });
  });
});
