/**
 * Word Hunt Manager
 * Server-side logic for Word Hunt multiplayer mode:
 * target word selection, Wordle-style feedback, life management
 */

import type { WordHuntModeState, LetterFeedback } from '@/shared/types/game';
import {
  HUNT_LIFE_DRAIN_RATE,
  HUNT_INITIAL_LIFE,
  HUNT_SUBSEQUENT_FINDER_BONUSES,
  HUNT_WRONG_GUESS_PENALTY,
  getHuntLifeBonus,
  getDrainRate,
} from '@/shared/constants/wordHuntMultiplayerConstants';

import { isWordHuntQuality } from '@/shared/utils/wordQuality';
import { classifyWordSync } from '../services/wordCategorizer';
import { promises as fsAsync, readFileSync } from 'fs';
import * as path from 'path';

/**
 * Per-language curated word sets for Word Hunt target selection.
 * ~600-800 words per language, hand-curated for imageability,
 * discovery satisfaction, and age-appropriate familiarity.
 * Loaded lazily on first use, cached permanently in memory.
 */
const commonWordsByLang: Record<string, Set<string>> = {};
const loadingPromises: Record<string, Promise<Set<string>>> = {};

function parseWordFile(content: string): Set<string> {
  return new Set(
    content.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0),
  );
}

/** Resolve file path async — tries __dirname first (Docker: dist/), then parent (dev: backend/modules/ → backend/) */
async function resolveWordFileAsync(filename: string): Promise<string> {
  const direct = path.join(__dirname, filename);
  try { await fsAsync.access(direct); return direct; } catch { /* fallback */ }
  return path.join(__dirname, '..', filename);
}

/** Resolve file path sync — only used by loadWordFileSync fallback */
function resolveWordFileSync(filename: string): string {
  const direct = path.join(__dirname, filename);
  try { readFileSync(direct, 'utf-8'); return direct; } catch { /* fallback */ }
  return path.join(__dirname, '..', filename);
}

async function loadWordFileAsync(filename: string): Promise<Set<string>> {
  try {
    const filePath = await resolveWordFileAsync(filename);
    const content = await fsAsync.readFile(filePath, 'utf-8');
    return parseWordFile(content);
  } catch {
    return new Set<string>();
  }
}

/** Sync fallback — only used on first call before async load completes */
function loadWordFileSync(filename: string): Set<string> {
  try {
    const filePath = resolveWordFileSync(filename);
    const content = readFileSync(filePath, 'utf-8');
    return parseWordFile(content);
  } catch {
    return new Set<string>();
  }
}

const FILE_MAP: Record<string, string> = {
  en: 'common_hunt_words.txt',
  he: 'common_hunt_words_he.txt',
  sv: 'common_hunt_words_sv.txt',
  ja: 'common_hunt_words_ja.txt',
  es: 'common_hunt_words_es.txt',
};

/**
 * Get common words for a language. Returns cached set if available,
 * otherwise loads asynchronously. Deduplicates concurrent loads.
 */
export async function getCommonWordsAsync(lang = 'en'): Promise<Set<string>> {
  if (commonWordsByLang[lang]) return commonWordsByLang[lang];

  // Deduplicate concurrent loads for the same language
  if (!loadingPromises[lang]) {
    loadingPromises[lang] = loadWordFileAsync(FILE_MAP[lang] || `common_hunt_words_${lang}.txt`)
      .then(words => {
        commonWordsByLang[lang] = words;
        delete loadingPromises[lang];
        return words;
      })
      .catch(err => {
        // Clear rejected promise so next request retries instead of returning stale rejection
        delete loadingPromises[lang];
        throw err;
      });
  }
  return loadingPromises[lang];
}

/**
 * Synchronous getter — returns cached words or falls back to sync load.
 * Prefer getCommonWordsAsync in new code to avoid blocking the event loop.
 */
export function getCommonWords(lang = 'en'): Set<string> {
  if (commonWordsByLang[lang]) return commonWordsByLang[lang];

  // Sync fallback: loads file synchronously on first call only.
  // Subsequent calls hit cache. This keeps backward compat for sync callers.
  commonWordsByLang[lang] = loadWordFileSync(FILE_MAP[lang] || `common_hunt_words_${lang}.txt`);
  return commonWordsByLang[lang];
}

