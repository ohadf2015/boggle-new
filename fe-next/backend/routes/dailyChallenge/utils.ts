/**
 * Daily Challenge Utilities
 * Helper functions for daily challenge routes
 */

import type { Language } from '../../../types';
import { normalizeHebrewWord } from '../../../shared/utils/wordNormalization';
import { isDictionaryWord } from '../../dictionary';
import { isWordCommunityValid } from '../../modules/communityWordManager';
import { COIN_COSTS } from '../../../utils/coinManager';
import { VALID_LANGUAGES, ValidLanguage, ALL_LANGUAGES_SCOPE, type LeaderboardLanguageScope } from './types';

/**
 * Normalize a word for comparison based on language.
 * For Hebrew: converts final letters (ם,ך,ן,ף,ץ) to regular forms (מ,כ,נ,פ,צ)
 * For other languages: uses toUpperCase()
 */
export function normalizeWordForComparison(word: string, language: Language): string {
  if (language === 'he') {
    return normalizeHebrewWord(word);
  }
  return word.toUpperCase();
}

/**
 * Check if a word is valid for daily challenge submission.
 * Valid means: in dictionary OR community-validated (6+ net votes).
 * Pending words (awaiting community validation) are NOT valid.
 */
export function isWordValidForDailyChallenge(word: string, language: Language): boolean {
  // Check static dictionary first
  const inDictionary = isDictionaryWord(word, language);
  if (inDictionary === true) {
    return true;
  }

  // Check community-validated words (6+ net votes)
  if (isWordCommunityValid(word, language)) {
    return true;
  }

  // Pending words and unknown words are NOT valid
  return false;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Validate language code
 */
export function isValidLanguage(language: string): language is ValidLanguage {
  return VALID_LANGUAGES.includes(language as ValidLanguage);
}

/**
 * Validate a leaderboard language scope: a concrete language OR `all`.
 */
export function isLeaderboardLanguageScope(language: string): language is LeaderboardLanguageScope {
  return language === ALL_LANGUAGES_SCOPE || isValidLanguage(language);
}

/**
 * Apply the per-language filter unless the caller asked for the global (`all`)
 * board. Every daily-board query — the ranked rows AND the count queries —
 * must go through this so the header numbers describe the same population as
 * the list.
 */
export function withLanguageScope<T extends { eq(column: string, value: string): T }>(
  query: T,
  language: LeaderboardLanguageScope,
): T {
  return language === ALL_LANGUAGES_SCOPE ? query : query.eq('language', language);
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Decide whether a Word Hunt submit should incur the retry leaderboard penalty
 * and compute the resulting stored efficiency score.
 *
 * The gate is `reportedExtraTries > existingExtraTries` — i.e. the client's
 * paid-retry counter must have *advanced* beyond what's stored. Bare row
 * existence is NOT enough, otherwise an idempotent re-submit (network drop,
 * page re-mount) of a single play would be falsely penalised.
 */
export interface WordHuntRetryScoreInput {
  rawEfficiency: number;
  /** `extra_tries` value from the existing row, or 0 when there is no row. */
  existingExtraTries: number;
  /** `extraTries` value the client included in this submit. */
  reportedExtraTries: number;
  /** Whether a row already exists for this (player, date, language). */
  hasExistingRow: boolean;
}

export interface WordHuntRetryScoreResult {
  finalScore: number;
  penaltyApplied: number;
  isPaidRetry: boolean;
}

export function computeWordHuntRetryScore(
  input: WordHuntRetryScoreInput
): WordHuntRetryScoreResult {
  const existing = Math.max(0, Math.round(input.existingExtraTries || 0));
  const reported = Math.max(0, Math.round(input.reportedExtraTries || 0));
  const isPaidRetry = input.hasExistingRow && reported > existing;
  const penaltyApplied = isPaidRetry ? COIN_COSTS.DAILY_RETRY_LEADERBOARD_PENALTY : 0;
  const finalScore = Math.max(0, Math.round(input.rawEfficiency) - penaltyApplied);
  return { finalScore, penaltyApplied, isPaidRetry };
}

/**
 * Clamp + strip a client-supplied display name before it's stored and
 * rendered on the daily leaderboard.
 *
 * This only ever bites the guest path: an authenticated player's rendered
 * name comes from `profiles` (daily_word_hunt_leaderboard COALESCEs
 * p.display_name ahead of the submitted dwa.display_name), but a guest row
 * has no profile to fall back to, so whatever string arrives in the submit
 * body is exactly what shows up on the public board. Nothing upstream
 * validates length or content today (the same gap exists in
 * custom-puzzle/create's creator_display_name), so this is a deliberately
 * minimal guard — a length clamp and a control-character strip, not a
 * profanity filter, which is a separate, larger feature.
 */
export function sanitizeGuestDisplayName(raw: unknown, fallback = 'Anonymous'): string {
  if (typeof raw !== 'string') return fallback;
  // Code-point filter rather than a regex control-char class: ASCII control
  // codes are 0-31 plus DEL (127); printable text starts at 32 (space).
  const withoutControlChars = Array.from(raw)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join('');
  const stripped = withoutControlChars.trim();
  if (!stripped) return fallback;
  return stripped.slice(0, 40);
}
