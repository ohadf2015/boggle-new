/**
 * Adventure run scoring — the ONE formula both client HUD and server use.
 * Combo + speed come from per-word find times (ms offsets) that the client
 * sends alongside the word list, so the server re-derives exactly the bonus
 * the HUD showed. Relics come from the
 * signed token on the server and from the run state on the client; word ORDER
 * matters (twin-ink, echo-stone, chain), so callers pass words as found.
 */
import { calculateWordScore, getComboMultiplier } from '@/shared/utils/scoring';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';
import { getWordRarity, getRarityMultiplier } from '@/shared/utils/wordFrequency';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import type { LevelKind } from './levels';
import { applyRelics, type RelicId } from './relics';

const MAX_WORDS = 300;

/**
 * Languages whose alphabet `LETTER_RARITY` actually covers. Everywhere else every
 * letter scores 0 and only its length bonus would survive — which would pay for
 * length twice, since the base score is already exponential in length.
 * ponytail: heuristic rarity (letters + length); upgrade to the real
 * player-frequency corpus (backend/modules/wordFrequencyBanding.ts) when one
 * exists per language.
 */
const RARITY_LANGS = new Set(['en', 'es', 'sv']);

/**
 * Base points for a word. Rarity is safe to trust here — it is a pure function of
 * the word, so the server re-derives exactly what the HUD showed.
 * `language` is optional for back-compat: callers that omit it get the flat score.
 */
export function wordPoints(word: string, language?: string): number {
  const rarity = language && RARITY_LANGS.has(language) ? getRarityMultiplier(getWordRarity(word)) : 1;
  return calculateWordScore(word, 0, 1, rarity);
}

/** Total credited score of a full board solve — the basis for the level's par. */
export function boardTotalScore(words: string[], language: string): number {
  return words.reduce((sum, w) => sum + wordPoints(w, language), 0);
}

const FINAL_TO_REGULAR: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const edge = (ch: string | undefined) => (ch ? FINAL_TO_REGULAR[ch] ?? ch : '');

/** Chain rule: `word` must start with `prev`'s last letter (first word always chains). */
export function chainsFrom(prev: string | null, word: string): boolean {
  if (!prev) return true;
  const p = Array.from(prev.toLowerCase());
  const w = Array.from(word.toLowerCase());
  return edge(p[p.length - 1]) === edge(w[0]);
}

/** A follow-up word inside this gap also earns the speed bonus. */
export const QUICK_MS = 3000;
export const SPEED_BONUS = 1.1;
/** Ceiling on combo x speed — keeps board-derived thresholds meaningful. */
export const MAX_WORD_MULT = 2;

/**
 * Per-word combo level + multiplier from find times. The combo grows while each
 * word lands inside the shared chain window (same window as the classic game)
 * and resets on a pause; a quick follow-up adds the speed bonus on top.
 * No times = no bonus (legacy callers, replays of stored word lists).
 * ponytail: times are client-reported; the cap bounds what a forged list can gain.
 */
export function wordMultipliers(n: number, times?: readonly number[] | null, broken?: readonly boolean[]) {
  const combo: number[] = [];
  const mult: number[] = [];
  const timed = !!times && times.length === n;
  let level = 0;
  for (let i = 0; i < n; i++) {
    if (!timed || i === 0 || broken?.[i]) {
      level = 0;
      combo.push(0);
      mult.push(1);
      continue;
    }
    const gap = times![i] - times![i - 1];
    level = gap <= calculateComboChainWindow(level) ? level + 1 : 0;
    const m = getComboMultiplier(level) * (gap <= QUICK_MS ? SPEED_BONUS : 1);
    combo.push(level);
    mult.push(Math.min(MAX_WORD_MULT, Math.round(m * 100) / 100));
  }
  return { combo, mult };
}

export interface ScoreOptions {
  /** Find time of each word (ms, any origin), aligned with `words`. Drives combo + speed. */
  times?: readonly number[];
  relics?: readonly RelicId[];
  kind?: LevelKind;
  /** Test seam; defaults to wordPoints bound to `language`. */
  pointsFor?: (word: string) => number;
  /** Drives the rarity multiplier. Omitted = flat scoring (back-compat). */
  language?: string;
}

/**
 * Score already-validated words in the order they were found.
 * Chain levels: a word that doesn't chain scores 0 and doesn't move the anchor.
 */
export function scoreWords(words: readonly string[], { relics = [], kind, pointsFor, language, times }: ScoreOptions = {}) {
  // Bind the language ONCE here so the HUD and the server settle cannot drift:
  // both reach this function, and it is the only place base points are produced.
  const points_ = pointsFor ?? ((w: string) => wordPoints(w, language));
  const points: number[] = [];
  const chained: boolean[] = [];
  let anchor: string | null = null;
  words.forEach((w) => {
    const links = kind !== 'chain' || chainsFrom(anchor, w);
    chained.push(links);
    if (links) anchor = w;
  });
  // A broken chain link scores 0 and breaks the combo too.
  const { mult, combo } = wordMultipliers(words.length, times, chained.map((c) => !c));
  words.forEach((w, i) => {
    if (!chained[i]) { points.push(0); return; }
    points.push(applyRelics(w, i, relics, Math.round(points_(w) * mult[i])));
  });
  return { points, chained, combo, score: points.reduce((s, p) => s + p, 0) };
}

export interface ScoreRunInput extends ScoreOptions {
  grid: string[][];
  words: string[];
  language: string;
  minLength: number;
  isWord: (word: string) => boolean;
}

/** Untrusted times → finite, non-negative, non-decreasing, one per word; else null. */
export function sanitizeTimes(times: unknown, n: number, maxMs = Infinity): number[] | null {
  if (!Array.isArray(times) || times.length !== n) return null;
  let prev = 0;
  return times.map((t) => {
    const v = typeof t === 'number' && Number.isFinite(t) ? Math.min(maxMs, Math.max(0, t)) : prev;
    prev = Math.max(prev, v);
    return prev;
  });
}

export function scoreRun({ grid, words, language, minLength, isWord, times, ...opts }: ScoreRunInput) {
  const board = grid.map((row) => row.map((c) => c.toLowerCase()));
  const seen = new Set<string>();
  const valid: string[] = [];
  const clean = sanitizeTimes(times, words.length);
  const validTimes: number[] = [];
  for (const [i, raw] of words.slice(0, MAX_WORDS * 4).entries()) {
    if (typeof raw !== 'string') continue;
    const w = raw.toLowerCase().trim();
    if (w.length < minLength || w.length > 16 || seen.has(w)) continue;
    seen.add(w);
    if (!isWordOnBoard(w, board, language) || !isWord(w)) continue;
    valid.push(w);
    if (clean) validTimes.push(clean[i]);
    if (valid.length >= MAX_WORDS) break;
  }
  const { points, chained, score } = scoreWords(valid, { language, ...opts, ...(clean ? { times: validTimes } : {}) });
  return { valid, score, points, chained };
}
