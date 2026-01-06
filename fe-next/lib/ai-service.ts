/**
 * GameAIService - Vertex AI + Supabase Integration
 *
 * Designed for Railway deployment with ENV-based credentials.
 * Uses Gemini 1.5 Flash for word validation and caches results in Supabase.
 *
 * Uses existing tables:
 * - community_words: Host/AI approved words
 * - word_scores: Crowd-sourced validation (is_potentially_valid when net_score >= 6)
 */

import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { captureAIServiceError } from '@/utils/sentry';

// =============================================================================
// Zod Schemas for AI Response Validation
// =============================================================================

const WordValidationResponseSchema = z.object({
  isValid: z.boolean(),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

// Minimum confidence threshold for AI to approve a word (70%)
// Lowered to allow abbreviations, slang, and known names
const MIN_CONFIDENCE_THRESHOLD = 70;

const ThemedWordsResponseSchema = z.array(z.string());

const HintResponseSchema = z.object({
  hint: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

// =============================================================================
// Token Usage Tracking
// =============================================================================

interface TokenUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  lastReset: number;
  estimatedCost: number; // in USD
}

// Gemini 1.5 Flash pricing (as of 2024): ~$0.075 per 1M input, ~$0.30 per 1M output
const TOKEN_COSTS = {
  input: 0.000000075,   // per token
  output: 0.0000003,    // per token
};

// =============================================================================
// Types
// =============================================================================

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

interface WordValidationResult {
  isValid: boolean;
  reason?: string;
  source: 'database' | 'ai';
  error?: string;
}

interface CommunityWord {
  id: string;
  word: string;
  language: string;
  approval_count: number;
  promoted_to_dictionary: boolean;
  first_approved_at: string;
}

interface HintRequest {
  word: string;
  language: string;
  foundWords: string[];
}

interface HintResult {
  hint: string;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category';
  targetWord: string;
  error?: string;
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};

// =============================================================================
// In-Memory LRU Cache for Word Validations
// =============================================================================

interface CacheEntry {
  result: { isValid: boolean; reason?: string };
  timestamp: number;
}

const VALIDATION_CACHE_CONFIG = {
  maxSize: 5000,
  ttlMs: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
};

/**
 * Simple LRU cache for word validations to reduce API calls
 */
class WordValidationCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private lastCleanup = Date.now();

  private getKey(word: string, language: string): string {
    return `${language}:${word.toLowerCase().trim()}`;
  }

  get(word: string, language: string): { isValid: boolean; reason?: string } | null {
    const key = this.getKey(word, language);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > VALIDATION_CACHE_CONFIG.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.result;
  }

  set(word: string, language: string, result: { isValid: boolean; reason?: string }): void {
    const key = this.getKey(word, language);

    if (this.cache.size >= VALIDATION_CACHE_CONFIG.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { result, timestamp: Date.now() });
    this.maybeCleanup();
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < VALIDATION_CACHE_CONFIG.cleanupInterval) return;

    this.lastCleanup = now;
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > VALIDATION_CACHE_CONFIG.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0';
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Global validation cache instance
const validationCache = new WordValidationCache();

// =============================================================================
// Credential Parsing (Railway ENV-based)
// =============================================================================

/**
 * Parse Google Cloud credentials from JSON string environment variable.
 * This is crucial for Railway deployment where we can't use file-based credentials.
 *
 * @throws {Error} If GOOGLE_CREDENTIALS_JSON is missing or malformed
 */
function parseGoogleCredentials(): GoogleCredentials {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_CREDENTIALS_JSON environment variable is not set. ' +
      'Please add your Google Cloud service account JSON key to Railway environment variables.'
    );
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

    // Validate required fields
    const requiredFields = [
      'project_id',
      'private_key',
      'client_email',
    ] as const;

    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field in credentials: ${field}`);
      }
    }

    // Handle escaped newlines in private_key (common when pasting JSON)
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return credentials;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        'GOOGLE_CREDENTIALS_JSON contains malformed JSON. ' +
        'Ensure you copied the entire service account key without line breaks. ' +
        `Parse error: ${error.message}`
      );
    }
    throw error;
  }
}

// =============================================================================
// Supabase Service Client (bypasses RLS)
// =============================================================================

/**
 * Create a Supabase client with service role key to bypass RLS for writing.
 */
function createServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
      '[GameAIService] Supabase service role not configured. ' +
      'Word caching will be disabled.'
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// GameAIService Class
// =============================================================================

class GameAIService {
  private vertexAI: VertexAI | null = null;
  private model: GenerativeModel | null = null;
  private supabaseAdmin: SupabaseClient | null = null;
  private credentials: GoogleCredentials | null = null;
  private initialized = false;
  private initError: Error | null = null;

  // Token usage tracking
  private tokenUsage: TokenUsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    requestCount: 0,
    lastReset: Date.now(),
    estimatedCost: 0,
  };

  // Hint cache to avoid regenerating same hints
  private hintCache: Map<string, { hint: HintResult; timestamp: number }> = new Map();
  private readonly HINT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Lazy initialization - will be called on first use
  }

  // ===========================================================================
  // Token Usage Tracking
  // ===========================================================================

  /**
   * Track token usage from API response
   */
  private trackTokenUsage(inputTokens: number, outputTokens: number): void {
    this.tokenUsage.totalInputTokens += inputTokens;
    this.tokenUsage.totalOutputTokens += outputTokens;
    this.tokenUsage.requestCount++;
    this.tokenUsage.estimatedCost =
      (this.tokenUsage.totalInputTokens * TOKEN_COSTS.input) +
      (this.tokenUsage.totalOutputTokens * TOKEN_COSTS.output);
  }

  /**
   * Get current token usage statistics
   */
  getTokenUsage(): TokenUsageStats {
    return { ...this.tokenUsage };
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage(): void {
    this.tokenUsage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      requestCount: 0,
      lastReset: Date.now(),
      estimatedCost: 0,
    };
  }

  // ===========================================================================
  // Retry Logic with Exponential Backoff
  // ===========================================================================

  /**
   * Execute an async function with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === RETRY_CONFIG.maxRetries - 1) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[GameAIService] ${operationName} failed after ${attempt + 1} attempts:`, msg);
          // Capture to Sentry after all retries exhausted
          captureAIServiceError(error instanceof Error ? error : new Error(msg), {
            operation: operationName,
            retryAttempt: attempt + 1,
            isRateLimited: msg.toLowerCase().includes('rate limit') || msg.includes('429'),
          });
          throw error;
        }

        const delay = Math.min(
          RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelayMs
        );

        console.warn(`[GameAIService] ${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable (network errors, rate limits, truncation, etc.)
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('truncated') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('unavailable')
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize the service. Called lazily on first use.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initError) throw this.initError;

    try {
      // Parse credentials
      this.credentials = parseGoogleCredentials();

      // Initialize Vertex AI with credentials object (not file path!)
      // This is the key for Railway deployment
      this.vertexAI = new VertexAI({
        project: this.credentials.project_id,
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
        googleAuthOptions: {
          credentials: {
            client_email: this.credentials.client_email,
            private_key: this.credentials.private_key,
          },
          projectId: this.credentials.project_id,
        },
      });

      // Get the Gemini 1.5 Flash model
      this.model = this.vertexAI.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
        generationConfig: {
          maxOutputTokens: 1024, // Increased to prevent truncation
          temperature: 0.1, // Low temperature for consistent validation
          responseMimeType: 'application/json', // Force proper JSON output
        },
      });

      // Initialize Supabase admin client
      this.supabaseAdmin = createServiceClient();

      this.initialized = true;
      console.log('[GameAIService] Initialized successfully');
    } catch (error) {
      this.initError = error as Error;
      const msg = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('[GameAIService] Initialization failed:', msg);
      captureAIServiceError(error instanceof Error ? error : new Error(msg), {
        operation: 'initialize',
      });
      throw error;
    }
  }

  // ===========================================================================
  // Feature A: validateAndSaveWord
  // ===========================================================================

  /**
   * Check if word exists in community_words table (host/AI approved words).
   */
  private async checkCommunityWords(
    word: string,
    language: string
  ): Promise<boolean> {
    if (!this.supabaseAdmin) return false;

    const { data, error } = await this.supabaseAdmin
      .from('community_words')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GameAIService] community_words lookup error:', error.message);
      return false;
    }

    return data !== null;
  }

  /**
   * Check if word is crowd-validated in word_scores table (net_score >= 6).
   */
  private async checkWordScores(
    word: string,
    language: string
  ): Promise<boolean> {
    if (!this.supabaseAdmin) return false;

    const { data, error } = await this.supabaseAdmin
      .from('word_scores')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .eq('is_potentially_valid', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GameAIService] word_scores lookup error:', error.message);
      return false;
    }

    return data !== null;
  }

  /**
   * Save a valid word to community_words table.
   * Uses upsert to handle race conditions - increments approval_count if exists.
   */
  private async saveToCommunityWords(
    word: string,
    language: string
  ): Promise<void> {
    if (!this.supabaseAdmin) return;

    const now = new Date().toISOString();

    // First try to insert
    const { error: insertError } = await this.supabaseAdmin
      .from('community_words')
      .insert({
        word,
        language,
        approval_count: 1,
        first_approved_at: now,
        last_approved_at: now,
        // No user reference - AI-approved
      });

    // If unique constraint violation, update approval count
    if (insertError?.code === '23505') {
      const { error: updateError } = await this.supabaseAdmin
        .from('community_words')
        .update({
          approval_count: typeof this.supabaseAdmin.rpc === 'function' ? undefined : 1, // Will be incremented via raw SQL if needed
          last_approved_at: now,
        })
        .eq('word', word)
        .eq('language', language);

      if (updateError) {
        console.error('[GameAIService] Failed to update community_words:', updateError.message);
      }
    } else if (insertError) {
      console.error('[GameAIService] Failed to insert community_words:', insertError.message);
    }
  }

  /**
   * Slow check: Validate word using Vertex AI (Gemini 1.5 Flash).
   * Uses zod to validate the AI response schema.
   * Only approves words with confidence >= 85%.
   */
  private async validateWithAI(
    word: string,
    language: string
  ): Promise<{ isValid: boolean; reason: string; confidence: number }> {
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      he: 'Hebrew',
      sv: 'Swedish',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      no: 'Norwegian',
      da: 'Danish',
      fi: 'Finnish',
    };

    const languageName = languageNames[language] || language;
    const isHebrew = language === 'he';

    // Build Hebrew-specific instruction if needed
    const hebrewFinalLettersNote = isHebrew ? `
IMPORTANT FOR HEBREW: The game board does NOT have final Hebrew letters (sofit letters: ך, ם, ן, ף, ץ).
Players type using regular letters (כ, מ, נ, פ, צ) even at the end of words.
When validating, treat words written with regular letters at the end as if they were written with final letters.
For example: "שלומ" should be considered as "שלום" (valid word).
Do NOT reject words just because they use regular letters instead of final forms at the end.
` : '';

    // Determine response language - provide reason in the game language
    const responseLanguageNote = `
RESPONSE LANGUAGE: Provide the "reason" field in ${languageName}. The reason should be a brief, clear explanation in ${languageName}.`;

    const prompt = `You are a word validator for a Boggle word game. Be FAIR but filter out gibberish.

LANGUAGE: ${languageName} (${language})
WORD: "${word}"
${hebrewFinalLettersNote}
VALIDATION RULES:
1. ACCEPT: Real words in ${languageName} dictionaries
2. ACCEPT: Common nouns, verbs (any conjugation), adjectives, adverbs
3. ACCEPT: Plural forms and verb conjugations
4. ACCEPT: Well-known abbreviations and acronyms (NASA, FIFA, LOL, USA, etc.)
5. ACCEPT: Popular and widely-recognized slang (cool, chill, vibe, etc.)
6. ACCEPT: Famous people's names (Einstein, Shakespeare, Mozart, etc.)
7. ACCEPT: Well-known place names (Paris, Tokyo, Amazon, etc.)
8. ACCEPT: Common brand names that became words (xerox, google, uber, etc.)
9. REJECT: Random letter combinations that don't mean anything
10. REJECT: Made-up nonsense words
11. REJECT: Obvious misspellings
12. REJECT: Words with spaces, hyphens, apostrophes

CONFIDENCE (0-100):
- 95-100: Very common word or well-known term
- 85-94: Recognized word, name, or slang
- 70-84: Valid but less common
- Below 70: Uncertain - REJECT
${responseLanguageNote}

Respond with ONLY valid JSON (no markdown):
{"isValid": boolean, "reason": "brief ${languageName} explanation", "confidence": number}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const candidate = response.candidates?.[0];
      
      // Check if response was truncated
      if (candidate?.finishReason === 'MAX_TOKENS' || candidate?.finishReason === 'OTHER') {
        const error = new Error('AI response truncated');
        error.name = 'TruncatedResponseError';
        throw error;
      }
      
      let text = candidate?.content?.parts?.[0]?.text || '';

      // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

      // Extract JSON from response
      let jsonMatch = text.match(/\{[\s\S]*\}/);

      // If no complete JSON found, try to recover from incomplete response
      if (!jsonMatch) {
        // Try to complete partial JSON like {"isValid": true or {"isValid": false
        const partialMatch = text.match(/\{\s*"isValid"\s*:\s*(true|false)/i);
        if (partialMatch) {
          const isValid = partialMatch[1].toLowerCase() === 'true';
          console.log(`[GameAIService] Recovered partial AI response: isValid=${isValid}`);
          return {
            isValid,
            reason: isValid ? 'Word accepted' : 'Word not recognized',
            confidence: isValid ? 75 : 60
          };
        }

        // Handle severely truncated responses (e.g., {"isValid or {"isValid":)
        // Try to extract partial information before giving up
        if (text.includes('"isValid"') || text.includes('"isValid')) {
          const partialMatch = text.match(/\{\s*"isValid"\s*:\s*(true|false)/i);
          if (partialMatch) {
            const isValid = partialMatch[1].toLowerCase() === 'true';
            console.warn(`[GameAIService] Truncated AI response for "${word}": ${text.substring(0, 50)}`);
            return {
              isValid,
              reason: isValid ? 'Word accepted (partial response)' : 'Word not recognized (partial response)',
              confidence: isValid ? 75 : 60
            };
          }
          // If we can't extract even partial info, throw to trigger retry
          const error = new Error('AI response truncated');
          error.name = 'TruncatedResponseError';
          throw error;
        }

        console.warn('[GameAIService] Could not extract JSON from AI response:', text.substring(0, 100));
        return { isValid: false, reason: 'Failed to parse AI response', confidence: 0 };
      }

      // Parse and validate with zod
      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // JSON was incomplete (e.g., missing closing brace) - try to recover
        const incompleteMatch = text.match(/"isValid"\s*:\s*(true|false)/i);
        if (incompleteMatch) {
          const isValid = incompleteMatch[1].toLowerCase() === 'true';
          console.log(`[GameAIService] Recovered from malformed JSON: isValid=${isValid}`);
          return {
            isValid,
            reason: isValid ? 'Word accepted' : 'Word not recognized',
            confidence: isValid ? 75 : 60
          };
        }
        throw parseError;
      }

      const validated = WordValidationResponseSchema.parse(parsed);

      // Apply confidence threshold - only approve if confidence >= 85%
      if (validated.isValid && validated.confidence < MIN_CONFIDENCE_THRESHOLD) {
        console.log(`[GameAIService] Word "${word}" rejected due to low confidence: ${validated.confidence}% (threshold: ${MIN_CONFIDENCE_THRESHOLD}%)`);
        return {
          isValid: false,
          reason: `Confidence too low (${validated.confidence}%) - need ${MIN_CONFIDENCE_THRESHOLD}%+ to approve`,
          confidence: validated.confidence
        };
      }

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[GameAIService] AI response schema validation failed:', error.issues);
        captureAIServiceError(new Error(`Schema validation failed: ${error.issues.map(i => i.message).join(', ')}`), {
          operation: 'validateWithAI_schema',
          word,
          language,
        });
        return { isValid: false, reason: 'Invalid AI response format', confidence: 0 };
      }
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GameAIService] AI validation error:', msg);
      throw error;
    }
  }

  /**
   * Validate a word and save valid words to the community_words table.
   *
   * Flow:
   * 1. Normalize: Trim and lowercase the input word
   * 2. Fast Check (DB): Query community_words table (host/AI approved)
   * 3. Fast Check (DB): Query word_scores table (crowd-validated, net_score >= 6)
   * 4. Slow Check (AI): If not found, call Gemini 1.5 Flash
   * 5. Persistence: If valid, upsert to community_words (learning loop)
   * 6. Return the result with source indicator
   *
   * @param word - The word to validate
   * @param language - Language code (e.g., 'en', 'sv')
   * @param minWordLength - Minimum word length (defaults to 2)
   * @returns Validation result with source indicator
   */
  async validateAndSaveWord(
    word: string,
    language: string = 'en',
    minWordLength: number = 2
  ): Promise<WordValidationResult> {
    // Step 1: Normalization
    const normalizedWord = word.toLowerCase().trim();

    // Basic validation (uses room's minimum word length setting)
    if (!normalizedWord || normalizedWord.length < minWordLength) {
      return {
        isValid: false,
        reason: `Word must be at least ${minWordLength} characters`,
        source: 'database',
      };
    }

    try {
      // Ensure initialized (inside try-catch to handle missing credentials gracefully)
      await this.initialize();
      // Step 2: Check in-memory cache first (fastest)
      const cached = validationCache.get(normalizedWord, language);
      if (cached) {
        return {
          ...cached,
          source: 'database' as const, // Cache hit = no AI call
        };
      }

      // Step 3: Fast Check - community_words (host/AI approved)
      const inCommunityWords = await this.checkCommunityWords(normalizedWord, language);
      if (inCommunityWords) {
        const result = { isValid: true };
        validationCache.set(normalizedWord, language, result);
        return {
          isValid: true,
          source: 'database',
        };
      }

      // Step 4: Fast Check - word_scores (crowd-validated)
      const inWordScores = await this.checkWordScores(normalizedWord, language);
      if (inWordScores) {
        const result = { isValid: true };
        validationCache.set(normalizedWord, language, result);
        return {
          isValid: true,
          source: 'database',
        };
      }

      // Step 5: Slow Check (AI) - with retry for transient failures
      const aiResult = await this.withRetry(
        () => this.validateWithAI(normalizedWord, language),
        `validateWord:${normalizedWord}`
      );

      // Cache the AI result
      validationCache.set(normalizedWord, language, {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
      });

      // Step 6: Persistence (Learning Loop) - Only save valid words
      if (aiResult.isValid) {
        // Fire and forget - don't block on save
        this.saveToCommunityWords(normalizedWord, language).catch((err) => {
          console.error('[GameAIService] Background save failed:', err);
        });
      }

      // Step 7: Return result
      return {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
        source: 'ai',
      };
    } catch (error) {
      // Safely extract error message without disturbing any Response bodies
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GameAIService] validateAndSaveWord error:', errorMessage);
      captureAIServiceError(error instanceof Error ? error : new Error(errorMessage), {
        operation: 'validateAndSaveWord',
        word: normalizedWord,
        language,
      });

      return {
        isValid: false,
        reason: 'Validation service unavailable',
        source: 'ai',
        error: errorMessage,
      };
    }
  }

  /**
   * Fast check: Only check cache and database, NO AI call.
   * Used during gameplay for instant validation like multiplayer's dictionary check.
   * Words not found in cache/database are marked as 'unknown' for AI validation at game end.
   *
   * @param word - The word to check
   * @param language - Language code
   * @param minWordLength - Minimum word length (defaults to 2)
   * @returns { isValid: true/false, source: 'database'|'unknown' }
   */
  async checkDatabaseOnly(
    word: string,
    language: string = 'en',
    minWordLength: number = 2
  ): Promise<{ isValid: boolean; source: 'database' | 'unknown' }> {
    const normalizedWord = word.toLowerCase().trim();

    if (!normalizedWord || normalizedWord.length < minWordLength) {
      return { isValid: false, source: 'database' };
    }

    try {
      await this.initialize();

      // Check in-memory cache first (fastest)
      const cached = validationCache.get(normalizedWord, language);
      if (cached) {
        return { isValid: cached.isValid, source: 'database' };
      }

      // Check community_words (host/AI approved)
      const inCommunityWords = await this.checkCommunityWords(normalizedWord, language);
      if (inCommunityWords) {
        validationCache.set(normalizedWord, language, { isValid: true });
        return { isValid: true, source: 'database' };
      }

      // Check word_scores (crowd-validated)
      const inWordScores = await this.checkWordScores(normalizedWord, language);
      if (inWordScores) {
        validationCache.set(normalizedWord, language, { isValid: true });
        return { isValid: true, source: 'database' };
      }

      // Not in database - needs AI validation at game end
      return { isValid: false, source: 'unknown' };
    } catch (error) {
      console.error('[GameAIService] checkDatabaseOnly error:', error);
      return { isValid: false, source: 'unknown' };
    }
  }

  // ===========================================================================
  // Feature B: generateThemedBoard
  // ===========================================================================

  /**
   * Generate a themed word board using AI.
   *
   * @param theme - The theme for word generation (e.g., 'halloween', 'space')
   * @param count - Number of words to generate
   * @param language - Language code (e.g., 'en', 'sv')
   * @returns Array of themed words
   */
  async generateThemedBoard(
    theme: string,
    count: number,
    language: string = 'en'
  ): Promise<string[]> {
    // Ensure initialized
    await this.initialize();

    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      sv: 'Swedish',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      no: 'Norwegian',
      da: 'Danish',
      fi: 'Finnish',
    };

    const languageName = languageNames[language] || language;

    const prompt = `Generate a JSON array of ${count} distinct words related to the theme '${theme}' in ${languageName}. Words must be between 3 to 10 letters long. No spaces, no hyphens. Output raw JSON only.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[GameAIService] Could not extract JSON array from AI response:', text);
        return [];
      }

      // Parse and validate with zod
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ThemedWordsResponseSchema.parse(parsed);

      // Filter to ensure word constraints
      const filteredWords = validated
        .map((w) => w.toLowerCase().trim())
        .filter((w) => w.length >= 3 && w.length <= 10 && /^[a-zA-Z\u00C0-\u024F]+$/.test(w));

      return filteredWords;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[GameAIService] Themed words schema validation failed:', error.issues);
        return [];
      }
      console.error('[GameAIService] generateThemedBoard error:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Feature C: AI Hints for Single Player Mode
  // ===========================================================================

  /**
   * Generate a hint for a word the player hasn't found yet.
   * Uses AI to create engaging, helpful hints without giving away the answer.
   *
   * @param targetWord - The word to generate a hint for
   * @param language - Language code
   * @param hintLevel - Difficulty level (1=easy/vague, 2=medium, 3=hard/specific)
   * @returns HintResult with the generated hint
   */
  async generateHint(
    targetWord: string,
    language: string = 'en',
    hintLevel: 1 | 2 | 3 = 2
  ): Promise<HintResult> {
    await this.initialize();

    if (!this.model) {
      return {
        hint: `The word has ${targetWord.length} letters`,
        hintType: 'length',
        targetWord,
        error: 'AI not initialized',
      };
    }

    // Check cache first
    const cacheKey = `${targetWord}:${language}:${hintLevel}`;
    const cached = this.hintCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.HINT_CACHE_TTL) {
      return cached.hint;
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      he: 'Hebrew',
      sv: 'Swedish',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
    };

    const languageName = languageNames[language] || 'English';
    const firstLetter = targetWord[0].toUpperCase();
    const wordLength = targetWord.length;

    // Enhanced prompt for more helpful, specific hints
    const hintGuidance = hintLevel === 1
      ? 'Give a vague category or general context (e.g., "Something in nature")'
      : hintLevel === 2
      ? 'Give a brief definition or what it means/does (e.g., "A tool for cutting")'
      : 'Give a specific definition or usage example (e.g., "What a chef does to vegetables")';

    const prompt = `Create a helpful hint for the ${languageName} word "${targetWord}" in a word game.

