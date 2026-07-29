/**
 * GameAIService - Main Service Facade
 *
 * Orchestrates word validation using Vertex AI, Supabase caching, and in-memory cache.
 * Provides a unified API for word validation and themed board generation.
 */

import type {
  ValidationResult,
  ServiceStatus,
  TokenUsageStats,
  CacheStats,
  ParsedValidation,
  BatchValidationItem,
} from './types.js';
import { getValidationCache, getCacheStats, clearCache } from './cache.js';
import { getTokenUsage, resetTokenUsage } from './tokenTracker.js';
import { VertexAIClient, parseGoogleCredentials } from './vertexClient.js';
import { SupabaseWordStore, createServiceClient } from './supabaseWordStore.js';

import logger from '../../utils/logger';

/**
 * Main GameAIService class - coordinates all AI validation components
 */
export class GameAIService {
  private vertexClient: VertexAIClient;
  private wordStore: SupabaseWordStore;
  public initialized: boolean = false;
  public initError: Error | null = null;

  constructor() {
    this.vertexClient = new VertexAIClient();
    this.wordStore = new SupabaseWordStore();
  }

  /**
   * Initialize the service. Called lazily on first use.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initError) throw this.initError;

    try {
      // Parse credentials and initialize Vertex AI
      const credentials = parseGoogleCredentials();
      this.vertexClient.initialize(credentials);

      // Initialize Supabase
      const supabaseClient = createServiceClient();
      this.wordStore.initialize(supabaseClient);

      this.initialized = true;
      logger.info('AI_SERVICE', 'Initialized successfully');
    } catch (error) {
      this.initError =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        'AI_SERVICE',
        `Initialization failed: ${this.initError.message}`
      );
      throw error;
    }
  }

  /**
   * Parse and validate AI response (delegate to VertexAIClient)
   */
  parseValidationResponse(text: string, word: string): ParsedValidation {
    return this.vertexClient.parseValidationResponse(text, word);
  }

  /**
   * Extract partial JSON results from truncated responses
   */
  extractPartialJsonResults(
    jsonContent: string,
    expectedWords: string[]
  ): BatchValidationItem[] {
    return this.vertexClient.extractPartialJsonResults(jsonContent, expectedWords);
  }

  /**
   * Map AI results back to original word order
   */
  mapResultsToWords(
    parsed: BatchValidationItem[],
    words: string[]
  ): ValidationResult[] {
    return this.vertexClient.mapResultsToWords(parsed, words);
  }

