/**
 * Hybrid Validation - Cost-Efficient AI Usage
 * Determines when to use AI validation vs community votes
 */

import { normalizeWord } from '../dictionary';
import type { Language } from '@/shared/types';
import logger from '../utils/logger';
// Lazy import to break circular dependency with communityWordManager
let _isWordCommunityValid: ((word: string, lang: string) => boolean) | null = null;
function getIsWordCommunityValid(): (word: string, lang: string) => boolean {
  if (!_isWordCommunityValid) {
     
    _isWordCommunityValid = require('./communityWordManager').isWordCommunityValid;
  }
  return _isWordCommunityValid!;
}

export interface ShouldValidateResult {
  shouldValidate: boolean;
  reason: string;
  alternativeResult?: {
    isValid: boolean;
    source: string;
  };
}

export interface FilteredWordsResult {
  wordsForAI: string[];
  skippedWords: Map<string, { isValid: boolean; source: string; reason: string }>;
}

export interface SelfHealingConfig {
  WORDS_PER_PLAYER: number;
  THRESHOLD_PROXIMITY: number;
  MIN_VOTES_FOR_REVIEW: number;
  AI_DISAGREEMENT_THRESHOLD: number;
  MAX_AI_VALIDATIONS_PER_GAME: number;
  MIN_WORD_LENGTH_FOR_AI: number;
  SKIP_AI_IF_COMMUNITY_NEGATIVE: boolean;
}

export const SELF_HEALING_CONFIG: SelfHealingConfig = {
  WORDS_PER_PLAYER: 3,
  THRESHOLD_PROXIMITY: 3,
  MIN_VOTES_FOR_REVIEW: 4,
  AI_DISAGREEMENT_THRESHOLD: 5,
  MAX_AI_VALIDATIONS_PER_GAME: 5,
  MIN_WORD_LENGTH_FOR_AI: 3,
  SKIP_AI_IF_COMMUNITY_NEGATIVE: true
};

type LanguageCode = 'en' | 'he' | 'sv' | 'ja' | 'es';

// Track AI validation usage per game
const gameAIValidationCount = new Map<string, number>();

// Reference to pending votes cache (set by communityWordManager)
let wordsPendingVotesRef: Record<LanguageCode, Map<string, { netScore: number }>> | null = null;

/**
 * Set reference to the pending votes cache from communityWordManager
 */
export function setPendingVotesRef(ref: Record<LanguageCode, Map<string, { netScore: number }>>): void {
  wordsPendingVotesRef = ref;
}

/**
 * Reset AI validation count for a game (call at game start)
 */
export function resetGameAIValidationCount(gameCode: string): void {
  gameAIValidationCount.set(gameCode, 0);
  logger.debug('CommunityWords', `Reset AI validation count for game ${gameCode}`);
}

/**
 * Clean up game tracking data when game ends
 */
export function cleanupGameTracking(gameCode: string): void {
  gameAIValidationCount.delete(gameCode);
}

/**
 * Record that an AI validation was used for a game
 */
export function recordAIValidationUsed(gameCode: string): void {
  const current = gameAIValidationCount.get(gameCode) || 0;
  gameAIValidationCount.set(gameCode, current + 1);
  logger.debug('CommunityWords', `AI validation count for game ${gameCode}: ${current + 1}/${SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME}`);
}

/**
 * Get remaining AI validations for a game
 */
export function getRemainingAIValidations(gameCode: string): number {
  const current = gameAIValidationCount.get(gameCode) || 0;
  return Math.max(0, SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME - current);
}

/**
 * Basic heuristics to detect gibberish words (save AI tokens)
 */
