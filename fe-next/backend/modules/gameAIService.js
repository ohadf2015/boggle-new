/**
 * GameAIService - Vertex AI + Supabase Integration (JavaScript/CommonJS version)
 *
 * Backend-compatible version for Railway deployment with ENV-based credentials.
 * Uses Gemini 1.5 Flash for word validation and caches results in Supabase.
 *
 * Uses existing tables:
 * - community_words: Host/AI approved words
 * - word_scores: Crowd-sourced validation (is_potentially_valid when net_score >= 6)
 *
 * IMPROVEMENTS (v2):
 * - In-memory LRU cache for recently validated words
 * - Retry logic with exponential backoff
 * - Token usage tracking for cost monitoring
 * - Improved prompt engineering for better accuracy
 * - Structured output support via response schema
 * - Better error handling for truncated responses
 */

const { VertexAI } = require('@google-cloud/vertexai');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// =============================================================================
// Configuration Constants
// =============================================================================

// Minimum confidence threshold for AI to approve a word (70%)
// Lowered to allow abbreviations, slang, and known names
const MIN_CONFIDENCE_THRESHOLD = 70;

// Retry configuration for API calls
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};

// In-memory cache configuration
const CACHE_CONFIG = {
  maxSize: 5000,           // Maximum cached word validations
  ttlMs: 30 * 60 * 1000,   // 30 minutes TTL
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
};

// Token cost tracking (Gemini 1.5 Flash pricing as of 2024)
const TOKEN_COSTS = {
  input: 0.000000075,   // $0.075 per 1M input tokens
  output: 0.0000003,    // $0.30 per 1M output tokens
};

// =============================================================================
// In-Memory LRU Cache
// =============================================================================

/**
 * Simple LRU cache for word validations
 * Reduces API calls for repeated validations of the same words
 */
