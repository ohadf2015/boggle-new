/**
 * Wheel Rush Manager
 * Server-side logic for Wheel Rush MP mode:
 * puzzle generation, word validation, steal-lock resolution.
 */

import type { WheelRushModeState, WheelPuzzle, Language } from '@/shared/types/game';
import {
  WHEEL_RUSH_LOCK_MS,
  WHEEL_RUSH_STEAL_BONUS,
  WHEEL_RUSH_FIRST_FINDER_MULT,
  WHEEL_RUSH_MIN_WORD_LEN,
  WHEEL_RUSH_POINTS_PER_LETTER,
  WHEEL_RUSH_PANGRAM_BONUS,
} from '@/shared/constants/wheelRushConstants';
import { getCachedTrie, getTrieNode, type TrieNode } from './boggleSolver';

// Nine-letter seed sources (mirror of utils/dailyChallenge/wordWheelGeneration —
// duplicated here because backend tsconfig rootDir forbids cross-import).
const NINE_LETTER_SOURCES: Record<string, string[]> = {
  en: ['BREATHING','COUNTRIES','DANGEROUS','EDUCATION','LANDSCAPE','MACHINERY','NIGHTCLUB','OPERATING','QUESTIONS','REACTIONS','BUILDINGS','CERTAINLY','DESERVING','FURNISHED','GROUNDING','PUBLISHED','RECOGNISE','SHOULDERS','CUSTOMERS','FRAGMENTS','MICROWAVE','PLUNDERED','MARKETING','PROVIDING'],
  he: ['מחשבונים','התלמידים','משחקיהם','מתכוננים','הרכבתיה','תלבושות'],
  sv: ['BOKSTAVER','DATORSPEL','FRIHANDIG','GRUNDKURS','HUVUDSIDA','LANDSTING','MUSIKBAND'],
  ja: ['新しい世界','教育機関','自然環境','技術革新','文化交流','経済発展','社会問題','健康管理'],
  es: ['RESPALDOS','CAMINANDO','ENCONTRAR','FABRICADO','GOBIERNO','HORMIGAS','INDOMABLE'],
};

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function uniqueChars(word: string): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const c of word) { const u = c.toUpperCase(); if (u === ' ' || seen.has(u)) continue; seen.add(u); out.push(u); }
  return out;
}

/** Generate a deterministic wheel puzzle for an MP game (seeded on gameCode). */
export function generateWheelPuzzle(gameCode: string, language: Language = 'en'): WheelPuzzle {
  const sources = NINE_LETTER_SOURCES[language] || NINE_LETTER_SOURCES.en;
  const rng = mulberry32(hashString(`wheel-rush-${gameCode}-${language}`));
  const src = sources[Math.floor(rng() * sources.length)];
  let letters = uniqueChars(src);
  if (letters.length > 7) letters = letters.slice(0, 7);
  if (letters.length < 7) {
    const pool = language === 'he'
      ? ['א','ב','ג','ד','ה','ו','ח','י','כ','ל','מ','נ','ר','ש','ת']
      : language === 'ja'
        ? ['日','月','火','水','木','金','土','人','大','小','上','下']
        : ['E','T','A','O','I','N','S','H','R','D','L','C','U','M'];
    const avail = pool.filter(l => !letters.includes(l));
    while (letters.length < 7 && avail.length) letters.push(avail.splice(Math.floor(rng() * avail.length), 1)[0]);
  }
  for (let i = letters.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [letters[i], letters[j]] = [letters[j], letters[i]]; }
  const centerLetter = letters[0];
  const outerLetters = letters.slice(1, 7);
  return { centerLetter, outerLetters, allLetters: [centerLetter, ...outerLetters] };
}

/** Word uses each available letter at most once and includes center. */
function isWheelShape(word: string, centerLetter: string, allLetters: string[]): boolean {
  const upper = word.toUpperCase();
  if (!upper.includes(centerLetter.toUpperCase())) return false;
  const avail = new Map<string, number>();
  for (const l of allLetters) { const u = l.toUpperCase(); avail.set(u, (avail.get(u) || 0) + 1); }
  for (const c of upper) { const n = avail.get(c); if (!n || n <= 0) return false; avail.set(c, n - 1); }
  return true;
}

/** Initialize state for a new wheel-rush game. */
export function initWheelRushState(
  puzzle: WheelPuzzle,
  players: string[],
  now: number = Date.now(),
): WheelRushModeState {
  const foundWords: Record<string, string[]> = {};
  for (const p of players) foundWords[p] = [];
  return {
    puzzle,
    foundWords,
    locks: {},
    closed: [],
    startedAt: now,
  };
}