${hintGuidance}

HINT STYLE (pick one that fits best):
- Definition: What the word means (e.g., "A place where books are kept")
- Category: What type of thing it is (e.g., "A type of fruit")
- Action: What it does/is used for (e.g., "What you do when tired")
- Context: Where/when you'd see it (e.g., "Found in a kitchen")

Rules:
- Max 12 words, be concise and helpful
- In ${languageName}
- Never include the word itself or obvious rhymes
- Make it useful for guessing, not just describing letters

Respond JSON only: {"hint":"your hint","difficulty":"${hintLevel === 1 ? 'easy' : hintLevel === 2 ? 'medium' : 'hard'}"}`;

    try {
      const result = await this.withRetry(async () => {
        const response = await this.model!.generateContent(prompt);
        return response;
      }, 'generateHint');

      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Track token usage (estimate based on content length)
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(text.length / 4);
      this.trackTokenUsage(inputTokens, outputTokens);

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback to basic hint
        const fallbackHint: HintResult = {
          hint: `${wordLength}-letter word starting with "${firstLetter}"`,
          hintType: 'firstLetter',
          targetWord,
        };
        return fallbackHint;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = HintResponseSchema.parse(parsed);

      const hintResult: HintResult = {
        hint: validated.hint,
        hintType: 'definition',
        targetWord,
      };

      // Cache the result
      this.hintCache.set(cacheKey, { hint: hintResult, timestamp: Date.now() });

      return hintResult;
    } catch (error) {
      console.error('[GameAIService] generateHint error:', error);

      // Return graceful fallback
      return {
        hint: `Look for a ${wordLength}-letter word starting with "${firstLetter}"`,
        hintType: 'firstLetter',
        targetWord,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a simple hint without AI (faster, no API call)
   * Used when AI is unavailable or for rate limiting
   */
  generateSimpleHint(
    targetWord: string,
    hintLevel: 1 | 2 | 3 = 2
  ): HintResult {
    const length = targetWord.length;
    const firstLetter = targetWord[0].toUpperCase();
    const lastLetter = targetWord[targetWord.length - 1].toUpperCase();

    let hint: string;
    let hintType: HintResult['hintType'];

    switch (hintLevel) {
      case 1: // Easy - just length
        hint = `There's a ${length}-letter word you haven't found`;
        hintType = 'length';
        break;
      case 2: // Medium - length + first letter
        hint = `Look for a ${length}-letter word starting with "${firstLetter}"`;
        hintType = 'firstLetter';
        break;
      case 3: // Hard - length + first + last letter
        hint = `${length} letters: "${firstLetter}" ... "${lastLetter}"`;
        hintType = 'firstLetter';
        break;
      default:
        hint = `There's a ${length}-letter word available`;
        hintType = 'length';
    }

    return {
      hint,
      hintType,
      targetWord,
    };
  }

  /**
   * Get a hint for a random unfound word
   * Used by the hint handler to pick a word and generate hint
   */
  async getHintForUnfoundWord(
    availableWords: string[],
    foundWords: string[],
    language: string = 'en',
    preferLonger: boolean = true
  ): Promise<HintResult | null> {
    // Filter out already found words
    const unfoundWords = availableWords.filter(
      w => !foundWords.includes(w.toLowerCase())
    );

    if (unfoundWords.length === 0) {
      return null;
    }

    // Sort by length if preferring longer words (more points)
    if (preferLonger) {
      unfoundWords.sort((a, b) => b.length - a.length);
    }

    // Pick from top candidates (longer words)
    const candidates = unfoundWords.slice(0, Math.min(10, unfoundWords.length));
    const targetWord = candidates[Math.floor(Math.random() * candidates.length)];

    // Determine hint level based on word length
    const hintLevel: 1 | 2 | 3 = targetWord.length <= 4 ? 1 : targetWord.length <= 6 ? 2 : 3;

    // Try AI hint, fall back to simple hint
    try {
      return await this.generateHint(targetWord, language, hintLevel);
    } catch {
      return this.generateSimpleHint(targetWord, hintLevel);
    }
  }

  /**
   * Clear the hint cache
   */
  clearHintCache(): void {
    this.hintCache.clear();
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Batch validate multiple words.
   * Useful for validating all words at end of a game round.
   * @param words - Array of words to validate
   * @param language - Language code (e.g., 'en', 'sv')
   * @param minWordLength - Minimum word length (defaults to 2)
   */
  async validateWords(
    words: string[],
    language: string = 'en',
    minWordLength: number = 2
  ): Promise<WordValidationResult[]> {
    // Process in parallel with concurrency limit
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

  /**
   * Check if the service is properly configured and ready.
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
   * Get configuration status for debugging.
   */
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

  /**
   * Get validation cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number; hitRate: string } {
    return validationCache.getStats();
  }

  /**
   * Clear the validation cache
   */
  clearValidationCache(): void {
    validationCache.clear();
    console.log('[GameAIService] Validation cache cleared');
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

// Export singleton instance
export const gameAIService = new GameAIService();

// Export types for consumers
export type { WordValidationResult, CommunityWord, HintResult, TokenUsageStats };

// Export class for testing
export { GameAIService };