/**
 * Pick a random word from validWords that is between minLen and maxLen characters.
 * When commonOnly is true, prefers words from the language-specific common words set.
 * Returns null if none found.
 */
export function selectTargetWord(
  validWords: string[],
  minLen: number,
  maxLen: number,
  commonOnly = false,
  lang = 'en',
): string | null {
  const candidates = validWords.filter(
    (w) => w.length >= minLen && w.length <= maxLen,
  );
  if (candidates.length === 0) return null;

  if (commonOnly) {
    const common = getCommonWords(lang);
    if (common.size > 0) {
      const commonCandidates = candidates.filter(w => common.has(w.toLowerCase()));
      if (commonCandidates.length > 0) {
        return commonCandidates[Math.floor(Math.random() * commonCandidates.length)];
      }
    }
  }

  // Filter out low-quality words (jargon, medical, offensive, boring)
  // before falling back to any dictionary word
  const qualityCandidates = candidates.filter(w => isWordHuntQuality(w));
  if (qualityCandidates.length > 0) {
    return qualityCandidates[Math.floor(Math.random() * qualityCandidates.length)];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Pick a target word with progressive fallback to shorter lengths.
 * Prefers common words first, then falls back to any dictionary word.
 * Minimum fallback length is 4 (3-letter words are too trivial).
 */
export function selectTargetWordWithFallback(
  validWords: string[],
  preferredMinLen: number,
  maxLen: number,
  lang = 'en',
): string | null {
  // Try common words in preferred range first
  const commonResult = selectTargetWord(validWords, preferredMinLen, maxLen, true, lang);
  if (commonResult) return commonResult;

  // Fall back to any word in preferred range
  const result = selectTargetWord(validWords, preferredMinLen, maxLen);
  if (result) return result;

  // Progressive fallback, minimum 4 letters
  for (let min = preferredMinLen - 1; min >= 4; min--) {
    const commonFallback = selectTargetWord(validWords, min, min, true, lang);
    if (commonFallback) return commonFallback;
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
  lang = 'en',
): WordHuntModeState {
  const playerLives: Record<string, number> = {};
  for (const player of players) {
    playerLives[player] = HUNT_INITIAL_LIFE;
  }

  return {
    targetWord,
    targetCategory: classifyWordSync(targetWord, lang),
    targetWordLength: targetWord.length,
    playerLives,
    eliminatedPlayers: [],
    targetFoundBy: null,
    isFirstFinderClaimed: false,
    finderCount: 0,
  };
}

/**
 * Pure function: drain life from all non-eliminated players.
 * Returns updated lives and list of newly eliminated players.
 */
export function drainLife(state: WordHuntModeState, elapsedSeconds?: number): {
  updatedLives: Record<string, number>;
  newlyEliminated: string[];
} {
  const rate = elapsedSeconds != null ? getDrainRate(elapsedSeconds) : HUNT_LIFE_DRAIN_RATE;
  const updatedLives: Record<string, number> = { ...state.playerLives };
  const newlyEliminated: string[] = [];

  for (const player of Object.keys(updatedLives)) {
    if (state.eliminatedPlayers.includes(player)) continue;

    updatedLives[player] -= rate;
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
 * Subsequent finders during the 3s end-game window get decreasing bonuses.
 */
export function recordTargetFound(
  state: WordHuntModeState,
  username: string,
): { isFirstFinder: boolean; bonus: number } {
  const finderIndex = state.finderCount ?? 0;
  const bonus = HUNT_SUBSEQUENT_FINDER_BONUSES[finderIndex] ?? HUNT_SUBSEQUENT_FINDER_BONUSES[HUNT_SUBSEQUENT_FINDER_BONUSES.length - 1];
  const isFirstFinder = finderIndex === 0;

  if (isFirstFinder) {
    state.targetFoundBy = username;
    state.isFirstFinderClaimed = true;
  }
  state.finderCount = finderIndex + 1;

  return { isFirstFinder, bonus };
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