  /**
   * Validate a word and save valid words to the community_words table
   */
  async validateAndSaveWord(
    word: string,
    language: string = 'en'
  ): Promise<ValidationResult> {
    await this.initialize();

    const cache = getValidationCache();
    const normalizedWord = word.toLowerCase().trim();

    // Basic validation - only reject empty words
    if (!normalizedWord) {
      return {
        isValid: false,
        reason: 'Empty word',
        source: 'database',
      };
    }

    try {
      // Step 1: Check in-memory cache
      const cached = cache.get(normalizedWord, language);
      if (cached) {
        logger.debug(
          'AI_SERVICE',
          `Cache hit for "${normalizedWord}" (${language})`
        );
        return { ...cached, source: 'cache' };
      }

      // Step 2: Check community_words
      const inCommunityWords = await this.wordStore.checkCommunityWords(
        normalizedWord,
        language
      );
      if (inCommunityWords) {
        const result: ValidationResult = { isValid: true, source: 'database' };
        cache.set(normalizedWord, language, result);
        return result;
      }

      // Step 3: Check word_scores
      const inWordScores = await this.wordStore.checkWordScores(
        normalizedWord,
        language
      );
      if (inWordScores) {
        const result: ValidationResult = { isValid: true, source: 'database' };
        cache.set(normalizedWord, language, result);
        return result;
      }

      // Step 4: AI validation
      const aiResult = await this.vertexClient.validateWord(
        normalizedWord,
        language
      );

      const result: ValidationResult = {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
        source: 'ai',
        confidence: aiResult.confidence,
      };

      // Step 5: Cache the result
      cache.set(normalizedWord, language, result);

      // Step 6: Persist valid words (fire and forget)
      if (aiResult.isValid) {
        this.wordStore.saveToCommunityWords(normalizedWord, language).catch((err) => {
          logger.debug('AI_SERVICE', `Background save failed: ${err.message}`);
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug(
        'AI_SERVICE',
        `validateAndSaveWord error for "${word}": ${errorMessage}`
      );
      return {
        isValid: false,
        reason: 'Validation failed',
        source: 'ai',
        error: errorMessage,
      };
    }
  }

  /**
   * Batch validate multiple words with caching
   */
  async validateWords(
    words: string[],
    language: string = 'en'
  ): Promise<ValidationResult[]> {
    await this.initialize();

    if (!words || words.length === 0) {
      return [];
    }

    const cache = getValidationCache();
    const normalizedWords = words.map((w) => w.toLowerCase().trim());
    const results: (ValidationResult | null)[] = new Array(
      normalizedWords.length
    ).fill(null);
    const wordsNeedingAI: string[] = [];
    const wordIndexMap = new Map<string, number>();

    // Check cache and database for each word
    for (let i = 0; i < normalizedWords.length; i++) {
      const word = normalizedWords[i];

      // Basic validation - only reject empty words
      if (!word) {
        results[i] = { isValid: false, reason: 'Empty word', source: 'database' };
        continue;
      }

      // Check in-memory cache
      const cached = cache.get(word, language);
      if (cached) {
        results[i] = { ...cached, source: 'cache' };
        continue;
      }

      // Check database
      const inCommunityWords = await this.wordStore.checkCommunityWords(
        word,
        language
      );
      if (inCommunityWords) {
        results[i] = { isValid: true, source: 'database' };
        cache.set(word, language, { isValid: true });
        continue;
      }

      const inWordScores = await this.wordStore.checkWordScores(word, language);
      if (inWordScores) {
        results[i] = { isValid: true, source: 'database' };
        cache.set(word, language, { isValid: true });
        continue;
      }

      // Need AI validation
      wordsNeedingAI.push(word);
      wordIndexMap.set(word, i);
    }

    // If no words need AI, return results
    if (wordsNeedingAI.length === 0) {
      logger.info(
        'AI_SERVICE',
        `All ${normalizedWords.length} words found in cache/database`
      );
      return results as ValidationResult[];
    }

    logger.info(
      'AI_SERVICE',
      `Batch validating ${wordsNeedingAI.length} words with AI (${normalizedWords.length - wordsNeedingAI.length} from cache/database)`
    );

    try {
      const aiResults = await this.vertexClient.validateWordsBatch(
        wordsNeedingAI,
        language
      );
      const validWords: string[] = [];

      for (let i = 0; i < wordsNeedingAI.length; i++) {
        const word = wordsNeedingAI[i];
        const aiResult = aiResults[i] || { isValid: false, reason: 'No AI response' };
        const originalIndex = wordIndexMap.get(word)!;

        const result: ValidationResult = {
          isValid: aiResult.isValid,
          reason: aiResult.reason,
          source: 'ai',
          confidence: aiResult.confidence,
        };

        results[originalIndex] = result;
        cache.set(word, language, result);

        if (aiResult.isValid) {
          validWords.push(word);
        }
      }

      // Batch save valid words
      if (validWords.length > 0) {
        logger.info(
          'AI_SERVICE',
          `Saving ${validWords.length} AI-validated words to database`
        );
        this.wordStore.batchSaveToCommunityWords(validWords, language).catch((err) => {
          logger.debug('AI_SERVICE', `Batch save failed: ${err.message}`);
        });
      }

      return results as ValidationResult[];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.info('AI_SERVICE', `Batch AI validation failed: ${errorMessage}`);

      // Fill remaining results with errors
      for (const word of wordsNeedingAI) {
        const originalIndex = wordIndexMap.get(word)!;
        results[originalIndex] = {
          isValid: false,
          reason: 'AI validation failed',
          source: 'ai',
          error: errorMessage,
        };
      }

      return results as ValidationResult[];
    }
  }

  /**
   * Generate a themed word board using AI
   */
  async generateThemedBoard(
    theme: string,
    count: number,
    language: string = 'en'
  ): Promise<string[]> {
    await this.initialize();

    try {
      return await this.vertexClient.generateThemedBoard(theme, count, language);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.info('AI_SERVICE', `generateThemedBoard error: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check if the service is properly configured and ready
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration status for debugging
   */
  getStatus(): ServiceStatus {
    return {
      vertexAI: this.vertexClient.isInitialized(),
      supabase: this.wordStore.isInitialized(),
      error: this.initError?.message || null,
      tokenUsage: getTokenUsage(),
      cacheStats: getCacheStats(),
    };
  }

  /**
   * Get current token usage statistics
   */
  getTokenUsage(): TokenUsageStats {
    return getTokenUsage();
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage(): void {
    resetTokenUsage();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return getCacheStats();
  }

  /**
   * Clear the validation cache
   */
  clearCache(): void {
    clearCache();
    logger.info('AI_SERVICE', 'Validation cache cleared');
  }
}

// Singleton instance
export const gameAIService = new GameAIService();
