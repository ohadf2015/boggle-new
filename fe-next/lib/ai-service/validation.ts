/**
 * Word Validation Logic
 * Handles word validation using Vertex AI and database caching
 */

import type { GenAIModel, GenAIContentResult } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  WordValidationResponseSchema,
  MIN_CONFIDENCE_THRESHOLD,
  RETRY_CONFIG,
  AI_TIMEOUT_CONFIG,
  LANGUAGE_NAMES,
  type WordValidationResult,
} from './types';
import { validationCache } from './cache';
import logger from '@/backend/utils/logger';

/**
 * Check if word exists in community_words table (host/AI approved).
 */
export async function checkCommunityWords(
  supabaseAdmin: SupabaseClient | null,
  word: string,
  language: string
): Promise<boolean> {
  if (!supabaseAdmin) return false;

  const { data, error } = await supabaseAdmin
    .from('community_words')
    .select('id')
    .eq('word', word)
    .eq('language', language)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.debug('AI_SERVICE', ' community_words lookup error:', error.message);
    return false;
  }

  return data !== null;
}

/**
 * Check if word is crowd-validated in word_scores table (net_score >= 6).
 */
export async function checkWordScores(
  supabaseAdmin: SupabaseClient | null,
  word: string,
  language: string
): Promise<boolean> {
  if (!supabaseAdmin) return false;

  const { data, error} = await supabaseAdmin
    .from('word_scores')
    .select('id')
    .eq('word', word)
    .eq('language', language)
    .eq('is_potentially_valid', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.debug('AI_SERVICE', ' word_scores lookup error:', error.message);
    return false;
  }

  return data !== null;
}

/**
 * Save a valid word to community_words table.
 * Uses upsert to handle race conditions.
 */
export async function saveToCommunityWords(
  supabaseAdmin: SupabaseClient | null,
  word: string,
  language: string
): Promise<void> {
  if (!supabaseAdmin) return;

  const now = new Date().toISOString();

  // First try to insert
  const { error: insertError } = await supabaseAdmin
    .from('community_words')
    .insert({
      word,
      language,
      approval_count: 1,
      first_approved_at: now,
      last_approved_at: now,
    });

  // If unique constraint violation, update approval count
  if (insertError?.code === '23505') {
    const { error: updateError } = await supabaseAdmin
      .from('community_words')
      .update({
        last_approved_at: now,
      })
      .eq('word', word)
      .eq('language', language);

    if (updateError) {
      logger.debug('AI_SERVICE', ' Failed to update community_words:', updateError.message);
    }
  } else if (insertError) {
    logger.debug('AI_SERVICE', ' Failed to insert community_words:', insertError.message);
  }
}

/**
 * Validate word using Vertex AI (Gemini 1.5 Flash).
 */
