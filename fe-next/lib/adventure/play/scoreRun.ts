/**
 * Adventure run scoring — the ONE formula both client HUD and server use.
 * No combo/time bonuses: the server can only trust the word list, so the
 * client shows exactly what the server will credit. Relics come from the
 * signed token on the server and from the run state on the client; word ORDER
 * matters (twin-ink, echo-stone, chain), so callers pass words as found.
 */
import { calculateWordScore } from '@/shared/utils/scoring';
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

export interface ScoreOptions {
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
export function scoreWords(words: readonly string[], { relics = [], kind, pointsFor, language }: ScoreOptions = {}) {
  // Bind the language ONCE here so the HUD and the server settle cannot drift:
  // both reach this function, and it is the only place base points are produced.
  const points_ = pointsFor ?? ((w: string) => wordPoints(w, language));
  const points: number[] = [];
  const chained: boolean[] = [];
  let anchor: string | null = null;
  words.forEach((w, i) => {
    const links = kind !== 'chain' || chainsFrom(anchor, w);
    chained.push(links);
    if (!links) { points.push(0); return; }
    anchor = w;
    points.push(applyRelics(w, i, relics, points_(w)));
  });
  return { points, chained, score: points.reduce((s, p) => s + p, 0) };
}

export interface ScoreRunInput extends ScoreOptions {
  grid: string[][];
  words: string[];
  language: string;
  minLength: number;
  isWord: (word: string) => boolean;
}

export function scoreRun({ grid, words, language, minLength, isWord, ...opts }: ScoreRunInput) {
  const board = grid.map((row) => row.map((c) => c.toLowerCase()));
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const raw of words.slice(0, MAX_WORDS * 4)) {
    if (typeof raw !== 'string') continue;
    const w = raw.toLowerCase().trim();
    if (w.length < minLength || w.length > 16 || seen.has(w)) continue;
    seen.add(w);
    if (!isWordOnBoard(w, board, language) || !isWord(w)) continue;
    valid.push(w);
    if (valid.length >= MAX_WORDS) break;
  }
  const { points, chained, score } = scoreWords(valid, { language, ...opts });
  return { valid, score, points, chained };
}
