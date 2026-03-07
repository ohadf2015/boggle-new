/**
 * Word Hunt Manager
 * Server-side logic for Word Hunt multiplayer mode:
 * target word selection, Wordle-style feedback, life management
 */

import type { WordHuntModeState, LetterFeedback } from '@/shared/types/game';
import {
  HUNT_LIFE_DRAIN_RATE,
  HUNT_INITIAL_LIFE,
  HUNT_FIRST_FINDER_BONUS,
  HUNT_WRONG_GUESS_PENALTY,
  getHuntLifeBonus,
} from '@/shared/constants/wordHuntMultiplayerConstants';

/**
 * Pick a random word from validWords that is between minLen and maxLen characters.
 * Returns null if none found.
 */
export function selectTargetWord(
  validWords: string[],
  minLen: number,
  maxLen: number,
): string | null {
  const candidates = validWords.filter(
    (w) => w.length >= minLen && w.length <= maxLen,
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Pick a target word with progressive fallback to shorter lengths.
 * Tries preferred range first, then falls back to minLen-1, minLen-2, etc.
 * Minimum fallback length is 3.
 */
export function selectTargetWordWithFallback(
  validWords: string[],
  preferredMinLen: number,
  maxLen: number,
): string | null {
  const result = selectTargetWord(validWords, preferredMinLen, maxLen);
  if (result) return result;

  for (let min = preferredMinLen - 1; min >= 3; min--) {
    const fallback = selectTargetWord(validWords, min, min);
    if (fallback) return fallback;
  }

  return null;
}

/**
 * Initialize word hunt state for a new game.
 */
export function initWordHuntState(
  targetWord: string,
  players: string[],
): WordHuntModeState {
  const playerLives: Record<string, number> = {};
  for (const player of players) {
    playerLives[player] = HUNT_INITIAL_LIFE;
  }

  return {
    targetWord,
    targetWordLength: targetWord.length,
    playerLives,
    eliminatedPlayers: [],
    targetFoundBy: null,
    isFirstFinderClaimed: false,
  };
}

/**
 * Pure function: drain life from all non-eliminated players.
 * Returns updated lives and list of newly eliminated players.
 */
export function drainLife(state: WordHuntModeState): {
  updatedLives: Record<string, number>;
  newlyEliminated: string[];
} {
  const updatedLives: Record<string, number> = { ...state.playerLives };
  const newlyEliminated: string[] = [];

  for (const player of Object.keys(updatedLives)) {
    if (state.eliminatedPlayers.includes(player)) continue;

    updatedLives[player] -= HUNT_LIFE_DRAIN_RATE;
    if (updatedLives[player] <= 0) {
      updatedLives[player] = 0;
      newlyEliminated.push(player);
    }
  }

  return { updatedLives, newlyEliminated };
}

/**
 * Wordle-style feedback for a target word guess.
 * Handles duplicate letters correctly: a letter is only 'present' if there
 * are remaining unmatched instances in the target.
 */
export function validateTargetGuess(
  target: string,
  guess: string,
): LetterFeedback[] {
  const t = target.toLowerCase();
  const g = guess.toLowerCase();
  const len = Math.min(t.length, g.length);
  const feedback: LetterFeedback[] = new Array(len).fill('absent');

  // Track remaining letter counts in target (after removing correct matches)
  const remaining: Record<string, number> = {};

  // First pass: mark correct positions
  for (let i = 0; i < len; i++) {
    if (g[i] === t[i]) {
      feedback[i] = 'correct';
    } else {
      // Count remaining target letters (not yet matched)
      remaining[t[i]] = (remaining[t[i]] || 0) + 1;
    }
  }

  // Second pass: mark present letters (only if there are remaining instances)
  for (let i = 0; i < len; i++) {
    if (feedback[i] === 'correct') continue;

    if (remaining[g[i]] && remaining[g[i]] > 0) {
      feedback[i] = 'present';
      remaining[g[i]]--;
    }
  }

  return feedback;
}

/**
 * Record that a player found the target word.
 * Returns whether they are the first finder and their bonus.
 */
export function recordTargetFound(
  state: WordHuntModeState,
  username: string,
): { isFirstFinder: boolean; bonus: number } {
  if (!state.isFirstFinderClaimed) {
    state.targetFoundBy = username;
    state.isFirstFinderClaimed = true;
    return { isFirstFinder: true, bonus: HUNT_FIRST_FINDER_BONUS };
  }
  return { isFirstFinder: false, bonus: 0 };
}

/**
 * Get life bonus for finding a word of given length.
 */
export function getLifeBonus(wordLength: number): number {
  return getHuntLifeBonus(wordLength);
}

/**
 * Add life to a player, capped at HUNT_INITIAL_LIFE.
 * Returns new life value.
 */
export function restoreLife(
  state: WordHuntModeState,
  username: string,
  amount: number,
): number {
  const current = state.playerLives[username] || 0;
  const newLife = Math.min(current + amount, HUNT_INITIAL_LIFE);
  state.playerLives[username] = newLife;
  return newLife;
}

/**
 * Check if all players in the game have been eliminated.
 */
export function areAllPlayersEliminated(state: WordHuntModeState): boolean {
  const allPlayers = Object.keys(state.playerLives);
  return allPlayers.length > 0 && allPlayers.every(p => state.eliminatedPlayers.includes(p));
}

/**
 * Compute discovery clues from a found board word vs the target word.
 * Returns positional green matches and known letters (present but wrong position).
 * Mirrors SP's useSurvivalClues.updateCluesFromDiscovery logic.
 */
export function computeDiscoveryClues(
  targetWord: string,
  discoveredWord: string,
): { greenPositions: { position: number; letter: string }[]; knownLetters: string[] } {
  const target = targetWord.toLowerCase();
  const word = discoveredWord.toLowerCase();
  const checkLen = Math.min(word.length, target.length);

  const greenPositions: { position: number; letter: string }[] = [];
  for (let i = 0; i < checkLen; i++) {
    if (word[i] === target[i]) {
      greenPositions.push({ position: i, letter: word[i] });
    }
  }

  // Build target letter counts, subtract greens, find present-but-wrong-position
  const targetCounts: Record<string, number> = {};
  for (const ch of target) {
    targetCounts[ch] = (targetCounts[ch] || 0) + 1;
  }
  for (const g of greenPositions) {
    targetCounts[g.letter]--;
  }

  const knownSet = new Set<string>();
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    // Skip positions that are already green
    if (i < checkLen && word[i] === target[i]) continue;
    if (targetCounts[ch] && targetCounts[ch] > 0) {
      knownSet.add(ch);
      targetCounts[ch]--;
    }
  }

  return { greenPositions, knownLetters: [...knownSet] };
}

/**
 * Subtract HUNT_WRONG_GUESS_PENALTY from player's life.
 * If life drops to 0 or below, add to eliminated.
 */
export function penalizeWrongGuess(
  state: WordHuntModeState,
  username: string,
): { livesRemaining: number; eliminated: boolean } {
  const current = state.playerLives[username] || 0;
  const newLife = current - HUNT_WRONG_GUESS_PENALTY;
  state.playerLives[username] = newLife;

  if (newLife <= 0) {
    if (!state.eliminatedPlayers.includes(username)) {
      state.eliminatedPlayers.push(username);
    }
    return { livesRemaining: newLife, eliminated: true };
  }

  return { livesRemaining: newLife, eliminated: false };
}
