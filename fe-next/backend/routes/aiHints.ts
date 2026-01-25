/**
 * AI Hint Generation API
 * Generates progressive hints for Word Hunt Survival Mode using Vertex AI (Gemini)
 *
 * This endpoint provides:
 * 1. Progressive letter-reveal hints (algorithmic)
 * 2. AI-generated category classification
 * 3. AI-generated example sentences
 * 4. Word type and difficulty metadata
 * 5. Letters to eliminate (wrong letters not in word)
 *
 * The hints themselves use a deterministic algorithm to ensure consistency,
 * while AI enhances the experience with semantic information.
 */

import { Router, Request, Response } from 'express';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { z } from 'zod';
import logger from '../utils/logger';

const router = Router();

// ============================================
// Configuration and Types
// ============================================

// Google Cloud credentials interface
interface GoogleCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

/**
 * Parse Google Cloud credentials from JSON string environment variable.
 */
function parseGoogleCredentials(): GoogleCredentials | null {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    logger.warn('API', 'GOOGLE_CREDENTIALS_JSON not set - AI hints will use fallback');
    return null;
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

    const requiredFields: (keyof GoogleCredentials)[] = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field in credentials: ${field}`);
      }
    }

    // Handle escaped newlines in private_key
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return credentials;
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error('API', `GOOGLE_CREDENTIALS_JSON contains malformed JSON: ${error.message}`);
    } else {
      logger.error('API', `Failed to parse Google credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return null;
  }
}

// Initialize Vertex AI client
let vertexAI: VertexAI | null = null;
let geminiModel: GenerativeModel | null = null;

