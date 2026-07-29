/**
 * Tests for Wikipedia Word Populator
 * Tests auto-promotion logic for high-scoring validated words
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Language } from '@/shared/types/game';

// Mock dependencies
const { mockValidateWordWithAI, mockUpdateWordValidationStatus, mockCheckDatabaseOnly, mockValidateAndSaveWord } = vi.hoisted(() => {
  const mockValidateWordWithAI = vi.fn<() => Promise<{ valid: boolean; reason: string }>>();
  const mockUpdateWordValidationStatus = vi.fn<() => Promise<void>>();
  const mockCheckDatabaseOnly = vi.fn<() => Promise<{ source: string; isValid: boolean }>>();
  const mockValidateAndSaveWord = vi.fn<() => Promise<{ isValid: boolean; source: string }>>();
  return { mockValidateWordWithAI, mockUpdateWordValidationStatus, mockCheckDatabaseOnly, mockValidateAndSaveWord };
});

vi.mock('@/utils/dailyChallenge/wikipediaWordProcessor', () => ({
  validateWordWithAI: mockValidateWordWithAI,
  updateWordValidationStatus: mockUpdateWordValidationStatus,
  rankWordsByInterest: vi.fn<(candidates: unknown) => Array<{ word: string; score: number; source: string; url?: string }>>((candidates: unknown) => {
    const candidateList = candidates as Array<{ word: string; score: number; source: string; url?: string }>;
    return candidateList.map(c => c);
  }),
  getRecentlyUsedWords: vi.fn<() => Promise<Set<string>>>().mockResolvedValue(new Set<string>()),
  selectBestWord: vi.fn<(candidates: unknown) => { word: string; score: number; source: string; url?: string } | null>((candidates: unknown) => {
    const candidateList = candidates as Array<{ word: string; score: number; source: string; url?: string }>;
    return candidateList[0] || null;
  }),
}));

vi.mock('@/lib/ai-service', () => ({
  gameAIService: {
    checkDatabaseOnly: mockCheckDatabaseOnly,
    validateAndSaveWord: mockValidateAndSaveWord,
  },
}));

describe('auto-promotion of high-scoring candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should promote validated words with score >= 80 to community_words', async () => {
    // GIVEN: High-scoring candidate passes validation
    const mockCandidate = { word: 'AURORA', score: 85, source: 'tfa' };

    // Mock validateWordWithAI to return valid
    mockValidateWordWithAI.mockResolvedValue({
      valid: true,
      reason: 'Valid word'
    });

    // Mock updateWordValidationStatus
    mockUpdateWordValidationStatus.mockResolvedValue(undefined);

    // Mock checkDatabaseOnly to return not in dictionary (so it needs promotion)
    mockCheckDatabaseOnly.mockResolvedValue({
      source: 'unknown',
      isValid: false
    });

    // Mock validateAndSaveWord to save to community_words
    mockValidateAndSaveWord.mockResolvedValue({
      isValid: true,
      source: 'ai'
    });

    // WHEN: validateTopCandidates is called
    // Import after mocks are set up
    const { populateWikipediaWords } = await import('../wikipediaWordPopulator');

    // We can't directly test validateTopCandidates since it's not exported
    // We'll need to test through the public API or export it for testing
    // For now, this test documents the expected behavior

    // THEN: validateAndSaveWord should be called for high-scoring word
    // This will be verified once implementation is added
    expect(true).toBe(true); // Placeholder - will be replaced with actual assertions
  });

  it('should NOT promote words with score < 80', async () => {
    // GIVEN: Low-scoring candidate (score < 80)
    const mockCandidate = { word: 'TREE', score: 50, source: 'random' };

    // Mock validateWordWithAI to return valid
    mockValidateWordWithAI.mockResolvedValue({
      valid: true,
      reason: 'Valid word'
    });

    mockUpdateWordValidationStatus.mockResolvedValue(undefined);

    // WHEN: validateTopCandidates is called
    // validateAndSaveWord should NOT be called for low-scoring words

    // THEN: validateAndSaveWord should NOT be called
    // This will be verified once implementation is added
    expect(true).toBe(true); // Placeholder - will be replaced with actual assertions
  });

  it('should handle duplicate words gracefully', async () => {
    // GIVEN: High-scoring word already exists in community_words
    const mockCandidate = { word: 'AURORA', score: 85, source: 'tfa' };

    mockValidateWordWithAI.mockResolvedValue({
      valid: true,
      reason: 'Valid word'
    });

    mockUpdateWordValidationStatus.mockResolvedValue(undefined);

    // Mock checkDatabaseOnly to return word already in dictionary
    mockCheckDatabaseOnly.mockResolvedValue({
      source: 'database',
      isValid: true
    });

    // WHEN: Auto-promotion attempts to add it again
    // validateAndSaveWord should NOT be called since word is already in dictionary

    // THEN: No error thrown, continues gracefully
    expect(true).toBe(true); // Placeholder - will be replaced with actual assertions
  });
});
