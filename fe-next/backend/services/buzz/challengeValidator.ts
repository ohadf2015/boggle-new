/**
 * Challenge Validator for Daily Buzz
 * Validates and normalizes generated challenges
 */

import {
  BANNED_BRAND_WORDS,
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
  WORDLE_WORD_LENGTH,
} from './constants';
import type { BuzzChallenge, ParsedAIResponse, SocialContent } from './types';
import { isSportsRelatedChallenge } from './trendsService';
import { isBrandOrProperNoun, repairTruncatedJson } from './utils';

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
    'brand_names': [],
    'invalid_length': [],
    'invalid_options': [],
  };

  const validatedChallenges = challenges.filter((challenge) => {
    const answer = challenge.answer;

    // Filter out brand names and proper nouns
    // For non-English languages, be more permissive as brand names are often trending topics
    // Only reject if answer is ALL UPPERCASE (clear brand acronym) or in explicit banned list
    const shouldRejectBrand = language === 'en'
      ? isBrandOrProperNoun(answer, BANNED_BRAND_WORDS)
      : answer === answer.toUpperCase() && isBrandOrProperNoun(answer, BANNED_BRAND_WORDS);

    if (shouldRejectBrand) {
      rejectionReasons['brand_names'].push(`${answer} (${challenge.type})`);
      console.warn(`[BUZZ] Rejected brand/proper noun: ${answer}`);
      return false;
    }

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

    // Validate options for multiple choice
    if (challenge.options) {
      const allValid = challenge.options.every((option) => {
        // Apply same permissive logic for non-English languages
        const shouldReject = language === 'en'
          ? isBrandOrProperNoun(option, BANNED_BRAND_WORDS)
          : option === option.toUpperCase() && isBrandOrProperNoun(option, BANNED_BRAND_WORDS);
        return !shouldReject;
      });
      if (!allValid) {
        rejectionReasons['invalid_options'].push(`${challenge.prompt.substring(0, 50)}...`);
        console.warn(`[BUZZ] Invalid options contain brand names for: ${challenge.prompt}`);
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

    if (rejectionReasons['brand_names'].length > 0) {
      console.error(`  Brand names (${rejectionReasons['brand_names'].length}):`, rejectionReasons['brand_names']);
    }
    if (rejectionReasons['invalid_length'].length > 0) {
      console.error(`  Invalid length (${rejectionReasons['invalid_length'].length}):`, rejectionReasons['invalid_length']);
    }
    if (rejectionReasons['invalid_options'].length > 0) {
      console.error(`  Invalid options (${rejectionReasons['invalid_options'].length}):`, rejectionReasons['invalid_options']);
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
 */
export function validateSingleChallenge(
  challenge: BuzzChallenge,
  language: string
): boolean {
  const answer = challenge.answer;
  const minLength = MIN_ANSWER_LENGTH[language] || 3;

  // For non-English languages, be more permissive with brand names
  const shouldRejectBrand = language === 'en'
    ? isBrandOrProperNoun(answer, BANNED_BRAND_WORDS)
    : answer === answer.toUpperCase() && isBrandOrProperNoun(answer, BANNED_BRAND_WORDS);

  if (shouldRejectBrand) {
    console.warn(`[BUZZ] Rejected brand/proper noun: ${answer}`);
    return false;
  }

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

  if (challenge.options) {
    const allValid = challenge.options.every((option) => {
      // Apply same permissive logic for non-English languages
      const shouldReject = language === 'en'
        ? isBrandOrProperNoun(option, BANNED_BRAND_WORDS)
        : option === option.toUpperCase() && isBrandOrProperNoun(option, BANNED_BRAND_WORDS);
      return !shouldReject;
    });
    if (!allValid) {
      console.warn(`[BUZZ] Invalid options contain brand names for: ${challenge.prompt}`);
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

  let parsed: { challenges?: BuzzChallenge[]; social_content?: SocialContent };
  try {
    parsed = JSON.parse(jsonText);
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
    throw new Error('Invalid response format: missing challenges array');
  }

  const validChallenges = parsed.challenges.filter((challenge: Partial<BuzzChallenge>) => {
    return (
      challenge.type &&
      challenge.trend_topic &&
      challenge.prompt &&
      challenge.answer &&
      challenge.difficulty &&
      challenge.trending_context
    );
  }) as BuzzChallenge[];

  if (validChallenges.length < 5) {
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
