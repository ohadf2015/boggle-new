/**
 * GameAIService - Main Entry Point
 * Vertex AI + Supabase Integration for word validation and generation
 */

import type { GoogleGenAI } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';

// Import all modules
import type {
  GoogleCredentials,
  WordValidationResult,
  CommunityWord,
  HintResult,
  TokenUsageStats,
} from './types';
import { validationCache } from './cache';
import {
  type GenAIModel,
  parseGoogleCredentials,
  createServiceClient,
  initializeVertexAI,
  createTokenUsageStats,
  resetTokenUsage,
} from './client';
import {
  checkCommunityWords,
  checkWordScores,
  saveToCommunityWords,
  validateWithAI,
  checkDatabaseOnly,
  withRetry,
} from './validation';
import {
  generateHint,
  generateSimpleHint,
  getHintForUnfoundWord,
} from './hints';
import {
  generateThemedBoard,
  generateBulkWords,
} from './generation';
import { judgeDailyWord, type DailyWordVerdict } from './dailyWordJudge';

import logger from '@/backend/utils/logger';

/**
 * Main GameAIService class
 * Provides word validation, hint generation, and themed board creation
 */
class GameAIService {
  private vertexAI: GoogleGenAI | null = null;
  private model: GenAIModel | null = null;
  private supabaseAdmin: SupabaseClient | null = null;
  private credentials: GoogleCredentials | null = null;
  private initialized = false;
  private initError: Error | null = null;

  // Token usage tracking
  private tokenUsage: TokenUsageStats = createTokenUsageStats();

  // Hint cache to avoid regenerating same hints
  private hintCache: Map<string, { hint: HintResult; timestamp: number }> = new Map();

  constructor() {
    // Lazy initialization - will be called on first use
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initError) throw this.initError;

