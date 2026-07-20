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
import { normalizeHebrewLetter } from '@/shared/utils/wordNormalization';
import { getCachedTrie, getTrieNode, type TrieNode } from './boggleSolver';

/** Per-char sofit→regular normalization for Hebrew. Mirrors SP wordWheelGeneration:87. */
function normalizeWordForLang(word: string, language: Language): string {
  if (language !== 'he') return word;
  let out = '';
  for (const c of word) out += normalizeHebrewLetter(c);
  return out;
}

// Nine-letter seed sources (mirror of utils/dailyChallenge/wordWheelGeneration —
// duplicated here because backend tsconfig rootDir forbids cross-import).
const NINE_LETTER_SOURCES: Record<string, string[]> = {
  en: ['BREATHING','COUNTRIES','DANGEROUS','EDUCATION','LANDSCAPE','MACHINERY','NIGHTCLUB','OPERATING','QUESTIONS','REACTIONS','BUILDINGS','CERTAINLY','DESERVING','FURNISHED','GROUNDING','PUBLISHED','RECOGNISE','SHOULDERS','CUSTOMERS','FRAGMENTS','MICROWAVE','PLUNDERED','MARKETING','PROVIDING'],
  he: ['מחשבונים','התלמידים','משחקיהם','מתכוננים','הרכבתיה','תלבושות'],
  sv: ['BOKSTAVER','DATORSPEL','FRIHANDIG','GRUNDKURS','HUVUDSIDA','LANDSTING','MUSIKBAND'],
  // Single hiragana dictionary words with EXACTLY 7 unique kana — so the wheel fills
  // from the seed alone AND the full word is findable as a pangram (parity with the
  // English seeds). A wheel is anagram play: phonetic kana only, never kanji.
  ja: ['りゅうがくせい','ゆうびんきょく','ひゃっかじてん','ちゅうしゃじょう','ていりゅうじょ','にゅうがくする','にゅういんする','めんどうくさい'],
  es: ['RESPALDOS','CAMINANDO','ENCONTRAR','FABRICADO','GOBIERNO','HORMIGAS','INDOMABLE'],
  ru: ['АВТОБУСЫ','БИБЛИОТЕК','ВОСТОРГЕ','ГАЗЕТНЫЙ','ДЕРЕВНЯ','ЖЕЛАНИЕ','ЗАВТРАК','ИЗДАНИЕ','КАБИНЕТ','КАРТИНА','КОМАНДА','МАГАЗИН','НАСТРОЕН','ОБЩЕСТВО','ПАМЯТНИК','ПЕРЕМЕНА','ПИСАТЕЛ','ПЛОЩАДЬ','ПОДАРОК','ПОЕЗДКА','ПОМОЩНИК','ПРАЗДНИК','ПРИКЛЮЧЕН','ПРИРОДА','РАССКАЗ','РЕШЕНИЕ','СВОБОДА','СЛОВАРЬ','СОБАКА','СОБЫТИЕ','СОЛНЦЕ','СПАСИБО','СРАВНЕНИ','СТАДИОН','СТОЛИЦА','СТРАНА','СУЩЕСТВО','ТВОРЧЕСТВ','ТЕХНИКА','ТОВАРИЩ','ТРАДИЦИЯ','УЛЫБКА','УЧЕБНИК','ФАМИЛИЯ','ХОРОШИЙ','ЦВЕТОК','ЧЕЛОВЕК','ШКОЛЬНИК','ЭКЗАМЕН','ЯЗЫК'],
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
function uniqueChars(word: string, language: Language = 'en'): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const c of word) {
    const u = c.toUpperCase();
    if (u === ' ') continue;
    // Hebrew: collapse final forms to their regular counterparts so the wheel never
    // exposes ך/ם/ן/ף/ץ. Parity with SP wordWheelGeneration:87.
    const norm = language === 'he' ? normalizeHebrewLetter(u) : u;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/**
 * Generate a deterministic wheel puzzle for an MP game.
 *
 * Seeded on gameCode + language + `seedSalt`. The salt is the per-round
 * `gameSessionId`, which increments on every "play again" / new round — so a
 * rematch in the same room gets a fresh wheel instead of repeating the same
 * letters every round. Omitting the salt keeps the legacy deterministic
 * behaviour (same gameCode → same puzzle).
 */
export function generateWheelPuzzle(gameCode: string, language: Language = 'en', seedSalt: string | number = ''): WheelPuzzle {
  const sources = NINE_LETTER_SOURCES[language] || NINE_LETTER_SOURCES.en;
  const rng = mulberry32(hashString(`wheel-rush-${gameCode}-${language}-${seedSalt}`));
  const src = sources[Math.floor(rng() * sources.length)];
  let letters = uniqueChars(src, language);
  if (letters.length > 7) letters = letters.slice(0, 7);
  if (letters.length < 7) {
    const pool = language === 'he'
      ? ['א','ב','ג','ד','ה','ו','ח','י','כ','ל','מ','נ','ר','ש','ת']
      : language === 'ja'
        ? ['い','う','か','き','し','す','つ','て','と','な','に','の','ん','た','こ']
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

/** True if word is in the language trie (node.isWord). */
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
  const upper = normalizeWordForLang(word.toUpperCase(), language);
  if (upper.length < WHEEL_RUSH_MIN_WORD_LEN) return { valid: false, error: 'too-short' };
  if (!upper.includes(state.puzzle.centerLetter.toUpperCase())) return { valid: false, error: 'no-center' };
  if (!isWheelShape(upper, state.puzzle.centerLetter, state.puzzle.allLetters)) {
    return { valid: false, error: 'bad-letters' };
  }
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
