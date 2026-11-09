/**
 * Wheel Rush Manager
 * Server-side logic for Wheel Rush MP mode:
 * puzzle generation, word validation, parallel word discovery.
 *
 * Discovery model: every player can independently find and claim any valid word
 * from the wheel — a word another player (or bot) already found stays open and
 * claimable at base score. The only competitive edge is a flat first-finder
 * bonus paid to whoever submits a given word first in the room.
 */

import type { WheelRushModeState, WheelPuzzle, Language, WheelRushPlayerStats } from '@/shared/types/game';
import {
  WHEEL_RUSH_FIRST_FINDER_BONUS,
  WHEEL_RUSH_MIN_WORD_LEN,
  WHEEL_RUSH_PANGRAM_BONUS,
  WHEEL_RUSH_REPEAT_SCORE_FACTOR,
} from '@/shared/constants/wheelRushConstants';
import { calculateWordScoreByLength } from '@/shared/utils/scoring';
import { normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import { generateWordWheelPuzzle, isValidWordWheelWord } from '@/utils/dailyChallenge/wordWheelGeneration';
import { getCachedTrie, getTrieNode } from './boggleSolver';
import { isWordShapeWeird } from '@/shared/utils/wordShapeFilter';

/**
 * Generate a deterministic wheel puzzle for an MP game, from the same checked
 * source pool as the daily and quick wheels (7 real letters, playable centers).
 *
 * Seeded on gameCode + language + `seedSalt`. The salt is the per-round
 * `gameSessionId`, which increments on every "play again" / new round — so a
 * rematch in the same room gets a fresh wheel instead of repeating the same
 * letters every round.
 */
export function generateWheelPuzzle(gameCode: string, language: Language = 'en', seedSalt: string | number = ''): WheelPuzzle {
  const { centerLetter, outerLetters, allLetters } = generateWordWheelPuzzle(`wheel-rush-${gameCode}-${seedSalt}`, language);
  return { centerLetter, outerLetters, allLetters };
}

/** Initialize state for a new wheel-rush game. */
export function initWheelRushState(
  puzzle: WheelPuzzle,
  players: string[],
  now: number = Date.now(),
): WheelRushModeState {
  const foundWords: Record<string, string[]> = {};
  const playerStats: Record<string, WheelRushPlayerStats> = {};
  for (const p of players) {
    foundWords[p] = [];
    playerStats[p] = { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 };
  }
  return {
    puzzle,
    foundWords,
    firstFinders: {},
    startedAt: now,
    playerStats,
  };
}

function ensureStats(
  state: WheelRushModeState,
  username: string,
): WheelRushPlayerStats {
  if (!state.playerStats) state.playerStats = {};
  if (!state.playerStats[username]) {
    state.playerStats[username] = { wordsLocked: 0, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: '', totalScore: 0 };
  }
  return state.playerStats[username];
}

function bumpBestWord(
  stats: WheelRushPlayerStats,
  word: string,
): void {
  if (word.length > stats.bestWord.length) stats.bestWord = word;
}

/** True if word is in the language word index. */
function isInDictionary(word: string, language: Language): boolean {
  const trie = getCachedTrie(language);
  if (!trie) return false;
  const node = getTrieNode(trie, word.toLowerCase());
  return !!(node && node.isWord === true);
}

export type WheelValidationError =
  | 'too-short'
  | 'no-center'
  | 'bad-letters'
  | 'not-a-word';

export interface WheelValidationResult {
  valid: boolean;
  error?: WheelValidationError;
}

/** Pure validation — shape, letter set, dictionary.
 *  Parallel discovery: there is no "already-closed" state — a word another
 *  player found remains valid for everyone.
 *  Hebrew submissions are normalized (sofit→regular) before any comparison so
 *  keyboard or external clients sending the final form still match the wheel. */
export function validateWheelSubmission(
  state: WheelRushModeState,
  word: string,
  language: Language = 'en',
): WheelValidationResult {
  const upper = (language === 'he' ? normalizeHebrewWord(word) : word).toUpperCase();
  if (upper.length < WHEEL_RUSH_MIN_WORD_LEN) return { valid: false, error: 'too-short' };
  if (!upper.includes(state.puzzle.centerLetter.toUpperCase())) return { valid: false, error: 'no-center' };
  if (!isValidWordWheelWord(upper, state.puzzle.centerLetter, state.puzzle.allLetters)) {
    return { valid: false, error: 'bad-letters' };
  }
  // Same shape filter the classic live path (wordHandler) AND final scoring
  // (gameScores) apply: vowel-less abbreviations like "spl"/"pdn" sit in the
  // trie, so without this gate they were ACCEPTED live and then silently
  // zeroed in the results recompute (mpTwoClientGate flake, master red).
  if (isWordShapeWeird(upper, language).weird) return { valid: false, error: 'not-a-word' };
  if (!isInDictionary(upper, language)) return { valid: false, error: 'not-a-word' };
  return { valid: true };
}

/** Base score for a word (canonical length curve + pangram bonus). */
export function scoreWheelWord(word: string, allLetters: string[]): number {
  const base = calculateWordScoreByLength(word.length);
  const usesAll = allLetters.every(l => word.toUpperCase().includes(l.toUpperCase()));
  return usesAll ? base + WHEEL_RUSH_PANGRAM_BONUS : base;
}

export interface WheelApplyOutcome {
  /** Total awarded (base word score, reduced on repeat, + first-finder bonus when applicable). */
  score: number;
  /** True if this player was the first in the room to find this word. */
  firstFinder: boolean;
  /** Flat bonus included in `score` (0 when not the first finder). */
  firstFinderBonus: number;
  /** True if this player already claimed this exact word before — it still
   *  scores, just at WHEEL_RUSH_REPEAT_SCORE_FACTOR of the base value instead
   *  of being rejected outright. */
  repeat: boolean;
}

/**
 * Apply a validated word submission — parallel-discovery semantics.
 *
 *   - A player may claim any valid word regardless of who else has found it.
 *   - Each claim scores the base word score.
 *   - The FIRST player in the room to submit a given word also gets a flat
 *     first-finder bonus (WHEEL_RUSH_FIRST_FINDER_BONUS). The word then stays
 *     open and claimable at base score for everyone else.
 *   - Re-submitting a word this player already claimed still scores, just at
 *     a reduced rate — repeating a found word is never a dead end.
 *
 * `now` is accepted for signature parity with the old lock model; it is unused.
 */
export function applyWheelWord(
  state: WheelRushModeState,
  username: string,
  word: string,
  _now: number = Date.now(),
): WheelApplyOutcome {
  const upper = word.toUpperCase();
  const userList = state.foundWords[username] ?? (state.foundWords[username] = []);
  const repeat = userList.includes(upper);

  if (!state.firstFinders) state.firstFinders = {};
  const isFirstFinder = !(upper in state.firstFinders);
  if (isFirstFinder) state.firstFinders[upper] = username;

  const base = scoreWheelWord(upper, state.puzzle.allLetters);
  const firstFinderBonus = isFirstFinder ? WHEEL_RUSH_FIRST_FINDER_BONUS : 0;

  let score: number;
  if (!repeat) {
    score = base + firstFinderBonus;
  } else {
    // Repeat bonus pays out ONCE per word per player — otherwise resubmitting
    // the same word forever would farm unbounded points.
    if (!state.repeatCredited) state.repeatCredited = {};
    const credited = state.repeatCredited[username] ?? (state.repeatCredited[username] = []);
    const alreadyCredited = credited.includes(upper);
    score = alreadyCredited ? 0 : Math.max(1, Math.round(base * WHEEL_RUSH_REPEAT_SCORE_FACTOR));
    if (!alreadyCredited) credited.push(upper);
  }

  if (!repeat) userList.push(upper);
  const stats = ensureStats(state, username);
  if (!repeat) stats.wordsLocked += 1;        // total unique words this player claimed
  if (isFirstFinder) stats.wordsStolen += 1;  // repurposed: first-finder count
  stats.totalScore += score;
  bumpBestWord(stats, upper);

  return { score, firstFinder: isFirstFinder, firstFinderBonus, repeat };
}