    try {
      // Parse credentials
      this.credentials = parseGoogleCredentials();

      // Initialize Vertex AI
      const { ai, model } = await initializeVertexAI(this.credentials);
      this.vertexAI = ai;
      this.model = model;

      // Initialize Supabase admin client
      this.supabaseAdmin = createServiceClient();

      this.initialized = true;
    } catch (error) {
      this.initError = error as Error;
      throw error;
    }
  }

  // ===========================================================================
  // Utility: Timeout wrapper
  // ===========================================================================

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(
          `${operationName} timed out after ${timeoutMs / 1000}s. ` +
          `The AI model may be overloaded. Please try again.`
        ));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  // ===========================================================================
  // Word Validation
  // ===========================================================================

  /**
   * Validate a word and save valid words to the database.
   * Flow: Cache → Database → AI → Save
   */
  async validateAndSaveWord(
    word: string,
    language: string = 'en',
    minWordLength: number = 2
  ): Promise<WordValidationResult> {
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord || normalizedWord.length < minWordLength) {
      return {
        isValid: false,
        reason: `Word must be at least ${minWordLength} characters`,
        source: 'database',
      };
    }

    try {
      await this.initialize();

      // Check in-memory cache first
      const cached = validationCache.get(normalizedWord, language);
      if (cached) {
        return { ...cached, source: 'database' as const };
      }

      // Check community_words
      const inCommunityWords = await checkCommunityWords(this.supabaseAdmin, normalizedWord, language);
      if (inCommunityWords) {
        validationCache.set(normalizedWord, language, { isValid: true });
        return { isValid: true, source: 'database' };
      }

      // Check word_scores
      const inWordScores = await checkWordScores(this.supabaseAdmin, normalizedWord, language);
      if (inWordScores) {
        validationCache.set(normalizedWord, language, { isValid: true });
        return { isValid: true, source: 'database' };
      }

      // AI validation with retry
      if (!this.model) {
        throw new Error('Vertex AI model not initialized');
      }

      const aiResult = await withRetry(
        () => validateWithAI(this.model!, normalizedWord, language, this.withTimeout.bind(this)),
        `validateWord:${normalizedWord}`
      );

      // Cache the result
      validationCache.set(normalizedWord, language, {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
      });

      // Save valid words to database (fire and forget)
      if (aiResult.isValid) {
        saveToCommunityWords(this.supabaseAdmin, normalizedWord, language).catch((err) => {
          logger.debug('AI_SERVICE', ' Background save failed:', err);
        });
      }

      return {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
        source: 'ai',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.debug('AI_SERVICE', ' validateAndSaveWord error:', errorMessage);

      return {
        isValid: false,
        reason: 'Validation service unavailable',
        source: 'ai',
        error: errorMessage,
      };
    }
  }

  /**
   * Fast check: Only cache and database, NO AI call
   */
  async checkDatabaseOnly(
    word: string,
    language: string = 'en',
    minWordLength: number = 2
  ): Promise<{ isValid: boolean; source: 'database' | 'unknown' }> {
    try {
      await this.initialize();
      return checkDatabaseOnly(this.supabaseAdmin, word, language, minWordLength);
    } catch (error) {
      logger.debug('AI_SERVICE', ' checkDatabaseOnly error:', error);
      return { isValid: false, source: 'unknown' };
    }
  }

  /**
   * Batch validate multiple words
   */
  async validateWords(
    words: string[],
    language: string = 'en',
    minWordLength: number = 2
  ): Promise<WordValidationResult[]> {
    const BATCH_SIZE = 5;
    const results: WordValidationResult[] = [];

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((word) => this.validateAndSaveWord(word, language, minWordLength))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // ===========================================================================
  // Themed Board Generation
  // ===========================================================================

  async generateThemedBoard(
    theme: string,
    count: number,
    language: string = 'en'
  ): Promise<string[]> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    return generateThemedBoard(this.model, theme, count, language, this.withTimeout.bind(this));
  }

  // ===========================================================================
  // Hint Generation
  // ===========================================================================

  async generateHint(
    targetWord: string,
    language: string = 'en',
    hintLevel: 1 | 2 | 3 = 2
  ): Promise<HintResult> {
    await this.initialize();

    if (!this.model) {
      return generateSimpleHint(targetWord, hintLevel);
    }

    return generateHint(
      this.model,
      targetWord,
      language,
      hintLevel,
      this.withTimeout.bind(this),
      this.hintCache,
      this.tokenUsage
    );
  }

  generateSimpleHint(targetWord: string, hintLevel: 1 | 2 | 3 = 2): HintResult {
    return generateSimpleHint(targetWord, hintLevel);
  }

  async getHintForUnfoundWord(
    availableWords: string[],
    foundWords: string[],
    language: string = 'en',
    preferLonger: boolean = true
  ): Promise<HintResult | null> {
    await this.initialize();
    return getHintForUnfoundWord(
      availableWords,
      foundWords,
      language,
      preferLonger,
      this.model,
      this.withTimeout.bind(this),
      this.hintCache,
      this.tokenUsage
    );
  }

  clearHintCache(): void {
    this.hintCache.clear();
  }

  // ===========================================================================
  // Bulk Word Generation
  // ===========================================================================

  async generateBulkWords(
    language: string,
    count: number,
    excludedWords: Set<string>,
    existingWordList: string[] = [],
    lengthRange: { min: number; max: number } = { min: 4, max: 8 }
  ): Promise<Array<{ word: string; reason: string }>> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    return generateBulkWords(
      this.model,
      language,
      count,
      excludedWords,
      existingWordList,
      lengthRange,
      this.withTimeout.bind(this),
      this.tokenUsage
    );
  }

  // ===========================================================================
  // Daily Word Quality Judge
  // ===========================================================================

  /**
   * Strict verdict on whether a word is a good daily-puzzle answer (rejects
   * proper nouns, loanwords, niche/technical, inflected fragments) plus a short
   * meaning in the word's language when approved. Throws if AI is unavailable.
   */
  async judgeDailyWord(word: string, language: string = 'en'): Promise<DailyWordVerdict> {
    await this.initialize();
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }
    return judgeDailyWord(this.model, word, language, this.withTimeout.bind(this), this.tokenUsage);
  }

  // ===========================================================================
  // Token Usage Tracking
  // ===========================================================================

  getTokenUsage(): TokenUsageStats {
    return { ...this.tokenUsage };
  }

  resetTokenUsage(): void {
    resetTokenUsage(this.tokenUsage);
  }

  // ===========================================================================
  // Service Status
  // ===========================================================================

  async isConfigured(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  getStatus(): {
    vertexAI: boolean;
    supabase: boolean;
    error: string | null;
    tokenUsage: TokenUsageStats;
    cacheStats: { size: number; hits: number; misses: number; hitRate: string };
  } {
    return {
      vertexAI: this.vertexAI !== null,
      supabase: this.supabaseAdmin !== null,
      error: this.initError?.message || null,
      tokenUsage: this.getTokenUsage(),
      cacheStats: validationCache.getStats(),
    };
  }

  getCacheStats(): { size: number; hits: number; misses: number; hitRate: string } {
    return validationCache.getStats();
  }

  clearValidationCache(): void {
    validationCache.clear();
    logger.info('AI_SERVICE', ' Validation cache cleared');
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const gameAIService = new GameAIService();

// Export types
export type { WordValidationResult, CommunityWord, HintResult, TokenUsageStats };

// Export class for testing
export { GameAIService };