function looksLikeGibberish(word: string, language: string): boolean {
  if (word.length < 4) return false;

  const consonantPatterns: Record<string, RegExp | null> = {
    en: /[bcdfghjklmnpqrstvwxz]{5,}/i,
    he: null,
    sv: /[bcdfghjklmnpqrstvwxz]{5,}/i,
    ja: null
  };

  const pattern = consonantPatterns[language];
  if (pattern && pattern.test(word)) return true;
  if (/[aeiou]{4,}/i.test(word)) return true;
  if (/(.)\1{3,}/.test(word)) return true;
  if (/^(.{1,2})\1{2,}$/.test(word)) return true;

  return false;
}

/**
 * Check if we should use AI validation for this word
 */
export function shouldUseAIValidation(
  word: string,
  language: string,
  gameCode: string
): ShouldValidateResult {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang as Language);

  if (getIsWordCommunityValid()(normalized, lang)) {
    return {
      shouldValidate: false,
      reason: 'already_community_valid',
      alternativeResult: { isValid: true, source: 'community' }
    };
  }

  if (wordsPendingVotesRef) {
    const pendingCache = wordsPendingVotesRef[lang];
    if (pendingCache) {
      const cached = pendingCache.get(normalized);
      if (cached) {
        if (SELF_HEALING_CONFIG.SKIP_AI_IF_COMMUNITY_NEGATIVE && cached.netScore <= -3) {
          logger.debug('CommunityWords', `Skipping AI for "${word}" - community rejected (netScore: ${cached.netScore})`);
          return {
            shouldValidate: false,
            reason: 'Community rejected this word',
            alternativeResult: { isValid: false, source: 'community' }
          };
        }

        if (cached.netScore >= 4) {
          logger.debug('CommunityWords', `Using community approval for "${word}" (netScore: ${cached.netScore})`);
          return {
            shouldValidate: false,
            reason: 'community_approved_pending',
            alternativeResult: { isValid: true, source: 'community_pending' }
          };
        }
      }
    }
  }

  const currentCount = gameAIValidationCount.get(gameCode) || 0;
  if (currentCount >= SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME) {
    logger.debug('CommunityWords', `AI limit reached for game ${gameCode} (${currentCount}/${SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME})`);
    return {
      shouldValidate: false,
      reason: 'Could not verify - validation limit reached',
      alternativeResult: { isValid: false, source: 'limit_reached' }
    };
  }

  if (normalized.length < SELF_HEALING_CONFIG.MIN_WORD_LENGTH_FOR_AI) {
    return {
      shouldValidate: false,
      reason: 'Word too short',
      alternativeResult: { isValid: false, source: 'too_short' }
    };
  }

  if (looksLikeGibberish(normalized, lang)) {
    logger.debug('CommunityWords', `Skipping AI for "${word}" - looks like gibberish`);
    return {
      shouldValidate: false,
      reason: 'Not a valid word',
      alternativeResult: { isValid: false, source: 'pattern_rejected' }
    };
  }

  return { shouldValidate: true, reason: 'proceed_with_ai' };
}

/**
 * Filter words for batch AI validation
 */
export function filterWordsForAIValidation(
  words: string[],
  language: string,
  gameCode: string
): FilteredWordsResult {
  const wordsForAI: string[] = [];
  const skippedWords = new Map<string, { isValid: boolean; source: string; reason: string }>();

  const remaining = getRemainingAIValidations(gameCode);

  for (const word of words) {
    if (wordsForAI.length >= remaining) {
      skippedWords.set(word, {
        isValid: false,
        source: 'limit_reached',
        reason: 'Could not verify - validation limit reached'
      });
      continue;
    }

    const decision = shouldUseAIValidation(word, language, gameCode);

    if (decision.shouldValidate) {
      wordsForAI.push(word);
    } else {
      skippedWords.set(word, {
        isValid: decision.alternativeResult?.isValid || false,
        source: decision.alternativeResult?.source || 'skipped',
        reason: decision.reason
      });
    }
  }

  logger.info('CommunityWords', `Filtered ${words.length} words for AI: ${wordsForAI.length} for AI, ${skippedWords.size} skipped`);

  return { wordsForAI, skippedWords };
}
