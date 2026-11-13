/**
 * Spelling-tiles warm-up: a list word's letters dealt scrambled, tapped back in order.
 * No-fail: a wrong tap costs nothing and the word stays. Pure and seeded, like warmUpTap.
 */

export const SPELL_MIN_LETTERS = 3;
export const SPELL_MAX_LETTERS = 8;

const LETTER = /^\p{L}$/u;
const HAN = /\p{Script=Han}/u;
const RTL = /[\p{Script=Hebrew}\p{Script=Arabic}]/u;

export function spellableWords(words: readonly string[], maxLetters = SPELL_MAX_LETTERS): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const raw of words) {
    const letters = Array.from(raw.trim().toLocaleUpperCase());
    if (letters.length < SPELL_MIN_LETTERS || letters.length > maxLetters) continue;
    if (!letters.every((c) => LETTER.test(c)) || letters.some((c) => HAN.test(c))) continue;
    const key = letters.join('');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(letters);
  }
  return out;
}

export function spellWordIsRtl(letters: readonly string[]): boolean {
  return letters.some((c) => RTL.test(c));
}

export interface SpellState {
  words: string[][];
  wordIndex: number;
  /** tiles[i] = index of the word letter shown on tile i. */
  tiles: number[];
  used: boolean[];
  filled: number;
  score: number;
  /** Words completed so far; drives the "Spelled!" pop. */
  spelled: number;
  misses: number;
  lastHit: boolean | null;
  seed: number;
}

export type SpellAction = { type: 'tap'; tile: number };

function nextSeed(seed: number): number {
  return (seed * 48271) % 2147483647 || 1;
}

function deal(length: number, seed: number): { tiles: number[]; seed: number } {
  const tiles = Array.from({ length }, (_, i) => i);
  let s = seed;
  for (let i = length - 1; i > 0; i--) {
    s = nextSeed(s);
    const j = s % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  if (length > 1 && tiles.every((v, i) => v === i)) tiles.push(tiles.shift()!);
  return { tiles, seed: s };
}

function dealWord(state: Omit<SpellState, 'tiles' | 'used' | 'filled'>, wordIndex: number): SpellState {
  const { tiles, seed } = deal(state.words[wordIndex].length, state.seed);
  return { ...state, wordIndex, tiles, used: tiles.map(() => false), filled: 0, seed };
}

export function initialSpell(words: string[][], seed: number): SpellState {
  return dealWord({ words, wordIndex: 0, score: 0, spelled: 0, misses: 0, lastHit: null, seed: Math.abs(Math.floor(seed)) + 1 }, 0);
}

export function spellReducer(state: SpellState, action: SpellAction): SpellState {
  const { tile } = action;
  if (tile < 0 || tile >= state.tiles.length || state.used[tile]) return state;
  const word = state.words[state.wordIndex];
  if (word[state.tiles[tile]] !== word[state.filled]) {
    return { ...state, misses: state.misses + 1, lastHit: false };
  }
  const filled = state.filled + 1;
  if (filled < word.length) {
    const used = state.used.slice();
    used[tile] = true;
    return { ...state, used, filled, lastHit: true };
  }
  const done = { ...state, score: state.score + 1, spelled: state.spelled + 1, lastHit: true };
  return dealWord(done, (state.wordIndex + 1) % state.words.length);
}