const credentials = parseGoogleCredentials();
if (credentials) {
  try {
    vertexAI = new VertexAI({
      project: credentials.project_id,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      googleAuthOptions: {
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        projectId: credentials.project_id,
      },
    });

    geminiModel = vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.3, // Low temperature for consistent JSON output
      },
    });

    logger.info('API', 'Vertex AI initialized for hint generation');
  } catch (error) {
    logger.error('API', `Failed to initialize Vertex AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// LRU-style cache with proper typing
interface CacheEntry {
  data: HintGenerationResponse;
  timestamp: number;
  accessCount: number;
}

const hintCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Input validation schema
const generateHintsSchema = z.object({
  targetWord: z.string().min(2).max(20).regex(/^[a-zA-Z\u0590-\u05FF\u3040-\u30FF\u4E00-\u9FAF\u00C0-\u017F]+$/),
  language: z.enum(['en', 'he', 'sv', 'ja', 'es', 'fr', 'de']).default('en'),
});

// Response validation schema for AI output
const aiResponseSchema = z.object({
  category: z.string().min(1).max(100),
  exampleSentence: z.string().min(5).max(200),
  wordType: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  lettersToEliminate: z.array(z.string().length(1)).max(10).optional(),
});

interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number;
}

interface HintGenerationResponse {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
  wordType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lettersToEliminate?: string[];
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// Language configuration
const LANGUAGE_CONFIG: Record<string, { name: string; vowels: string[]; alphabet: string }> = {
  en: {
    name: 'English',
    vowels: ['A', 'E', 'I', 'O', 'U'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  he: {
    name: 'Hebrew',
    vowels: ['א', 'ע', 'י', 'ו'],
    alphabet: 'אבגדהוזחטיכלמנסעפצקרשת'
  },
  sv: {
    name: 'Swedish',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'
  },
  ja: {
    name: 'Japanese',
    vowels: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'],
    alphabet: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
  },
  es: {
    name: 'Spanish',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'],
    alphabet: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'
  },
  fr: {
    name: 'French',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  de: {
    name: 'German',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'
  },
};

// Hint unlock costs
const HINT_UNLOCK_COSTS = {
  LEVEL_1: 0,
  LEVEL_2: 4,
  LEVEL_3: 8,
  LEVEL_4: 12,
  LEVEL_5: 16,
} as const;

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Timeout configuration for AI operations (prevents indefinite hangs)
const AI_HINT_TIMEOUT_MS = 20_000; // 20 seconds per attempt

/**
 * Wraps a promise with a timeout to prevent indefinite hangs.
 * This is critical for AI calls which can sometimes hang without responding.
 */
async function withTimeout<T>(
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

// ============================================
// Cache Management (LRU-style)
// ============================================

function getCacheKey(word: string, language: string): string {
  return `${language}:${word.toUpperCase()}`;
}

function getFromCache(word: string, language: string): HintGenerationResponse | null {
  const key = getCacheKey(word, language);
  const entry = hintCache.get(key);

  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    hintCache.delete(key);
    return null;
  }

  // Update access count for LRU tracking
  entry.accessCount++;
  return entry.data;
}

function setInCache(word: string, language: string, data: HintGenerationResponse): void {
  // LRU eviction: remove least recently accessed entries if cache is full
  if (hintCache.size >= CACHE_MAX_SIZE) {
    let minAccessKey: string | null = null;
    let minAccessCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of hintCache.entries()) {
      // Prioritize by access count, then by timestamp
      if (entry.accessCount < minAccessCount ||
          (entry.accessCount === minAccessCount && entry.timestamp < oldestTimestamp)) {
        minAccessCount = entry.accessCount;
        oldestTimestamp = entry.timestamp;
        minAccessKey = key;
      }
    }

    if (minAccessKey) {
      hintCache.delete(minAccessKey);
    }
  }

  const key = getCacheKey(word, language);
  hintCache.set(key, {
    data,
    timestamp: Date.now(),
    accessCount: 0,
  });
}

/**
 * Clean up expired cache entries (call periodically)
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of hintCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      hintCache.delete(key);
    }
  }
}

// Run cache cleanup every hour
setInterval(cleanExpiredCache, 60 * 60 * 1000);

// ============================================
// Algorithmic Hint Generation
// ============================================

/**
 * Find positions of vowels in a word
 */
function findVowelPositions(word: string, language: string): number[] {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const vowelSet = new Set(config.vowels.map(v => v.toUpperCase()));
  const positions: number[] = [];

  for (let i = 0; i < word.length; i++) {
    if (vowelSet.has(word[i].toUpperCase())) {
      positions.push(i);
    }
  }

  return positions;
}

/**
 * Generate blanks display for a word with some letters revealed
 */
function generateBlanksDisplay(word: string, revealPositions: number[]): string {
  const chars: string[] = [];
  for (let i = 0; i < word.length; i++) {
    if (revealPositions.includes(i)) {
      chars.push(word[i].toUpperCase());
    } else {
      chars.push('_');
    }
  }
  return chars.join(' ');
}

/**
 * Calculate optimal letter reveal order
 * Strategy: Vowels from end first, then consonants from end
 */
function calculateRevealOrder(word: string, language: string): number[] {
  const vowelPositions = findVowelPositions(word, language);

  // Sort vowel positions from end to start
  const vowelsFromEnd = [...vowelPositions].sort((a, b) => b - a);

  // Get consonant positions from end to start
  const consonantPositions = [...Array(word.length).keys()]
    .filter(i => !vowelPositions.includes(i))
    .sort((a, b) => b - a);

  return [...vowelsFromEnd, ...consonantPositions];
}

/**
 * Generate progressive hints algorithmically
 * Never reveals more than 50% of letters
 */
function generateAlgorithmicHints(targetWord: string, language: string): HintLevel[] {
  const word = targetWord.toUpperCase();
  const wordLength = word.length;
  const maxReveal = Math.floor(wordLength / 2);

  const revealOrder = calculateRevealOrder(word, language);
  const vowelPositions = findVowelPositions(word, language);
  const vowelsFromEnd = [...vowelPositions].sort((a, b) => b - a);

  const hints: HintLevel[] = [];

  // Level 1: All blanks
  hints.push({
    level: 1,
    hint: generateBlanksDisplay(word, []),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_1,
  });

  // Level 2: Reveal last vowel (or last letter if no vowels)
  const level2Positions = vowelsFromEnd.length > 0
    ? [vowelsFromEnd[0]]
    : [wordLength - 1];
  hints.push({
    level: 2,
    hint: generateBlanksDisplay(word, level2Positions),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_2,
  });

  if (wordLength >= 4) {
    // Level 3: ~25% of max reveal
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    const level3Positions = revealOrder.slice(0, level3Count).sort((a, b) => a - b);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(word, level3Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_3,
    });

    // Level 4: ~37.5% of max reveal
    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    const level4Positions = revealOrder.slice(0, level4Count).sort((a, b) => a - b);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(word, level4Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_4,
    });

    // Level 5: Exactly 50%
    const level5Positions = revealOrder.slice(0, maxReveal).sort((a, b) => a - b);
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(word, level5Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_5,
    });
  }

  return hints;
}

// ============================================
// AI Enhancement
// ============================================

/**
 * System prompt for word hint generation
 *
 * Design principles:
 * 1. Clear role definition with specific constraints
 * 2. Explicit JSON schema with types and validation rules
 * 3. Examples to guide consistent output format
 * 4. Strict rules to prevent common failure modes
 */
const SYSTEM_PROMPT = `You are a word game hint generator for a Boggle-style game. Your task is to create helpful hints that guide players toward guessing a target word WITHOUT making it too obvious.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no explanation, no code blocks.

JSON Schema (all fields required):
{
  "category": string,        // Hierarchical category using " > " separator (2-3 levels)
  "exampleSentence": string, // Natural sentence with ____ replacing the target word
  "wordType": string,        // One of: noun, verb, adjective, adverb
  "difficulty": string,      // One of: easy, medium, hard
  "lettersToEliminate": string[]  // 5-8 single uppercase letters NOT in the target word
}

Category Guidelines:
- Use 2-3 hierarchy levels: "Broad > Specific > Most Specific"
- Examples: "Nature > Animals > Marine Life", "Objects > Kitchen > Utensils", "Actions > Movement > Walking"
- Be specific enough to narrow down possibilities but not give away the answer

Example Sentence Guidelines:
- Write a natural, contextual sentence that hints at the word's meaning or usage
- Replace the target word with exactly four underscores: ____
- The sentence should make grammatical sense with the blank
- Avoid overly obvious clues that directly define the word
- Good: "The chef used a sharp ____ to dice the vegetables."
- Bad: "A ____ is something you cut with." (too direct)

Difficulty Classification:
- easy: Common everyday words known by most people (dog, water, happy)
- medium: Moderately common words, may require some vocabulary (eloquent, maritime)
- hard: Specialized, technical, or uncommon words (ephemeral, serendipity)

Letters to Eliminate:
- Select 5-8 common letters that are definitely NOT in the target word
- Prefer common letters (E, T, A, O, I, N, S, R) when they're not in the word
- This helps players narrow down possibilities on the game board`;

/**
 * Build the user prompt for generating word metadata
 * Uses structured format with clear expectations
 */
function buildAIPrompt(targetWord: string, language: string): string {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const languageName = config.name;

  // Build a set of letters in the word for reference
  const wordLetters = [...new Set(targetWord.toUpperCase().split(''))].join(', ');

  // Find potential letters to eliminate (not in word)
  const wordLetterSet = new Set(targetWord.toUpperCase().split(''));
  const availableToEliminate = config.alphabet
    .split('')
    .filter(l => !wordLetterSet.has(l))
    .slice(0, 15)
    .join(', ');

  return `Generate hints for the word "${targetWord}" in ${languageName}.

Word letters: ${wordLetters}
Available letters to eliminate (NOT in word): ${availableToEliminate}

Remember:
- category: Use " > " separator for 2-3 level hierarchy
- exampleSentence: Use ____ for the blank, make it natural and contextual
- wordType: noun, verb, adjective, or adverb
- difficulty: easy, medium, or hard
- lettersToEliminate: Pick 5-8 from the available letters above

Respond with JSON only.`;
}

/**
 * Parse and validate AI response with Zod schema
 *
 * Robust parsing strategy:
 * 1. Try to extract JSON from various formats (raw, code blocks, mixed text)
 * 2. Validate against schema
 * 3. Fall back to manual field extraction if schema fails
 * 4. Always sanitize lettersToEliminate against target word
 */
function parseAIResponse(
  responseText: string,
  targetWord: string
): Partial<HintGenerationResponse> {
  const defaults: Partial<HintGenerationResponse> = {
    category: 'Unknown',
    exampleSentence: '',
    wordType: undefined,
    difficulty: undefined,
    lettersToEliminate: undefined,
  };

  if (!responseText || typeof responseText !== 'string') {
    logger.warn('API', 'Empty or invalid AI response');
    return defaults;
  }

  try {
    // Clean up response text
    let jsonText = responseText.trim();

    // Strategy 1: Remove markdown code blocks if present
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    // Strategy 2: Extract JSON object (handles text before/after JSON)
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      logger.warn('API', `No JSON object found in AI response: ${responseText.substring(0, 100)}`);
      return defaults;
    }
    jsonText = objectMatch[0];

    // Strategy 3: Fix common JSON issues
    // - Trailing commas
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
    // - Single quotes to double quotes (careful with apostrophes in text)
    jsonText = jsonText.replace(/:\s*'([^']*)'/g, ': "$1"');

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch (jsonError) {
      // Strategy 4: Try to fix unquoted keys
      const fixedJson = jsonText.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      try {
        parsed = JSON.parse(fixedJson);
      } catch {
        logger.warn('API', `JSON parse failed even after fixes: ${jsonText.substring(0, 200)}`);
        return defaults;
      }
    }

    // Validate with schema
    const validated = aiResponseSchema.safeParse(parsed);

    if (!validated.success) {
      const errors = validated.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      logger.warn('API', `AI response validation failed: ${errors}`);
      // Still try to extract valid fields manually
      return extractValidFields(parsed, targetWord);
    }

    const result = validated.data;

    // Post-process lettersToEliminate to ensure they're not in the target word
    if (result.lettersToEliminate) {
      const targetLetters = new Set(targetWord.toUpperCase().split(''));
      result.lettersToEliminate = result.lettersToEliminate
        .map(l => l.toUpperCase())
        .filter(l => !targetLetters.has(l) && /^[A-Z\u0590-\u05FF\u3040-\u30FF]$/.test(l));

      // Ensure we have at least some letters
      if (result.lettersToEliminate.length === 0) {
        result.lettersToEliminate = undefined;
      }
    }

    // Validate example sentence has the blank
    if (result.exampleSentence && !result.exampleSentence.includes('____')) {
      logger.warn('API', 'Example sentence missing blank, attempting to fix');
      // Try to find and replace the target word with blanks
      const wordRegex = new RegExp(`\\b${targetWord}\\b`, 'gi');
      if (wordRegex.test(result.exampleSentence)) {
        result.exampleSentence = result.exampleSentence.replace(wordRegex, '____');
      } else {
        // Can't fix it, clear it
        result.exampleSentence = '';
      }
    }

    return result;
  } catch (error) {
    const err = error as Error;
    logger.warn('API', `Failed to parse AI response: ${err.message}`);
    return defaults;
  }
}

/**
 * Extract valid fields from a partially valid response
 */
function extractValidFields(
  parsed: Record<string, unknown>,
  targetWord: string
): Partial<HintGenerationResponse> {
  const result: Partial<HintGenerationResponse> = {
    category: 'Unknown',
    exampleSentence: '',
  };

  // Category
  if (typeof parsed.category === 'string' && parsed.category.length > 0 && parsed.category.length <= 100) {
    result.category = parsed.category;
  }

  // Example sentence
  if (typeof parsed.exampleSentence === 'string' && parsed.exampleSentence.includes('____')) {
    result.exampleSentence = parsed.exampleSentence.slice(0, 200);
  }

  // Word type
  const validWordTypes = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun'];
  if (typeof parsed.wordType === 'string' && validWordTypes.includes(parsed.wordType.toLowerCase())) {
    result.wordType = parsed.wordType.toLowerCase();
  }

  // Difficulty
  if (typeof parsed.difficulty === 'string' && ['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
    result.difficulty = parsed.difficulty as 'easy' | 'medium' | 'hard';
  }

  // Letters to eliminate
  if (Array.isArray(parsed.lettersToEliminate)) {
    const targetLetters = new Set(targetWord.toUpperCase().split(''));
    const validLetters = parsed.lettersToEliminate
      .filter((l): l is string => typeof l === 'string' && l.length === 1)
      .map(l => l.toUpperCase())
      .filter(l => !targetLetters.has(l));

    if (validLetters.length > 0) {
      result.lettersToEliminate = validLetters.slice(0, 10);
    }
  }

  return result;
}

/**
 * Delay helper for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (transient network/API issues)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on rate limits, timeouts, and server errors
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('529') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('overloaded')
    );
  }
  return false;
}

/**
 * Generate AI-enhanced hint data with retry logic
 *
 * Features:
 * - Uses Vertex AI (Gemini) for hint generation
 * - Low temperature (0.3) for reliable JSON output
 * - Exponential backoff retry for transient failures
 * - Proper error classification for retry decisions
 */
async function generateAIEnhancedData(
  targetWord: string,
  language: string
): Promise<Partial<HintGenerationResponse> & { tokenUsage?: { input: number; output: number } }> {
  if (!geminiModel) {
    logger.warn('API', 'Vertex AI not initialized - missing credentials');
    return { category: 'Unknown', exampleSentence: '' };
  }

  // Combine system prompt and user prompt for Gemini
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${buildAIPrompt(targetWord, language)}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Exponential backoff for retries
      if (attempt > 0) {
        const backoffMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.info('API', `Retry attempt ${attempt} for ${targetWord} after ${backoffMs}ms`);
        await delay(backoffMs);
      }

      // Add timeout to prevent indefinite hangs during AI hint generation
      const aiPromise = geminiModel.generateContent(fullPrompt);
      const result = await withTimeout(aiPromise, AI_HINT_TIMEOUT_MS, 'AI hint generation');
      const response = result.response;
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = parseAIResponse(text, targetWord);

      // Estimate token usage (Gemini doesn't always provide exact counts)
      const tokenUsage = {
        input: Math.ceil(fullPrompt.length / 4),
        output: Math.ceil(text.length / 4),
      };

      logger.debug('API', `AI response for ${targetWord}: ${text.substring(0, 100)}...`);

      return {
        ...parsed,
        tokenUsage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on transient errors
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        logger.error('API', `AI hint generation failed for ${targetWord}: ${lastError.message}`);
        break;
      }

      logger.warn('API', `Retryable error for ${targetWord}: ${lastError.message}`);
    }
  }

  // Return fallback on all failures
  return { category: 'Unknown', exampleSentence: '' };
}

// ============================================
// Fallback Hint Generation
// ============================================

/**
 * Generate complete fallback hints when AI is unavailable
 */
function generateFallbackHints(targetWord: string, language: string = 'en'): HintGenerationResponse {
  const hints = generateAlgorithmicHints(targetWord, language);

  // Generate a simple example sentence
  const templates: Record<string, string[]> = {
    en: [
      `I saw a beautiful ____ today.`,
      `The ____ was quite impressive.`,
      `Have you ever seen such a ____?`,
    ],
    he: [
      `ראיתי ____ יפה היום.`,
      `ה____ היה מרשים מאוד.`,
    ],
    sv: [
      `Jag såg en vacker ____ idag.`,
      `____ var mycket imponerande.`,
    ],
    ja: [
      `今日、美しい____を見ました。`,
      `その____はとても印象的でした。`,
    ],
    es: [
      `Hoy vi un hermoso ____.`,
      `El ____ era muy impresionante.`,
    ],
    fr: [
      `J'ai vu un beau ____ aujourd'hui.`,
      `Le ____ était très impressionnant.`,
    ],
    de: [
      `Ich habe heute einen schönen ____ gesehen.`,
      `Der ____ war sehr beeindruckend.`,
    ],
  };

  const langTemplates = templates[language] || templates.en;
  const exampleSentence = langTemplates[Math.floor(Math.random() * langTemplates.length)];

  return {
    hints,
    category: 'Unknown',
    exampleSentence,
  };
}

// ============================================
// API Route Handler
// ============================================

/**
 * POST /api/generate-word-hints
 * Generate progressive AI hints for a target word
 *
 * Request body:
 * {
 *   targetWord: string,   // The word to generate hints for (required)
 *   language: string      // Language code: en, he, sv, ja, es, fr, de (optional, defaults to en)
 * }
 *
 * Response:
 * {
 *   hints: HintLevel[],      // Progressive letter-reveal hints
 *   category: string,        // Semantic category path
 *   exampleSentence: string, // Example sentence with word blanked
 *   wordType?: string,       // Part of speech
 *   difficulty?: string      // easy, medium, or hard
 * }
 */
router.post('/generate-word-hints', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    // Validate input
    const parseResult = generateHintsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.issues.map(e => e.message),
      });
      return;
    }

    const { targetWord, language } = parseResult.data;
    const normalizedWord = targetWord.toUpperCase().trim();

    // Check cache first
    const cached = getFromCache(normalizedWord, language);
    if (cached) {
      logger.info('API', `Hint cache hit for ${language}:${normalizedWord}`);
      res.json(cached);
      return;
    }

    // Generate algorithmic hints (always consistent)
    const hints = generateAlgorithmicHints(normalizedWord, language);

    // Check if AI is available
    if (!geminiModel) {
      logger.warn('API', 'AI service not configured, using fallback hints');
      const fallback = generateFallbackHints(normalizedWord, language);
      res.json(fallback);
      return;
    }

    // Get AI-enhanced metadata
    const aiData = await generateAIEnhancedData(normalizedWord, language);

    // Generate fallback letters to eliminate if AI didn't provide them
    let lettersToEliminate = aiData.lettersToEliminate;
    if (!lettersToEliminate || lettersToEliminate.length === 0) {
      const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
      const wordLetterSet = new Set(normalizedWord.split(''));
      lettersToEliminate = config.alphabet
        .split('')
        .filter(l => !wordLetterSet.has(l))
        .sort(() => Math.random() - 0.5) // Shuffle
        .slice(0, 6);
    }

    // Combine algorithmic hints with AI metadata
    const response: HintGenerationResponse = {
      hints,
      category: aiData.category || 'Unknown',
      exampleSentence: aiData.exampleSentence || generateFallbackHints(normalizedWord, language).exampleSentence,
      wordType: aiData.wordType,
      difficulty: aiData.difficulty as 'easy' | 'medium' | 'hard' | undefined,
      lettersToEliminate,
      tokenUsage: aiData.tokenUsage,
    };

    // Cache the result (without token usage to save memory)
    const cacheResponse = { ...response };
    delete cacheResponse.tokenUsage;
    setInCache(normalizedWord, language, cacheResponse);

    const duration = Date.now() - startTime;
    logger.info('API', `Generated hints for ${language}:${normalizedWord} in ${duration}ms`);

    res.json(response);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Hint generation error: ${err.message}`);

    // Return fallback hints on error
    const { targetWord = 'WORD', language = 'en' } = req.body || {};
    const fallback = generateFallbackHints(
      typeof targetWord === 'string' ? targetWord : 'WORD',
      typeof language === 'string' ? language : 'en'
    );
    res.json(fallback);
  }
});

/**
 * GET /api/generate-word-hints/health
 * Health check endpoint
 */
router.get('/generate-word-hints/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    aiConfigured: !!geminiModel,
    aiProvider: 'vertex-ai',
    cacheSize: hintCache.size,
  });
});

export default router;
