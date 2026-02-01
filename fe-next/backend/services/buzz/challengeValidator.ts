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
 * Validate that the answer does not appear in trend_topic or trending_context
 * This prevents spoilers where users can see the answer in the challenge context
 *
 * @param challenge - The challenge to validate
 * @returns true if the answer is NOT spoiled, false if it IS spoiled
 */
export function validateAnswerNotSpoiled(challenge: BuzzChallenge): boolean {
  const answer = challenge.answer.toLowerCase();
  const trendTopic = challenge.trend_topic.toLowerCase();
  const trendingContext = challenge.trending_context.toLowerCase();

  // For short answers (2-3 chars), only match as whole word to avoid false positives
  // e.g., "AI" in "EMAIL" should not be a match
  if (answer.length <= 3) {
    // Use word boundary regex for short answers
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(answer)}\\b`, 'i');
    if (wordBoundaryRegex.test(trendTopic)) {
      console.warn(`[BUZZ] Answer spoiler detected: "${answer}" found as word in trend_topic "${challenge.trend_topic}"`);
      return false;
    }
    if (wordBoundaryRegex.test(trendingContext)) {
      console.warn(`[BUZZ] Answer spoiler detected: "${answer}" found as word in trending_context "${challenge.trending_context}"`);
      return false;
    }
  } else {
    // For longer answers, check if it appears anywhere (including as substring)
    if (trendTopic.includes(answer)) {
      console.warn(`[BUZZ] Answer spoiler detected: "${answer}" found in trend_topic "${challenge.trend_topic}"`);
      return false;
    }
    if (trendingContext.includes(answer)) {
      console.warn(`[BUZZ] Answer spoiler detected: "${answer}" found in trending_context "${challenge.trending_context}"`);
      return false;
    }
  }

  return true;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  const wordleLength = WORDLE_WORD_LENGTH[language] || 5;
  const rejectionReasons: Record<string, string[]> = {
    'invalid_length': [],
    'answer_spoiled': [],
  };

  // NOTE: Brand name filtering disabled - we now allow brand/company names as answers
  // since trending topics often include brands that make engaging challenges

  const validatedChallenges = challenges.filter((challenge) => {
    const answer = challenge.answer;

    // Special validation for wordle_guess: must match language-specific length
    if (challenge.type === 'wordle_guess') {
      if (answer.length !== wordleLength) {
        rejectionReasons['invalid_length'].push(`${answer} (${answer.length} letters, need ${wordleLength})`);
        console.warn(`[BUZZ] Wordle answer must be exactly ${wordleLength} letters for ${language}: "${answer}" (${answer.length} letters)`);
        return false;
      }
    } else {
      if (answer.length < minLength || answer.length > MAX_ANSWER_LENGTH) {
        rejectionReasons['invalid_length'].push(`${answer} (${answer.length} letters, need ${minLength}-${MAX_ANSWER_LENGTH})`);
        console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters, min ${minLength} for ${language})`);
        return false;
      }
    }

    // Validate that answer is not spoiled in topic or context
    if (!validateAnswerNotSpoiled(challenge)) {
      rejectionReasons['answer_spoiled'].push(`${answer} (found in topic or context)`);
      return false;
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
    if (rejectionReasons['answer_spoiled'].length > 0) {
      console.error(`  Answer spoiled (${rejectionReasons['answer_spoiled'].length}):`, rejectionReasons['answer_spoiled']);
    }

    throw new Error(`Insufficient validated challenges: got ${validatedChallenges.length}, need 5`);
  }

  // Enforce at least one wordle_guess challenge requirement
  const hasWordleGuess = validatedChallenges.some(c => c.type === 'wordle_guess');
  if (!hasWordleGuess) {
    console.error(`[BUZZ] Missing wordle_guess challenge - Daily Buzz requires at least one`);
    throw new Error('Daily Buzz must include at least one wordle_guess challenge');
  }

  // Enforce max 1 sport riddle constraint
  const sportsRiddles = validatedChallenges.filter(
    c => c.type === 'riddle' && isSportsRelatedChallenge(c)
  );
  let finalChallenges = validatedChallenges;
  if (sportsRiddles.length > 1) {
    console.warn(`[BUZZ] Too many sports riddles (${sportsRiddles.length}), keeping only the first one`);
    let foundFirst = false;
    finalChallenges = validatedChallenges.filter(c => {
      if (c.type === 'riddle' && isSportsRelatedChallenge(c)) {
        if (foundFirst) return false;
        foundFirst = true;
      }
      return true;
    });
  }

  // Limit to best 7 challenges (AI generates 10-15 for buffer, we take top 7)
  if (finalChallenges.length > 7) {
    console.log(`[BUZZ] Generated ${finalChallenges.length} validated challenges, selecting best 7`);
    finalChallenges = finalChallenges.slice(0, 7);
  }

  return finalChallenges;
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
  const wordleLength = WORDLE_WORD_LENGTH[language] || 5;

  if (challenge.type === 'wordle_guess') {
    if (answer.length !== wordleLength) {
      console.warn(`[BUZZ] Wordle answer must be exactly ${wordleLength} letters for ${language}: "${answer}" (${answer.length} letters)`);
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
 * and add first letter hint to guide guessing
 */
export function normalizeBlankSizes(challenges: BuzzChallenge[]): BuzzChallenge[] {
  return challenges.map(challenge => {
    if (challenge.type !== 'fill_blank') return challenge;

    const answerWithoutSpaces = challenge.answer.replace(/\s/g, '');
    const answerLength = answerWithoutSpaces.length;
    const firstLetter = answerWithoutSpaces.charAt(0).toUpperCase();

    // Create blank pattern with first letter hint: "S _ _ _ _" for 5-letter answer
    const remainingBlanks = Array(answerLength - 1).fill('_').join(' ');
    const blanksWithFirstLetter = `${firstLetter} ${remainingBlanks}`;

    // Check if first letter is already present in the prompt
    const hasFirstLetterHint = new RegExp(`${escapeRegex(firstLetter)}\\s+(_\\s*)+`, 'i').test(challenge.prompt);

    let normalizedPrompt = challenge.prompt;

    if (hasFirstLetterHint) {
      // First letter already present, just normalize underscore count
      normalizedPrompt = normalizedPrompt.replace(
        new RegExp(`${escapeRegex(firstLetter)}(\\s*_\\s*)+`, 'gi'),
        blanksWithFirstLetter
      );
    } else {
      // Replace blank patterns with first letter + remaining blanks
      normalizedPrompt = normalizedPrompt
        .replace(/_{3,}/g, blanksWithFirstLetter)
        .replace(/\*{3,}/g, blanksWithFirstLetter)
        .replace(/\.{3,}/g, blanksWithFirstLetter)
        .replace(/(\s*_\s*)+/g, (match) => {
          const existingCount = (match.match(/_/g) || []).length;
          // Only replace if count doesn't match or count is exact but no first letter
          if (existingCount !== answerLength - 1) {
            return ` ${blanksWithFirstLetter} `;
          }
          // If existing underscores equal remaining blanks (answerLength - 1), just add first letter
          return ` ${blanksWithFirstLetter} `;
        });
    }

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
