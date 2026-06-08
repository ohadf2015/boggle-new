/**
 * Practice puzzle generator — "clue-then-embed".
 *
 * Composes the REAL game board generator so practice feels identical to live
 * play, while guaranteeing fun + fairness:
 *   1. Pick a riddle target word (+ real clue) from the curated pool.
 *   2. Embed it on a fresh RANDOM board via the real `generateRandomTable`
 *      (which verifies solvability and falls back if needed).
 *   3. Keep the RICHEST of k boards (`pickRichestBoardClient`) for vowel
 *      balance / low duplication.
 *
 * The embedded riddle answer is therefore guaranteed findable, the board is
 * random (varies every visit), the embedded mid-length word makes it
 * "not-too-easy", and it's all real game logic.
 *
 * Riddles gate to languages with a curated clue pool (EN/HE). Other languages
 * still get a random real board — just no riddle card.
 */
import type { Language } from '@/shared/types/game';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import enRiddles from './data/practiceRiddles.en.json';
import heRiddles from './data/practiceRiddles.he.json';
import svRiddles from './data/practiceRiddles.sv.json';
import esRiddles from './data/practiceRiddles.es.json';

export interface PracticeRiddle {
  /** The answer word, in the language's native casing/script. */
  word: string;
  /** Human-readable riddle clue (real lexicon clue, not a translation key). */
  clue: string;
}

export interface PracticePuzzle {
  board: string[][];
  /** null when the language has no curated riddle pool (sv/ja/es). */
  riddle: PracticeRiddle | null;
}

const RIDDLE_POOLS: Record<string, PracticeRiddle[]> = {
  en: enRiddles as PracticeRiddle[],
  he: heRiddles as PracticeRiddle[],
  sv: svRiddles as PracticeRiddle[],
  es: esRiddles as PracticeRiddle[],
};

/** Practice boards are 4x4 — same square the live grid uses for a quick round. */
const PRACTICE_ROWS = 4;
const PRACTICE_COLS = 4;
/** Best-of-k board selection for vowel balance / low duplication. */
const RICHNESS_SAMPLES = 6;

export function getRiddlePool(language: string): PracticeRiddle[] {
  return RIDDLE_POOLS[language] ?? [];
}

/**
 * Pick one riddle target for the given language, or null if no pool exists.
 * `rng` (defaults to Math.random) is injectable for deterministic tests.
 */
export function pickRiddleTarget(
  language: string,
  rng: () => number = Math.random,
): PracticeRiddle | null {
  const pool = getRiddlePool(language);
  if (pool.length === 0) return null;
  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[idx] ?? null;
}

export interface GeneratePuzzleOptions {
  rng?: () => number;
  /**
   * Injectable board generator (for tests). Receives the words to embed and
   * returns the board. Defaults to the real richest-of-k embed pipeline.
   */
  generate?: (wordsToEmbed: string[]) => string[][];
}

function defaultGenerate(language: string, wordsToEmbed: string[]): string[][] {
  return pickRichestBoardClient(
    () => generateRandomTable(PRACTICE_ROWS, PRACTICE_COLS, language as Language, wordsToEmbed),
    language,
    RICHNESS_SAMPLES,
  );
}

export function generatePracticePuzzle(
  language: string,
  opts: GeneratePuzzleOptions = {},
): PracticePuzzle {
  const rng = opts.rng ?? Math.random;
  const riddle = pickRiddleTarget(language, rng);
  const wordsToEmbed = riddle ? [riddle.word] : [];
  const generate = opts.generate ?? ((words) => defaultGenerate(language, words));
  const board = generate(wordsToEmbed);
  return { board, riddle };
}