/** True if word is in the language trie (node.isWord). */
function isInDictionary(word: string, language: Language): boolean {
  const trie = getCachedTrie(language);
  if (!trie) return false;
  const node = getTrieNode(trie, word.toLowerCase());
  return !!(node && (node as TrieNode).isWord === true);
}

export type WheelValidationError =
  | 'too-short'
  | 'no-center'
  | 'bad-letters'
  | 'not-a-word'
  | 'already-closed';

export interface WheelValidationResult {
  valid: boolean;
  error?: WheelValidationError;
}

/** Pure validation — shape, letter set, dictionary, not-already-closed. */
export function validateWheelSubmission(
  state: WheelRushModeState,
  word: string,
  language: Language = 'en',
): WheelValidationResult {
  const upper = word.toUpperCase();
  if (upper.length < WHEEL_RUSH_MIN_WORD_LEN) return { valid: false, error: 'too-short' };
  if (state.closed.includes(upper)) return { valid: false, error: 'already-closed' };
  if (!upper.includes(state.puzzle.centerLetter.toUpperCase())) return { valid: false, error: 'no-center' };
  if (!isWheelShape(upper, state.puzzle.centerLetter, state.puzzle.allLetters)) {
    return { valid: false, error: 'bad-letters' };
  }
  if (!isInDictionary(upper, language)) return { valid: false, error: 'not-a-word' };
  return { valid: true };
}

/** Base score for a word (length-based + pangram bonus). */
export function scoreWheelWord(word: string, allLetters: string[]): number {
  const base = word.length * WHEEL_RUSH_POINTS_PER_LETTER;
  const usesAll = allLetters.every(l => word.toUpperCase().includes(l.toUpperCase()));
  return usesAll ? base + WHEEL_RUSH_PANGRAM_BONUS : base;
}

export type WheelApplyOutcome =
  | { kind: 'locked'; lockUntil: number; score: number }          // first finder, window open
  | { kind: 'stolen'; score: number; stealBonus: number; from: string } // stealer during window
  | { kind: 'closed'; score: number }                              // first finder's word closed after window
  | { kind: 'rejected'; reason: WheelValidationError | 'locked-by-other' | 'duplicate' };

/**
 * Apply a validated word submission.
 * Steal-lock semantics:
 *   - If no lock: user becomes locker, gets provisional score*MULT; lock expires at now+LOCK_MS.
 *   - If lock held by someone else (still open): allow steal — stealer gets base score + STEAL_BONUS; closes word.
 *   - If lock expired and word still in locks (not closed yet): caller should reap via reapExpiredLocks.
 *   - Duplicate in user's foundWords: reject.
 */
export function applyWheelWord(
  state: WheelRushModeState,
  username: string,
  word: string,
  now: number = Date.now(),
): WheelApplyOutcome {
  const upper = word.toUpperCase();
  const userList = state.foundWords[username] ?? (state.foundWords[username] = []);
  if (userList.includes(upper)) return { kind: 'rejected', reason: 'duplicate' };
  if (state.closed.includes(upper)) return { kind: 'rejected', reason: 'already-closed' };

  const lock = state.locks[upper];
  const base = scoreWheelWord(upper, state.puzzle.allLetters);

  if (!lock || lock.until <= now) {
    // No active lock — become the first finder (or take over expired lock).
    state.locks[upper] = { by: username, until: now + WHEEL_RUSH_LOCK_MS };
    userList.push(upper);
    const score = Math.round(base * WHEEL_RUSH_FIRST_FINDER_MULT);
    return { kind: 'locked', lockUntil: state.locks[upper].until, score };
  }

  if (lock.by === username) return { kind: 'rejected', reason: 'duplicate' };

  // Steal during open window.
  userList.push(upper);
  state.closed.push(upper);
  delete state.locks[upper];
  return { kind: 'stolen', score: base, stealBonus: WHEEL_RUSH_STEAL_BONUS, from: lock.by };
}

/**
 * Reap expired locks. Words whose lock has elapsed become "closed" and award
 * no additional points to anyone beyond the first-finder multiplier already paid.
 * Returns list of {word, finder} that were just closed.
 */
export function reapExpiredLocks(
  state: WheelRushModeState,
  now: number = Date.now(),
): Array<{ word: string; finder: string }> {
  const closed: Array<{ word: string; finder: string }> = [];
  for (const [word, lock] of Object.entries(state.locks)) {
    if (lock.until <= now) {
      closed.push({ word, finder: lock.by });
      state.closed.push(word);
      delete state.locks[word];
    }
  }
  return closed;
}
