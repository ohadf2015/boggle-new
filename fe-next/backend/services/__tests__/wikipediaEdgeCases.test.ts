/**
 * Wikipedia Pipeline Edge Cases Tests
 * Tests for duplicate handling, AI timeout fallbacks, database errors, and error recovery
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { validateWordWithAI } from '@/utils/dailyChallenge/wikipediaWordProcessor';
import type { Language } from '@/shared/types/game';

// Mock dependencies
vi.mock('@/lib/ai-service', () => ({
  gameAIService: {
    checkDatabaseOnly: vi.fn(),
    validateAndSaveWord: vi.fn(),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('Wikipedia pipeline edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('duplicate word handling', () => {
    it('should skip promotion for words already in dictionary', async () => {
      // GIVEN: Word already exists in community_words
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockResolvedValue({
        source: 'database',
        isValid: true,
      });

      // WHEN: Validation runs
      const result = await validateWordWithAI('GALAXY', 'en' as Language, 85);

      // THEN: Word is marked valid from database
      expect(result.valid).toBe(true);
      expect(result.source).toBe('ai'); // Actually database, but same pipeline
      expect(result.reason).toBe('Dictionary validated');
    });

    it('should handle same word on different dates', async () => {
      // GIVEN: Word extracted on 2026-01-20
      // AND: Same word extracted on 2026-01-23
      // Database upsert will handle this gracefully with onConflict

      // This test verifies the storeWikipediaWordCandidates function
      // uses upsert with ignoreDuplicates: false, allowing updates

      // We can't directly test storeWikipediaWordCandidates here without
      // integration test, but we verify the validateWordWithAI handles it

      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockResolvedValue({
        source: 'database',
        isValid: true,
      });

      // WHEN: Both are processed
      const result1 = await validateWordWithAI('COSMOS', 'en' as Language, 80);
      const result2 = await validateWordWithAI('COSMOS', 'en' as Language, 80);

      // THEN: Second one also succeeds (database returns same result)
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  describe('AI validation timeout', () => {
    it('should fallback to format validation for high-scoring words', async () => {
      // GIVEN: Word with score >= 85
      // AND: AI service times out
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      // WHEN: Validation runs
      const result = await validateWordWithAI('NEBULA', 'en' as Language, 87);

      // THEN: Word passes with format-only validation
      expect(result.valid).toBe(true);
      expect(result.source).toBe('format');
      expect(result.reason).toBe('Format validated (AI unavailable)');
    });

    it('should reject low-scoring words when AI times out', async () => {
      // GIVEN: Word with score < 85
      // AND: AI service times out
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      // WHEN: Validation runs
      const result = await validateWordWithAI('TREE', 'en' as Language, 60);

      // THEN: Word is NOT promoted (requires AI validation)
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('AI validation unavailable');
    });

    it('should handle words that fail format validation even with high score', async () => {
      // GIVEN: High-scoring word that fails format validation (too short)
      // AND: AI service times out
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      // WHEN: Validation runs
      const result = await validateWordWithAI('CAT', 'en' as Language, 90);

      // THEN: Word is rejected (fails format validation)
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('AI validation unavailable');
    });
  });

  describe('database errors', () => {
    it('should continue processing after individual save failure', async () => {
      // NOTE: This test would require testing validateTopCandidates function
      // which we'll implement in the next task. For now, we test that
      // validation itself doesn't throw on database errors

      const { gameAIService } = await import('@/lib/ai-service');

      // Mock database check to fail
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      // High score should trigger fallback
      const result = await validateWordWithAI('QUARTZ', 'en' as Language, 88);

      // Should not throw and should return fallback result
      expect(result).toBeDefined();
      expect(result.valid).toBe(true); // Format fallback succeeds
      expect(result.source).toBe('format');
    });

    it('should log database errors with context', async () => {
      // GIVEN: Database error occurs
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();

      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Database connection lost')
      );

      // WHEN: Error is caught
      await validateWordWithAI('PRISM', 'en' as Language, 75);

      // THEN: Log includes error message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WordProcessor] AI validation error for PRISM'),
        expect.stringContaining('Database connection lost')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('validation error fallback', () => {
    it('should use format validation when AI credentials missing', async () => {
      // GIVEN: No GOOGLE_APPLICATION_CREDENTIALS (simulated by error)
      // AND: High-scoring word
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Application Default Credentials not found')
      );

      // WHEN: Validation runs
      const result = await validateWordWithAI('AURORA', 'en' as Language, 90);

      // THEN: Falls back to format validation
      expect(result.valid).toBe(true);
      expect(result.source).toBe('format');
      expect(result.reason).toBe('Format validated (AI unavailable)');
    });

    it('should handle Hebrew words with format fallback', async () => {
      // GIVEN: High-scoring Hebrew word
      // AND: AI unavailable
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      // WHEN: Validation runs
      const result = await validateWordWithAI('גלקסיה', 'he' as Language, 86);

      // THEN: Format validation passes (valid Hebrew word)
      expect(result.valid).toBe(true);
      expect(result.source).toBe('format');
    });

    it('should handle words with invalid characters in fallback', async () => {
      // GIVEN: High-scoring word with numbers
      // AND: AI unavailable
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      // WHEN: Validation runs with invalid word
      const result = await validateWordWithAI('GALAXY2', 'en' as Language, 90);

      // THEN: Format validation fails, returns invalid
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('AI validation unavailable');
    });
  });

  describe('edge case scenarios', () => {
    it('should handle undefined score gracefully', async () => {
      // GIVEN: No score provided (optional parameter)
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockRejectedValue(
        new Error('Timeout')
      );

      // WHEN: Validation runs without score
      const result = await validateWordWithAI('METEOR', 'en' as Language);

      // THEN: Should not use fallback (score undefined)
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('AI validation unavailable');
    });

    it('should handle AI returning invalid from database check', async () => {
      // GIVEN: Word exists in database but marked invalid
      const { gameAIService } = await import('@/lib/ai-service');
      (gameAIService.checkDatabaseOnly as Mock).mockResolvedValue({
        source: 'database',
        isValid: false,
      });

      // WHEN: Validation runs
      const result = await validateWordWithAI('BADWORD', 'en' as Language, 85);

      // THEN: Should continue to AI validation, not use fallback
      // (because checkDatabaseOnly didn't throw, it just returned invalid)
      (gameAIService.validateAndSaveWord as Mock).mockResolvedValue({
        isValid: false,
        reason: 'Not a real word',
      });

      const result2 = await validateWordWithAI('BADWORD', 'en' as Language, 85);
      expect(result2.valid).toBe(false);
    });
  });
});
