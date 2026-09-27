/**
 * Tests for Dictionary Enrichment Module
 * Handles promoting verified words to dictionary
 */

import { vi, type Mock } from 'vitest';
import * as fs from 'fs/promises';
import {
  promoteVerifiedWordsToDictionary,
  addWordToHebrewDictionary,
  normalizeHebrewWordForDictionary,
  getHebrewApprovedPath,
  runDictionaryEnrichment,
} from '../dictionaryEnrichment';

// Mock fs/promises
vi.mock('fs/promises');
const mockedFs = fs as unknown as { appendFile: Mock };

// Hoist mock fn references so they survive vi.clearAllMocks()
const {
  mockGetVerifiedWords,
  mockMarkWordPromoted,
  mockProcessMilogQueue,
  mockProcessWiktionaryEn,
  mockProcessWiktionaryEs,
  mockRunAutoPromotion,
} = vi.hoisted(() => ({
  mockGetVerifiedWords: vi.fn(),
  mockMarkWordPromoted: vi.fn(),
  mockProcessMilogQueue: vi.fn(),
  mockProcessWiktionaryEn: vi.fn(),
  mockProcessWiktionaryEs: vi.fn(),
  mockRunAutoPromotion: vi.fn(),
}));

// Mock milogWordVerifier
vi.mock('../../services/milogWordVerifier', () => ({
  getVerifiedWordsForPromotion: mockGetVerifiedWords,
  markWordPromoted: mockMarkWordPromoted,
  processMilogVerificationQueue: mockProcessMilogQueue,
}));

vi.mock('../../services/wiktionaryEnVerifier', () => ({
  processWiktionaryEnVerificationQueue: mockProcessWiktionaryEn,
}));

vi.mock('../../services/wiktionaryEsVerifier', () => ({
  processWiktionaryEsVerificationQueue: mockProcessWiktionaryEs,
}));

vi.mock('../autoPromotion', () => ({
  runAutoPromotion: mockRunAutoPromotion,
}));

// Mock dictionary module with hebrewWords Set
const mockHebrewWords = new Set<string>();
vi.mock('../../dictionary', () => ({
  dictionary: {
    hebrewWords: mockHebrewWords,
  },
}));

describe('DictionaryEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      // Mock verified words
      mockGetVerifiedWords.mockResolvedValueOnce([
        { id: 'uuid-1', word: 'שלום', url: 'https://milog.co.il/שלום' },
        { id: 'uuid-2', word: 'בוקר', url: 'https://milog.co.il/בוקר' },
      ]);

      // Mock successful promotion
      mockMarkWordPromoted.mockResolvedValue(true);
      mockedFs.appendFile.mockResolvedValue(undefined);

      const result = await promoteVerifiedWordsToDictionary();

      expect(result.promoted).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockMarkWordPromoted).toHaveBeenCalledTimes(2);
    });

    it('should handle empty verified words list', async () => {
      mockGetVerifiedWords.mockResolvedValueOnce([]);

      const result = await promoteVerifiedWordsToDictionary();

      expect(result.promoted).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should continue on individual word failure', async () => {
      mockGetVerifiedWords.mockResolvedValueOnce([
        { id: 'uuid-1', word: 'שלום', url: null },
        { id: 'uuid-2', word: 'בוקר', url: null },
      ]);

      // First word fails, second succeeds
      mockedFs.appendFile
        .mockRejectedValueOnce(new Error('Write error'))
        .mockResolvedValueOnce(undefined);

      mockMarkWordPromoted.mockResolvedValue(true);

      const result = await promoteVerifiedWordsToDictionary();

      expect(result.promoted).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should add words to in-memory dictionary', async () => {
      mockGetVerifiedWords.mockResolvedValueOnce([
        { id: 'uuid-1', word: 'מילה', url: null },
      ]);

      mockMarkWordPromoted.mockResolvedValue(true);
      mockedFs.appendFile.mockResolvedValue(undefined);

      await promoteVerifiedWordsToDictionary();

      // Should have added normalized word to in-memory dictionary
      expect(mockHebrewWords.has('מילה')).toBe(true);
    });
  });

  describe('getHebrewApprovedPath', () => {
    it('resolves via process.cwd(), not __dirname', () => {
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/app/fe-next');

      const result = getHebrewApprovedPath();

      expect(result).toBe('/app/fe-next/backend/hebrew_words_approved.txt');
      cwdSpy.mockRestore();
    });
  });

  describe('runDictionaryEnrichment', () => {
    beforeEach(() => {
      mockProcessMilogQueue.mockResolvedValue({ processed: 1, verified: 1 });
      mockProcessWiktionaryEn.mockResolvedValue({ processed: 0, verified: 0 });
      mockProcessWiktionaryEs.mockResolvedValue({ processed: 0, verified: 0 });
      mockRunAutoPromotion.mockResolvedValue({
        promoted: 1,
        failed: 0,
        blocked: 0,
        words: { milogBased: ['שלום'], wiktionaryBased: [], wiktionaryEsBased: [], wiktionarySvBased: [], jishoBased: [] },
      });
    });

    it('promotes verified words via the shared auto-promoter, not the file writer', async () => {
      const result = await runDictionaryEnrichment();

      expect(mockRunAutoPromotion).toHaveBeenCalledTimes(1);
      // Regression guard: promotion must never race startAutoPromotionCron by
      // also appending to the (previously broken) hebrew_words_approved.txt file.
      expect(mockedFs.appendFile).not.toHaveBeenCalled();
      expect(result.promotion.promoted).toBe(1);
      expect(result.promotion.words).toEqual(['שלום']);
    });

    it('still reports verification totals across all queues', async () => {
      mockProcessWiktionaryEn.mockResolvedValueOnce({ processed: 2, verified: 1 });

      const result = await runDictionaryEnrichment();

      expect(result.verification.processed).toBe(3);
      expect(result.verification.verified).toBe(2);
    });
  });
});