class WordValidationCache {
  constructor(maxSize = CACHE_CONFIG.maxSize) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;
    this.lastCleanup = Date.now();
  }

  /**
   * Generate a cache key for a word + language combination
   */
  _getKey(word, language) {
    return `${language}:${word.toLowerCase().trim()}`;
  }

  /**
   * Get a cached validation result
   * @returns {Object|null} Cached result or null if not found/expired
   */
  get(word, language) {
    const key = this._getKey(word, language);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_CONFIG.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.result;
  }

  /**
   * Store a validation result in cache
   */
  set(word, language, result) {
    const key = this._getKey(word, language);

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });

    // Periodic cleanup
    this._maybeCleanup();
  }

  /**
   * Remove expired entries periodically
   */
  _maybeCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < CACHE_CONFIG.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_CONFIG.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('AI_CACHE', `Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.hits + this.misses > 0
      ? (this.hits / (this.hits + this.misses) * 100).toFixed(1)
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Global cache instance
const validationCache = new WordValidationCache();

// =============================================================================
// Token Usage Tracking
// =============================================================================

/**
 * Track API token usage for cost monitoring
 */
const tokenUsage = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  requestCount: 0,
  lastReset: Date.now(),
  estimatedCost: 0,
};

/**
 * Update token usage statistics
 */
function trackTokenUsage(inputTokens, outputTokens) {
  tokenUsage.totalInputTokens += inputTokens;
  tokenUsage.totalOutputTokens += outputTokens;
  tokenUsage.requestCount++;
  tokenUsage.estimatedCost =
    (tokenUsage.totalInputTokens * TOKEN_COSTS.input) +
    (tokenUsage.totalOutputTokens * TOKEN_COSTS.output);
}

/**
 * Get current token usage statistics
 */
function getTokenUsage() {
  return { ...tokenUsage };
}

/**
 * Reset token usage statistics
 */
function resetTokenUsage() {
  tokenUsage.totalInputTokens = 0;
  tokenUsage.totalOutputTokens = 0;
  tokenUsage.requestCount = 0;
  tokenUsage.lastReset = Date.now();
  tokenUsage.estimatedCost = 0;
}

// =============================================================================
// Retry Logic
// =============================================================================

/**
 * Check if an error is retryable (network errors, rate limits, etc.)
 */
function isRetryableError(error) {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  const code = error.code || '';

  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT'
  );
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic and exponential backoff
 */
async function withRetry(operation, operationName) {
  let lastError = null;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryable = isRetryableError(error);

      if (!isRetryable || attempt === RETRY_CONFIG.maxRetries - 1) {
        logger.error('AI_SERVICE', `${operationName} failed after ${attempt + 1} attempts: ${error.message}`);
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelayMs
      );

      logger.warn('AI_SERVICE', `${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`);
      await sleep(delay);
    }
  }

  throw lastError;
}

// =============================================================================
// Credential Parsing (Railway ENV-based)
// =============================================================================

/**
 * Parse Google Cloud credentials from JSON string environment variable.
 * This is crucial for Railway deployment where we can't use file-based credentials.
 *
 * @throws {Error} If GOOGLE_CREDENTIALS_JSON is missing or malformed
 * @returns {Object} Google credentials object
 */
function parseGoogleCredentials() {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_CREDENTIALS_JSON environment variable is not set. ' +
      'Please add your Google Cloud service account JSON key to Railway environment variables.'
    );
  }

  try {
    const credentials = JSON.parse(credentialsJson);

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];

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
 * @returns {Object|null} Supabase client or null if not configured
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.warn('AI_SERVICE', 'Supabase service role not configured. Word caching will be disabled.');
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
// Language Configuration
// =============================================================================

const LANGUAGE_NAMES = {
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
  ja: 'Japanese',
};

// =============================================================================
// Prompt Templates
// =============================================================================

/**
 * Build the word validation prompt for a single word
 * Uses structured output format for reliable parsing
 */
function buildSingleWordPrompt(word, language) {
  const languageName = LANGUAGE_NAMES[language] || language;
  const isHebrew = language === 'he';

  // Hebrew-specific instruction for final letter forms
  const hebrewNote = isHebrew ? `
IMPORTANT FOR HEBREW: The game board does NOT have final Hebrew letters (sofit: ך, ם, ן, ף, ץ).
Players type using regular letters (כ, מ, נ, פ, צ) even at word endings.
Treat words with regular letters at the end as if they had final letters.
Example: "שלומ" should be validated as "שלום" (valid word).
` : '';

  // Response language instruction
  const responseNote = `
RESPONSE: Provide "reason" in ${languageName}. Keep it brief (under 10 words).`;

  return `You are a word validator for a Boggle word game. Be FAIR but filter out gibberish.

LANGUAGE: ${languageName} (${language})
WORD: "${word}"
${hebrewNote}
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
${responseNote}

Respond with ONLY valid JSON (no markdown):
{"isValid": boolean, "reason": "brief ${languageName} explanation", "confidence": number}`;
}

/**
 * Build the batch validation prompt for multiple words
 */
function buildBatchPrompt(words, language) {
  const languageName = LANGUAGE_NAMES[language] || language;
  const isHebrew = language === 'he';
  const wordList = words.map((w, i) => `${i + 1}. "${w}"`).join('\n');

  const hebrewNote = isHebrew ? `
HEBREW NOTE: Game board has no final letters (ך,ם,ן,ף,ץ). Treat regular letters at word end as final forms.
` : '';

  return `You are a word validator for a Boggle game. Validate ALL ${words.length} words in ${languageName}. Be FAIR but filter gibberish.

WORDS:
${wordList}
${hebrewNote}
RULES:
1. ACCEPT: Real ${languageName} words, nouns, verbs, adjectives, adverbs, plurals
2. ACCEPT: Well-known abbreviations/acronyms (NASA, FIFA, LOL, etc.)
3. ACCEPT: Popular slang and informal words
4. ACCEPT: Famous names (people, places, brands that became words)
5. REJECT: Random letter combinations, made-up nonsense
6. REJECT: Obvious misspellings

CONFIDENCE: 95-100=common, 85-94=recognized, 70-84=valid but rare, <70=REJECT

Respond with ONLY a JSON array (no markdown), one object per word in order:
[{"word": "string", "isValid": boolean, "reason": "brief ${languageName} text", "confidence": number}]`;
}

// =============================================================================
// GameAIService Class
// =============================================================================

class GameAIService {
  constructor() {
    this.vertexAI = null;
    this.model = null;
    this.batchModel = null;
    this.supabaseAdmin = null;
    this.credentials = null;
    this.initialized = false;
    this.initError = null;
  }

  /**
   * Initialize the service. Called lazily on first use.
   */
  async initialize() {
    if (this.initialized) return;
    if (this.initError) throw this.initError;

    try {
      // Parse credentials
      this.credentials = parseGoogleCredentials();

      // Initialize Vertex AI with credentials object (not file path!)
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

      // Get the Gemini 1.5 Flash model for single word validation
      this.model = this.vertexAI.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.1, // Low temperature for consistent validation
        },
      });

      // Get a separate model for batch validation with higher token limit
      this.batchModel = this.vertexAI.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
        generationConfig: {
          maxOutputTokens: 4096, // Higher limit for batch responses
          temperature: 0.1,
        },
      });

      // Initialize Supabase admin client
      this.supabaseAdmin = createServiceClient();

      this.initialized = true;
      logger.info('AI_SERVICE', 'Initialized successfully');
    } catch (error) {
      this.initError = error;
      logger.error('AI_SERVICE', `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================================
  // Database Checks
  // ===========================================================================

  /**
   * Check if word exists in community_words table (host/AI approved words).
   */
  async checkCommunityWords(word, language) {
    if (!this.supabaseAdmin) return false;

    try {
      const { data, error } = await this.supabaseAdmin
        .from('community_words')
        .select('id')
        .eq('word', word)
        .eq('language', language)
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.warn('AI_SERVICE', `community_words lookup error: ${error.message}`);
        return false;
      }

      return data !== null;
    } catch (error) {
      logger.warn('AI_SERVICE', `community_words check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if word is crowd-validated in word_scores table (net_score >= threshold).
   */
  async checkWordScores(word, language) {
    if (!this.supabaseAdmin) return false;

    try {
      const { data, error } = await this.supabaseAdmin
        .from('word_scores')
        .select('id')
        .eq('word', word)
        .eq('language', language)
        .eq('is_potentially_valid', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.warn('AI_SERVICE', `word_scores lookup error: ${error.message}`);
        return false;
      }

      return data !== null;
    } catch (error) {
      logger.warn('AI_SERVICE', `word_scores check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Save a valid word to community_words table.
   */
  async saveToCommunityWords(word, language) {
    if (!this.supabaseAdmin) return;

    const now = new Date().toISOString();

    try {
      // First try to insert
      const { error: insertError } = await this.supabaseAdmin
        .from('community_words')
        .insert({
          word,
          language,
          approval_count: 1,
          first_approved_at: now,
          last_approved_at: now,
        });

      // If unique constraint violation, update timestamp
      if (insertError?.code === '23505') {
        await this.supabaseAdmin
          .from('community_words')
          .update({ last_approved_at: now })
          .eq('word', word)
          .eq('language', language);
      } else if (insertError) {
        logger.error('AI_SERVICE', `Failed to insert community_words: ${insertError.message}`);
      }
    } catch (error) {
      logger.error('AI_SERVICE', `saveToCommunityWords failed: ${error.message}`);
    }
  }

  // ===========================================================================
  // AI Validation
  // ===========================================================================

  /**
   * Parse and validate AI response for single word validation
   */
  parseValidationResponse(text, word) {
    // Strip markdown code blocks if present
    let cleanText = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    // Try to extract JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to handle truncated responses
      const partialMatch = cleanText.match(/\{\s*"isValid"\s*:\s*(true|false)/);
      if (partialMatch) {
        const isValid = partialMatch[1] === 'true';
        logger.warn('AI_SERVICE', `Extracted partial response for "${word}": isValid=${isValid}`);
        return { isValid, reason: 'Partial AI response', confidence: 50 };
      }
      logger.warn('AI_SERVICE', `Could not extract JSON for "${word}": ${text.substring(0, 200)}`);
      return { isValid: false, reason: 'Failed to parse AI response', confidence: 0 };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate schema
      if (typeof parsed.isValid !== 'boolean' || typeof parsed.reason !== 'string') {
        logger.error('AI_SERVICE', `Invalid response schema for "${word}": ${JSON.stringify(parsed)}`);
        return { isValid: false, reason: 'Invalid AI response format', confidence: 0 };
      }

      // Ensure confidence is a number
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 50;

      // Apply confidence threshold
      if (parsed.isValid && confidence < MIN_CONFIDENCE_THRESHOLD) {
        logger.info('AI_SERVICE', `Word "${word}" rejected: confidence ${confidence}% < threshold ${MIN_CONFIDENCE_THRESHOLD}%`);
        return {
          isValid: false,
          reason: `Low confidence (${confidence}%)`,
          confidence,
        };
      }

      return { ...parsed, confidence };
    } catch (parseError) {
      logger.warn('AI_SERVICE', `JSON parse error for "${word}": ${parseError.message}`);
      return { isValid: false, reason: 'Failed to parse AI response', confidence: 0 };
    }
  }

  /**
   * Validate word using Vertex AI (Gemini 1.5 Flash).
   */
  async validateWithAI(word, language) {
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const prompt = buildSingleWordPrompt(word, language);

    const result = await withRetry(async () => {
      const response = await this.model.generateContent(prompt);
      return response;
    }, `validateWithAI("${word}")`);

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track token usage (estimate based on content length)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    trackTokenUsage(inputTokens, outputTokens);

    return this.parseValidationResponse(text, word);
  }

  /**
   * Validate a word and save valid words to the community_words table.
   *
   * Flow:
   * 1. Check in-memory cache
   * 2. Check community_words table
   * 3. Check word_scores table
   * 4. Call AI if needed
   * 5. Cache and persist result
   */
  async validateAndSaveWord(word, language = 'en') {
    await this.initialize();

    // Normalize
    const normalizedWord = word.toLowerCase().trim();

    // Basic validation - only reject empty words
    // Let the AI validate even 2-letter words since game supports minWordLength=2
    if (!normalizedWord) {
      return {
        isValid: false,
        reason: 'Empty word',
        source: 'database',
      };
    }

    try {
      // Step 1: Check in-memory cache
      const cached = validationCache.get(normalizedWord, language);
      if (cached) {
        logger.debug('AI_SERVICE', `Cache hit for "${normalizedWord}" (${language})`);
        return { ...cached, source: 'cache' };
      }

      // Step 2: Check community_words
      const inCommunityWords = await this.checkCommunityWords(normalizedWord, language);
      if (inCommunityWords) {
        const result = { isValid: true, source: 'database' };
        validationCache.set(normalizedWord, language, result);
        return result;
      }

      // Step 3: Check word_scores
      const inWordScores = await this.checkWordScores(normalizedWord, language);
      if (inWordScores) {
        const result = { isValid: true, source: 'database' };
        validationCache.set(normalizedWord, language, result);
        return result;
      }

      // Step 4: AI validation
      const aiResult = await this.validateWithAI(normalizedWord, language);

      const result = {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
        source: 'ai',
        confidence: aiResult.confidence,
      };

      // Step 5: Cache the result
      validationCache.set(normalizedWord, language, result);

      // Step 6: Persist valid words (fire and forget)
      if (aiResult.isValid) {
        this.saveToCommunityWords(normalizedWord, language).catch(err => {
          logger.error('AI_SERVICE', `Background save failed: ${err.message}`);
        });
      }

      return result;
    } catch (error) {
      logger.error('AI_SERVICE', `validateAndSaveWord error for "${word}": ${error.message}`);
      return {
        isValid: false,
        reason: 'Validation failed',
        source: 'ai',
        error: error.message,
      };
    }
  }

  // ===========================================================================
  // Batch Validation
  // ===========================================================================

  /**
   * Extract complete JSON objects from potentially truncated response
   */
  extractPartialJsonResults(jsonContent, expectedWords) {
    const results = [];
    const objectPattern = /\{\s*"word"\s*:\s*"([^"]+)"\s*,\s*"isValid"\s*:\s*(true|false)(?:\s*,\s*"reason"\s*:\s*"([^"]*)")?(?:\s*,\s*"confidence"\s*:\s*(\d+))?\s*\}/g;

    let match;
    while ((match = objectPattern.exec(jsonContent)) !== null) {
      const word = match[1];
      const isValid = match[2] === 'true';
      const reason = match[3] || (isValid ? 'Valid word' : 'Invalid word');
      const confidence = match[4] ? parseInt(match[4], 10) : 50;

      // Apply confidence threshold
      let finalIsValid = isValid;
      let finalReason = reason;
      if (isValid && confidence < MIN_CONFIDENCE_THRESHOLD) {
        finalIsValid = false;
        finalReason = `Low confidence (${confidence}%)`;
      }

      results.push({
        word,
        isValid: finalIsValid,
        reason: finalReason,
        confidence,
      });
    }

    return results;
  }

  /**
   * Batch validate multiple words in a single AI prompt.
   */
  async batchValidateWithAI(words, language) {
    if (!this.batchModel) {
      throw new Error('Vertex AI batch model not initialized');
    }

    const prompt = buildBatchPrompt(words, language);

    const result = await withRetry(async () => {
      const response = await this.batchModel.generateContent(prompt);
      return response;
    }, `batchValidateWithAI(${words.length} words)`);

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track token usage
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    trackTokenUsage(inputTokens, outputTokens);

    logger.debug('AI_SERVICE', `Batch response (${text.length} chars): ${text.substring(0, 300)}...`);

    // Parse response
    let cleanText = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Try to salvage partial results
      const partialMatch = cleanText.match(/\[\s*([\s\S]*)/);
      if (partialMatch) {
        const partialResults = this.extractPartialJsonResults(partialMatch[1], words);
        if (partialResults.length > 0) {
          logger.warn('AI_SERVICE', `Extracted ${partialResults.length}/${words.length} from truncated response`);
          return this.mapResultsToWords(partialResults, words);
        }
      }
      logger.error('AI_SERVICE', `Could not extract JSON array. Full response: ${text}`);
      return words.map(() => ({ isValid: false, reason: 'Failed to parse AI response', confidence: 0 }));
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        logger.warn('AI_SERVICE', 'Batch response is not an array');
        return words.map(() => ({ isValid: false, reason: 'Invalid AI response format', confidence: 0 }));
      }

      return this.mapResultsToWords(parsed, words);
    } catch (parseError) {
      // Try partial extraction
      const partialResults = this.extractPartialJsonResults(jsonMatch[0], words);
      if (partialResults.length > 0) {
        logger.warn('AI_SERVICE', `Extracted ${partialResults.length}/${words.length} from malformed JSON`);
        return this.mapResultsToWords(partialResults, words);
      }

      logger.warn('AI_SERVICE', `JSON parse error: ${parseError.message}`);
      return words.map(() => ({ isValid: false, reason: 'Failed to parse AI response', confidence: 0 }));
    }
  }

  /**
   * Map AI results back to original word order
   */
  mapResultsToWords(parsed, words) {
    const resultMap = new Map();

    for (const item of parsed) {
      if (item && typeof item.word === 'string') {
        const normalizedWord = item.word.toLowerCase().trim();
        const confidence = typeof item.confidence === 'number' ? item.confidence : 50;

        let isValid = item.isValid === true;
        let reason = item.reason || (isValid ? 'Valid word' : 'Invalid word');

        // Apply confidence threshold
        if (isValid && confidence < MIN_CONFIDENCE_THRESHOLD) {
          isValid = false;
          reason = `Low confidence (${confidence}%)`;
        }

        resultMap.set(normalizedWord, { isValid, reason, confidence });
      }
    }

    return words.map(word => {
      const result = resultMap.get(word.toLowerCase().trim());
      return result || { isValid: false, reason: 'Word not in AI response', confidence: 0 };
    });
  }

  /**
   * Batch validate multiple words with caching
   */
  async validateWords(words, language = 'en') {
    await this.initialize();

    if (!words || words.length === 0) {
      return [];
    }

    const normalizedWords = words.map(w => w.toLowerCase().trim());
    const results = new Array(normalizedWords.length).fill(null);
    const wordsNeedingAI = [];
    const wordIndexMap = new Map();

    // Check cache and database for each word
    for (let i = 0; i < normalizedWords.length; i++) {
      const word = normalizedWords[i];

      // Basic validation - only reject empty words
      // Let the AI validate even 2-letter words since game supports minWordLength=2
      if (!word) {
        results[i] = { isValid: false, reason: 'Empty word', source: 'database' };
        continue;
      }

      // Check in-memory cache
      const cached = validationCache.get(word, language);
      if (cached) {
        results[i] = { ...cached, source: 'cache' };
        continue;
      }

      // Check database
      const inCommunityWords = await this.checkCommunityWords(word, language);
      if (inCommunityWords) {
        results[i] = { isValid: true, source: 'database' };
        validationCache.set(word, language, { isValid: true });
        continue;
      }

      const inWordScores = await this.checkWordScores(word, language);
      if (inWordScores) {
        results[i] = { isValid: true, source: 'database' };
        validationCache.set(word, language, { isValid: true });
        continue;
      }

      // Need AI validation
      wordsNeedingAI.push(word);
      wordIndexMap.set(word, i);
    }

    // If no words need AI, return results
    if (wordsNeedingAI.length === 0) {
      logger.info('AI_SERVICE', `All ${normalizedWords.length} words found in cache/database`);
      return results;
    }

    logger.info('AI_SERVICE', `Batch validating ${wordsNeedingAI.length} words with AI (${normalizedWords.length - wordsNeedingAI.length} from cache/database)`);

    try {
      const aiResults = await this.batchValidateWithAI(wordsNeedingAI, language);
      const validWords = [];

      for (let i = 0; i < wordsNeedingAI.length; i++) {
        const word = wordsNeedingAI[i];
        const aiResult = aiResults[i] || { isValid: false, reason: 'No AI response' };
        const originalIndex = wordIndexMap.get(word);

        const result = {
          isValid: aiResult.isValid,
          reason: aiResult.reason,
          source: 'ai',
          confidence: aiResult.confidence,
        };

        results[originalIndex] = result;
        validationCache.set(word, language, result);

        if (aiResult.isValid) {
          validWords.push(word);
        }
      }

      // Batch save valid words
      if (validWords.length > 0) {
        logger.info('AI_SERVICE', `Saving ${validWords.length} AI-validated words to database`);
        this.batchSaveToCommunityWords(validWords, language).catch(err => {
          logger.error('AI_SERVICE', `Batch save failed: ${err.message}`);
        });
      }

      return results;
    } catch (error) {
      logger.error('AI_SERVICE', `Batch AI validation failed: ${error.message}`);

      // Fill remaining results with errors
      for (const word of wordsNeedingAI) {
        const originalIndex = wordIndexMap.get(word);
        results[originalIndex] = {
          isValid: false,
          reason: 'AI validation failed',
          source: 'ai',
          error: error.message,
        };
      }

      return results;
    }
  }

  /**
   * Batch save multiple valid words to community_words table.
   */
  async batchSaveToCommunityWords(words, language) {
    if (!this.supabaseAdmin || words.length === 0) return;

    const now = new Date().toISOString();

    const insertData = words.map(word => ({
      word: word.toLowerCase().trim(),
      language,
      approval_count: 1,
      first_approved_at: now,
      last_approved_at: now,
    }));

    try {
      const { error } = await this.supabaseAdmin
        .from('community_words')
        .upsert(insertData, {
          onConflict: 'word,language',
          ignoreDuplicates: false,
        });

      if (error) {
        logger.error('AI_SERVICE', `Batch save failed: ${error.message}`);
      } else {
        logger.info('AI_SERVICE', `Saved ${words.length} words to community_words`);
      }
    } catch (error) {
      logger.error('AI_SERVICE', `batchSaveToCommunityWords error: ${error.message}`);
    }
  }

  // ===========================================================================
  // Themed Board Generation
  // ===========================================================================

  /**
   * Generate a themed word board using AI.
   */
  async generateThemedBoard(theme, count, language = 'en') {
    await this.initialize();

    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const languageName = LANGUAGE_NAMES[language] || language;

    const prompt = `Generate a JSON array of ${count} distinct words related to the theme '${theme}' in ${languageName}. Words must be between 3 to 10 letters long. No spaces, no hyphens. Output raw JSON only.`;

    try {
      const result = await withRetry(async () => {
        return await this.model.generateContent(prompt);
      }, `generateThemedBoard("${theme}")`);

      const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Track tokens
      trackTokenUsage(Math.ceil(prompt.length / 4), Math.ceil(text.length / 4));

      // Extract JSON array
      let cleanText = text;
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      }

      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('AI_SERVICE', `Could not extract JSON array for theme "${theme}"`);
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        logger.error('AI_SERVICE', 'Themed words response is not an array');
        return [];
      }

      // Filter and validate words
      const filteredWords = parsed
        .filter(w => typeof w === 'string')
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length >= 3 && w.length <= 10 && /^[a-zA-Z\u00C0-\u024F\u0590-\u05FF]+$/.test(w));

      return filteredWords;
    } catch (error) {
      logger.error('AI_SERVICE', `generateThemedBoard error: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Check if the service is properly configured and ready.
   */
  async isConfigured() {
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
  getStatus() {
    return {
      vertexAI: this.vertexAI !== null,
      supabase: this.supabaseAdmin !== null,
      error: this.initError?.message || null,
      tokenUsage: getTokenUsage(),
      cacheStats: validationCache.getStats(),
    };
  }

  /**
   * Get current token usage statistics
   */
  getTokenUsage() {
    return getTokenUsage();
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage() {
    resetTokenUsage();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return validationCache.getStats();
  }

  /**
   * Clear the validation cache
   */
  clearCache() {
    validationCache.clear();
    logger.info('AI_SERVICE', 'Validation cache cleared');
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

const gameAIService = new GameAIService();

module.exports = {
  gameAIService,
  GameAIService,
  // Expose cache and token tracking for monitoring
  getTokenUsage,
  resetTokenUsage,
  getCacheStats: () => validationCache.getStats(),
  clearCache: () => validationCache.clear(),
};