export async function validateWithAI(
  model: GenAIModel,
  word: string,
  language: string,
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operationName: string) => Promise<T>
): Promise<{ isValid: boolean; reason: string; confidence: number }> {
  const languageName = LANGUAGE_NAMES[language] || language;
  const isHebrew = language === 'he';

  // Hebrew-specific instruction
  const hebrewFinalLettersNote = isHebrew ? `
IMPORTANT FOR HEBREW: The game board does NOT have final Hebrew letters (sofit letters: ך, ם, ן, ף, ץ).
Players type using regular letters (כ, מ, נ, פ, צ) even at the end of words.
When validating, treat words written with regular letters at the end as if they were written with final letters.
For example: "שלומ" should be considered as "שלום" (valid word).
Do NOT reject words just because they use regular letters instead of final forms at the end.
` : '';

  const responseLanguageNote = `
RESPONSE LANGUAGE: Provide the "reason" field in ${languageName}.`;

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
    let result: GenAIContentResult;
    try {
      const aiPromise = model.generateContent(prompt);
      result = await withTimeout(aiPromise, AI_TIMEOUT_CONFIG.singleValidation, 'Word validation');
    } catch (sdkError) {
      // Catch SyntaxError from SDK when Vertex AI returns HTML (rate limit page)
      if (sdkError instanceof SyntaxError) {
        const htmlError = new Error(`AI returned HTML instead of JSON (possible rate limit): ${sdkError.message}`);
        htmlError.name = 'HTMLResponseError';
        throw htmlError;
      }
      throw sdkError;
    }

    const response = result.response;
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const partialText = candidate?.content?.parts?.[0]?.text || '';

    // Handle non-successful finish reasons
    if (finishReason && finishReason !== 'STOP') {
      logger.debug('AI_SERVICE', `Non-standard finish reason for "${word}": ${finishReason}`);

      // MAX_TOKENS: Response was cut off - retry
      if (finishReason === 'MAX_TOKENS') {
        const error = new Error('AI response truncated due to MAX_TOKENS');
        error.name = 'TruncatedResponseError';
        throw error;
      }

      // SAFETY/RECITATION/OTHER: Try to recover partial response
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'OTHER') {
        if (partialText) {
          const partialMatch = partialText.match(/"isValid"\s*:\s*(true|false)/i);
          if (partialMatch) {
            const isValid = partialMatch[1].toLowerCase() === 'true';
            return {
              isValid,
              reason: `Word ${isValid ? 'accepted' : 'rejected'} (partial response)`,
              confidence: isValid ? 70 : 60
            };
          }
        }
        return { isValid: false, reason: 'AI validation inconclusive', confidence: 0 };
      }
    }

    let text = partialText;

    // Strip markdown code blocks
    text = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

    // Check if response is HTML instead of JSON
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || text.includes('<!DOCTYPE html>')) {
      const error = new Error('AI returned HTML instead of JSON (possible rate limit or auth error)');
      error.name = 'HTMLResponseError';
      throw error;
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    // Try to recover from incomplete response
    if (!jsonMatch) {
      const partialMatch = text.match(/\{\s*"isValid"\s*:\s*(true|false)/i);
      if (partialMatch) {
        const isValid = partialMatch[1].toLowerCase() === 'true';
        return {
          isValid,
          reason: isValid ? 'Word accepted' : 'Word not recognized',
          confidence: isValid ? 75 : 60
        };
      }

      return { isValid: false, reason: 'Failed to parse AI response', confidence: 0 };
    }

    // Parse and validate with zod
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Try to recover from malformed JSON
      const incompleteMatch = text.match(/"isValid"\s*:\s*(true|false)/i);
      if (incompleteMatch) {
        const isValid = incompleteMatch[1].toLowerCase() === 'true';
        return {
          isValid,
          reason: isValid ? 'Word accepted' : 'Word not recognized',
          confidence: isValid ? 75 : 60
        };
      }
      throw parseError;
    }

    const validated = WordValidationResponseSchema.parse(parsed);

    // Apply confidence threshold
    if (validated.isValid && validated.confidence < MIN_CONFIDENCE_THRESHOLD) {
      return {
        isValid: false,
        reason: `Confidence too low (${validated.confidence}%) - need ${MIN_CONFIDENCE_THRESHOLD}%+ to approve`,
        confidence: validated.confidence
      };
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info('AI_SERVICE', ' AI response schema validation failed:', error.issues);
      return { isValid: false, reason: 'Invalid AI response format', confidence: 0 };
    }
    throw error;
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorName = error.name?.toLowerCase() || '';
    const message = error.message.toLowerCase();
    return (
      errorName === 'htmlresponseerror' ||
      errorName === 'truncatedresponseerror' ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('truncated') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('unavailable') ||
      message.includes('unexpected token') ||
      message.includes('<!doctype') ||
      message.includes('is not valid json') ||
      message.includes('syntaxerror') ||
      message.includes('html instead of json')
    );
  }
  return false;
}

/**
 * Execute an async function with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const retryable = isRetryableError(error);

      if (!retryable || attempt === RETRY_CONFIG.maxRetries - 1) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.debug('AI_SERVICE', `${operationName} failed after ${attempt + 1} attempts:`, msg);
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelayMs
      );

      logger.debug('AI_SERVICE', `${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Fast check: Only cache and database, NO AI call.
 */
export async function checkDatabaseOnly(
  supabaseAdmin: SupabaseClient | null,
  word: string,
  language: string,
  minWordLength: number = 2
): Promise<{ isValid: boolean; source: 'database' | 'unknown' }> {
  const normalizedWord = word.toLowerCase().trim();

  if (!normalizedWord || normalizedWord.length < minWordLength) {
    return { isValid: false, source: 'database' };
  }

  try {
    // Check in-memory cache first
    const cached = validationCache.get(normalizedWord, language);
    if (cached) {
      return { isValid: cached.isValid, source: 'database' };
    }

    // Check community_words
    const inCommunityWords = await checkCommunityWords(supabaseAdmin, normalizedWord, language);
    if (inCommunityWords) {
      validationCache.set(normalizedWord, language, { isValid: true });
      return { isValid: true, source: 'database' };
    }

    // Check word_scores
    const inWordScores = await checkWordScores(supabaseAdmin, normalizedWord, language);
    if (inWordScores) {
      validationCache.set(normalizedWord, language, { isValid: true });
      return { isValid: true, source: 'database' };
    }

    // Not in database - needs AI validation
    return { isValid: false, source: 'unknown' };
  } catch (error) {
    logger.debug('AI_SERVICE', ' checkDatabaseOnly error:', error);
    return { isValid: false, source: 'unknown' };
  }
}
