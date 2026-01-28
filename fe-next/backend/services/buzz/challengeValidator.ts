/**
 * Challenge Validator for Daily Buzz
 * Validates and normalizes generated challenges
 */

import {
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
  WORDLE_WORD_LENGTH,
} from './constants';
import type { BuzzChallenge, ParsedAIResponse, SocialContent } from './types';
import { isSportsRelatedChallenge } from './trendsService';
import { repairTruncatedJson } from './utils';

/**
 * Field name mappings for normalizing AI output variations
 * AI models sometimes use slightly different field names than expected
 */
const FIELD_NAME_MAPPINGS: Record<string, string> = {
  // trend_topic variants
  trending_topic: 'trend_topic',
  trend: 'trend_topic',
  topic: 'trend_topic',
  // prompt variants
  clue: 'prompt',
  question: 'prompt',
  // trending_context variants
  context: 'trending_context',
  trend_context: 'trending_context',
};

/**
 * Normalize challenge field names from common AI variations
 * Maps fields like 'trending_topic' -> 'trend_topic', 'clue' -> 'prompt'
 * Also flattens nested 'data' objects that some AI models produce
 */
function normalizeChallengeFields(challenge: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // First, flatten nested 'data' object if present
  // Some AI models return: { type, prompt, data: { trend_topic, answer, ... } }
  // We need to flatten this to: { type, prompt, trend_topic, answer, ... }
  const flattenedChallenge: Record<string, unknown> = { ...challenge };
  if (challenge.data && typeof challenge.data === 'object' && !Array.isArray(challenge.data)) {
    const dataObj = challenge.data as Record<string, unknown>;
    for (const [key, value] of Object.entries(dataObj)) {
      // Only copy if the key doesn't already exist at the top level
      if (!(key in flattenedChallenge)) {
        flattenedChallenge[key] = value;
      }
    }
    // Remove the data key after flattening
    delete flattenedChallenge.data;
  }

  // Then apply field name normalization
  for (const [key, value] of Object.entries(flattenedChallenge)) {
    const normalizedKey = FIELD_NAME_MAPPINGS[key] || key;
    // Don't overwrite if the correct field already exists
    if (!(normalizedKey in normalized)) {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

/**
 * Validate challenges for basic sanity checks
 * NOTE: Dictionary validation removed - Buzz challenges use trending topic words
 * that may not exist in the game dictionary
 */
export function validateChallenges(
  challenges: BuzzChallenge[],
  language: string
): BuzzChallenge[] {
  const minLength = MIN_ANSWER_LENGTH[language] || 3;
  const rejectionReasons: Record<string, string[]> = {
    'invalid_length': [],
  };

  // NOTE: Brand name filtering disabled - we now allow brand/company names as answers
  // since trending topics often include brands that make engaging challenges

  const validatedChallenges = challenges.filter((challenge) => {
    const answer = challenge.answer;

    // Special validation for wordle_guess: must be exactly 5 letters
    if (challenge.type === 'wordle_guess') {
      if (answer.length !== WORDLE_WORD_LENGTH) {
        rejectionReasons['invalid_length'].push(`${answer} (${answer.length} letters, need ${WORDLE_WORD_LENGTH})`);
        console.warn(`[BUZZ] Wordle answer must be exactly ${WORDLE_WORD_LENGTH} letters: "${answer}" (${answer.length} letters)`);
        return false;
      }
    } else {
      if (answer.length < minLength || answer.length > MAX_ANSWER_LENGTH) {
        rejectionReasons['invalid_length'].push(`${answer} (${answer.length} letters, need ${minLength}-${MAX_ANSWER_LENGTH})`);
        console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters, min ${minLength} for ${language})`);
        return false;
      }
    }

    return true;
  });

  if (validatedChallenges.length < 5) {
    // Log detailed rejection summary
    console.error(`[BUZZ] Validation failed for ${language}:`);
    console.error(`  Total challenges: ${challenges.length}`);
    console.error(`  Passed: ${validatedChallenges.length}`);
    console.error(`  Rejected: ${challenges.length - validatedChallenges.length}`);

    if (rejectionReasons['invalid_length'].length > 0) {
      console.error(`  Invalid length (${rejectionReasons['invalid_length'].length}):`, rejectionReasons['invalid_length']);
    }

    throw new Error(`Insufficient validated challenges: got ${validatedChallenges.length}, need 5`);
  }

  // Enforce max 1 sport riddle constraint
  const sportsRiddles = validatedChallenges.filter(
    c => c.type === 'riddle' && isSportsRelatedChallenge(c)
  );
  if (sportsRiddles.length > 1) {
    console.warn(`[BUZZ] Too many sports riddles (${sportsRiddles.length}), keeping only the first one`);
    let foundFirst = false;
    return validatedChallenges.filter(c => {
      if (c.type === 'riddle' && isSportsRelatedChallenge(c)) {
        if (foundFirst) return false;
        foundFirst = true;
      }
      return true;
    });
  }

  return validatedChallenges;
}

/**
 * Validate a single challenge without minimum count requirement
 * NOTE: Brand name filtering disabled - we now allow brand/company names as answers
 */
export function validateSingleChallenge(
  challenge: BuzzChallenge,
  language: string
): boolean {
  const answer = challenge.answer;
  const minLength = MIN_ANSWER_LENGTH[language] || 3;

  if (challenge.type === 'wordle_guess') {
    if (answer.length !== WORDLE_WORD_LENGTH) {
      console.warn(`[BUZZ] Wordle answer must be exactly ${WORDLE_WORD_LENGTH} letters: "${answer}" (${answer.length} letters)`);
      return false;
    }
  } else {
    if (answer.length < minLength || answer.length > MAX_ANSWER_LENGTH) {
      console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters, min ${minLength} for ${language})`);
      return false;
    }
  }

  return true;
}

/**
 * Normalize fill_blank challenges to have correct underscore count
 */
export function normalizeBlankSizes(challenges: BuzzChallenge[]): BuzzChallenge[] {
  return challenges.map(challenge => {
    if (challenge.type !== 'fill_blank') return challenge;

    const answerLength = challenge.answer.replace(/\s/g, '').length;
    const spacedBlanks = Array(answerLength).fill('_').join(' ');

    let normalizedPrompt = challenge.prompt
      .replace(/_{3,}/g, spacedBlanks)
      .replace(/\*{3,}/g, spacedBlanks)
      .replace(/\.{3,}/g, spacedBlanks)
      .replace(/(\s*_\s*)+/g, (match) => {
        const existingCount = (match.match(/_/g) || []).length;
        if (existingCount !== answerLength) {
          return ` ${spacedBlanks} `;
        }
        return match;
      });

    const letterCountPattern = /\((\d+)\s*letters?\)/i;
    if (letterCountPattern.test(normalizedPrompt)) {
      normalizedPrompt = normalizedPrompt.replace(
        letterCountPattern,
        `(${answerLength} letters)`
      );
    } else {
      normalizedPrompt = `${normalizedPrompt.trim()} (${answerLength} letters)`;
    }

    return {
      ...challenge,
      prompt: normalizedPrompt.replace(/\s+/g, ' ').trim(),
    };
  });
}

/**
 * Parse AI response into structured challenges and social content
 */
export function parseAIResponse(responseText: string): ParsedAIResponse {
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
  }

  let parsed: { challenges?: BuzzChallenge[]; social_content?: SocialContent; date?: string; language?: string; trending_summary?: string };
  try {
    parsed = JSON.parse(jsonText);
    console.log('[BUZZ] Parsed JSON keys:', Object.keys(parsed));
  } catch (firstError: unknown) {
    const firstErrorMsg = firstError instanceof Error ? firstError.message : 'Unknown error';
    console.warn('[BUZZ] Initial JSON parse failed:', firstErrorMsg);

    if (firstErrorMsg.includes('Unterminated') || firstErrorMsg.includes('Unexpected end')) {
      console.log('[BUZZ] Attempting to repair truncated JSON...');
      const repaired = repairTruncatedJson(jsonText);

      try {
        parsed = JSON.parse(repaired);
        console.log('[BUZZ] Successfully parsed repaired JSON');
      } catch (repairError: unknown) {
        const repairErrorMsg = repairError instanceof Error ? repairError.message : 'Unknown error';
        console.error('[BUZZ] Failed to parse repaired JSON:', repairErrorMsg);
        console.error('[BUZZ] Raw response (first 500 chars):', responseText.substring(0, 500));
        throw new Error(`Failed to parse AI-generated challenges: ${firstErrorMsg}`);
      }
    } else {
      console.error('[BUZZ] Failed to parse AI response:', firstErrorMsg);
      console.error('[BUZZ] Raw response (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Failed to parse AI-generated challenges: ${firstErrorMsg}`);
    }
  }

  if (!parsed.challenges || !Array.isArray(parsed.challenges)) {
    console.error('[BUZZ] Invalid response format: missing challenges array');
    console.error('[BUZZ] Parsed object keys:', Object.keys(parsed));
    console.error('[BUZZ] Raw parsed content (first 1000 chars):', JSON.stringify(parsed).substring(0, 1000));
    throw new Error('Invalid response format: missing challenges array');
  }

  console.log(`[BUZZ] AI returned ${parsed.challenges.length} challenges, validating structure...`);
  if (parsed.challenges.length > 0) {
    console.log('[BUZZ] First challenge example:', JSON.stringify(parsed.challenges[0], null, 2));
  }

  // Normalize field names before validation (handles AI variations like 'trending_topic' -> 'trend_topic')
  const normalizedRawChallenges = parsed.challenges.map((challenge) =>
    normalizeChallengeFields(challenge as unknown as Record<string, unknown>)
  ) as unknown as Partial<BuzzChallenge>[];

  const validChallenges = normalizedRawChallenges.filter((challenge: Partial<BuzzChallenge>, index: number) => {
    const missingFields: string[] = [];
    if (!challenge.type) missingFields.push('type');
    if (!challenge.trend_topic) missingFields.push('trend_topic');
    if (!challenge.prompt) missingFields.push('prompt');
    if (!challenge.answer) missingFields.push('answer');
    if (!challenge.difficulty) missingFields.push('difficulty');
    if (!challenge.trending_context) missingFields.push('trending_context');

    if (missingFields.length > 0) {
      console.warn(`[BUZZ] Challenge ${index} missing required fields: ${missingFields.join(', ')}`);
      console.warn(`[BUZZ] Challenge ${index} has fields:`, Object.keys(challenge));
      return false;
    }
    return true;
  }) as BuzzChallenge[];

  if (validChallenges.length < 5) {
    console.error(`[BUZZ] Structure validation: ${validChallenges.length}/${parsed.challenges.length} passed`);
    throw new Error(`Insufficient valid challenges: got ${validChallenges.length}, need 5`);
  }

  const normalizedChallenges = normalizeBlankSizes(validChallenges);

  let socialContent: SocialContent | null = null;
  if (parsed.social_content) {
    const sc = parsed.social_content;
    if (
      sc.x?.text && Array.isArray(sc.x?.hashtags) &&
      sc.instagram?.text && Array.isArray(sc.instagram?.hashtags) &&
      sc.tiktok?.text && Array.isArray(sc.tiktok?.hashtags)
    ) {
      socialContent = {
        x: { text: sc.x.text, hashtags: sc.x.hashtags },
        instagram: { text: sc.instagram.text, hashtags: sc.instagram.hashtags },
        tiktok: { text: sc.tiktok.text, hashtags: sc.tiktok.hashtags },
      };
      console.log('[BUZZ] Social content parsed successfully');
    } else {
      console.warn('[BUZZ] Social content structure invalid, skipping');
    }
  } else {
    console.warn('[BUZZ] No social content in AI response');
  }

  return {
    challenges: normalizedChallenges,
    social_content: socialContent,
  };
}
