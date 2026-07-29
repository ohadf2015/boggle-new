/**
 * Invalid Word Tracker
 *
 * Client-side utility for recording invalid word submissions from all game modes.
 * This is a fire-and-forget utility that doesn't block gameplay.
 *
 * Usage:
 *   import { recordInvalidWord } from '@/utils/invalidWordTracker';
 *
 *   // When a word fails validation
 *   recordInvalidWord({
 *     word: 'abc',
 *     language: 'en',
 *     reason: 'not_in_dictionary',
 *     gameMode: 'daily_word_hunt'
 *   });
 */

import type { Language } from '@/types';

/** Valid reasons for invalid word submissions */
export type InvalidWordReason = 'not_on_board' | 'not_in_dictionary' | 'peer_rejected' | 'too_short';

/** Valid game modes for tracking */
export type GameMode =
  | 'multiplayer'
  | 'adventure'
  | 'daily_word_hunt'
  | 'single_player'
  | 'drill';

export interface RecordInvalidWordParams {
  /** The invalid word submitted */
  word: string;
  /** Game language */
  language: Language;
  /** Why the word was invalid */
  reason: InvalidWordReason;
  /** Which game mode the word was submitted from */
  gameMode?: GameMode;
}

// Simple in-memory deduplication to avoid recording the same word multiple times
// in quick succession (same session)
const recentlyRecorded = new Map<string, number>();
const DEDUP_WINDOW_MS = 30000; // 30 seconds

function getDedupeKey(word: string, language: string): string {
  return `${word.toLowerCase()}_${language}`;
}

function shouldRecord(word: string, language: string): boolean {
  const key = getDedupeKey(word, language);
  const lastRecorded = recentlyRecorded.get(key);
  const now = Date.now();

  if (lastRecorded && now - lastRecorded < DEDUP_WINDOW_MS) {
    return false; // Already recorded recently
  }

  recentlyRecorded.set(key, now);

  // Cleanup old entries periodically
  if (recentlyRecorded.size > 100) {
    for (const [k, time] of recentlyRecorded.entries()) {
      if (now - time > DEDUP_WINDOW_MS) {
        recentlyRecorded.delete(k);
      }
    }
  }

  return true;
}

/**
 * Records an invalid word submission for admin review.
 *
 * This is a fire-and-forget function that:
 * - Never throws errors
 * - Doesn't block the calling code
 * - Deduplicates repeated submissions
 * - Skips very short words (< 3 characters)
 *
 * @param params - The invalid word details
 */
export function recordInvalidWord(params: RecordInvalidWordParams): void {
  const { word, language, reason, gameMode } = params;

  // Skip very short words (likely typos)
  if (!word || word.length < 2) {
    return;
  }

  // Skip 'too_short' reason (we don't need to track these)
  if (reason === 'too_short') {
    return;
  }

  // Deduplicate within session
  if (!shouldRecord(word, language)) {
    return;
  }

  // Fire-and-forget API call
  fetch('/api/invalid-word/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word,
      language,
      reason,
      gameMode,
    }),
  }).catch(() => {
    // Silently ignore errors - this is non-critical functionality
  });
}

/**
 * Records a word that failed the "not on board" validation.
 * Convenience wrapper for the most common case.
 */
export function recordNotOnBoard(word: string, language: Language, gameMode?: GameMode): void {
  recordInvalidWord({ word, language, reason: 'not_on_board', gameMode });
}

/**
 * Records a word that failed dictionary validation.
 * Convenience wrapper for dictionary failures.
 */
export function recordNotInDictionary(word: string, language: Language, gameMode?: GameMode): void {
  recordInvalidWord({ word, language, reason: 'not_in_dictionary', gameMode });
}
