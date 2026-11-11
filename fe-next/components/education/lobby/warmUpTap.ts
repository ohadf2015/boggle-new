/**
 * The waiting room's warm-up: six letter tiles (the student's own name), one
 * lit at a time — tap the lit one. Language-neutral, zero stakes: a miss only
 * resets the combo. Pure and seeded so it is testable and never calls
 * Math.random during render.
 */

import { hebrewLetters, japaneseLetters, russianLetters } from '@/utils/consts';

export const WARM_UP_TILES = 6;
const LATIN_PAD = Array.from('LEXICLASH');

const SCRIPT_ALPHABETS: [RegExp, readonly string[]][] = [
  [/\p{Script=Hebrew}/u, hebrewLetters],
  [/\p{Script=Cyrillic}/u, russianLetters],
  [/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, japaneseLetters],
];

const LANGUAGE_ALPHABETS: Record<string, readonly string[]> = { he: hebrewLetters, ru: russianLetters, ja: japaneseLetters };

/** The name's own script wins (a Hebrew name in an English room still pads in Hebrew); otherwise the class language. */
function padAlphabet(own: string[], language?: string): readonly string[] {
  for (const [script, alphabet] of SCRIPT_ALPHABETS) if (own.some((c) => script.test(c))) return alphabet;
  if (own.length > 0) return LATIN_PAD;
  return (language && LANGUAGE_ALPHABETS[language]) || LATIN_PAD;
}

export function warmUpLetters(name: string, language?: string): string[] {
  const own = Array.from(name.toLocaleUpperCase()).filter((c) => /\p{L}/u.test(c));
  const out = own.slice(0, WARM_UP_TILES);
  const pad = padAlphabet(own, language);
  const stride = pad === LATIN_PAD ? 1 : 5;
  for (let i = 0; out.length < WARM_UP_TILES; i++) out.push(pad[(i * stride) % pad.length]);
  return out;
}

export interface WarmUpState {
  hot: number;
  score: number;
  combo: number;
  best: number;
  /** Outcome of the last tap, for the hit/miss juice. null before the first. */
  lastHit: boolean | null;
  seed: number;
}

export type WarmUpAction = { type: 'tap'; index: number };

/** Park–Miller LCG step. */
function nextSeed(seed: number): number {
  return (seed * 48271) % 2147483647 || 1;
}

function pickHot(seed: number, not: number): { hot: number; seed: number } {
  const s = nextSeed(seed);
  // Offset 1..TILES-1 from the current tile, so the lit tile always moves.
  const offset = 1 + (s % (WARM_UP_TILES - 1));
  return { hot: (Math.max(0, not) + offset) % WARM_UP_TILES, seed: s };
}

export function initialWarmUp(seed: number): WarmUpState {
  const first = pickHot(Math.abs(Math.floor(seed)) + 1, -1);
  return { hot: first.hot, score: 0, combo: 0, best: 0, lastHit: null, seed: first.seed };
}

export function warmUpReducer(state: WarmUpState, action: WarmUpAction): WarmUpState {
  if (action.index < 0 || action.index >= WARM_UP_TILES) return state;
  if (action.index !== state.hot) {
    return { ...state, combo: 0, lastHit: false };
  }
  const next = pickHot(state.seed, state.hot);
  const combo = state.combo + 1;
  return {
    hot: next.hot,
    seed: next.seed,
    score: state.score + 1,
    combo,
    best: Math.max(state.best, combo),
    lastHit: true,
  };
}
