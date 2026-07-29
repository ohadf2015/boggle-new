/**
 * Word Hunt practice puzzle generator.
 *
 * Mirrors `practicePuzzle` (classic): pick a real target word from the curated
 * common-hunt pool, embed it on a random board via the REAL generator
 * (guaranteed findable), keep the richest of k. The Word Hunt goal is to find
 * that one target word, so the embed makes the round both random and winnable.
 *
 * Japanese is the exception: `generateRandomTable` routes 'ja' to a kanji-
 * compound generator that ignores embed words, so we can't guarantee a target.
 * JA keeps a fixed, hand-verified board+target instead.
 */
import type { Language } from '@/shared/types/game';
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient } from '@/lib/boardSelection';
import enTargets from './data/wordHuntTargets.en.json';
import heTargets from './data/wordHuntTargets.he.json';
import svTargets from './data/wordHuntTargets.sv.json';
import esTargets from './data/wordHuntTargets.es.json';

export interface WordHuntPuzzle {
  board: string[][];
  target: string;
}

const TARGET_POOLS: Record<string, string[]> = {
  en: enTargets as string[],
  he: heTargets as string[],
  sv: svTargets as string[],
  es: esTargets as string[],
};

// JA can't embed — keep a fixed board with さくら traceable on row 3.
const JA_FALLBACK: WordHuntPuzzle = {
  board: [
    ['い', 'ぬ', 'か', 'み'],
    ['ね', 'こ', 'と', 'り'],
    ['さ', 'く', 'ら', 'ま'],
    ['は', 'な', 'ゆ', 'き'],
  ],
  target: 'さくら',
};

const PRACTICE_ROWS = 4;
const PRACTICE_COLS = 4;
const RICHNESS_SAMPLES = 6;

export function getWordHuntTargets(language: string): string[] {
  return TARGET_POOLS[language] ?? [];
}

export interface GenerateWordHuntOptions {
  rng?: () => number;
  generate?: (wordsToEmbed: string[]) => string[][];
}

function defaultGenerate(language: string, wordsToEmbed: string[]): string[][] {
  return pickRichestBoardClient(
    () => generateRandomTable(PRACTICE_ROWS, PRACTICE_COLS, language as Language, wordsToEmbed),
    language,
    RICHNESS_SAMPLES,
  );
}

export function generateWordHuntPuzzle(
  language: string,
  opts: GenerateWordHuntOptions = {},
): WordHuntPuzzle {
  const pool = getWordHuntTargets(language);
  if (pool.length === 0) return JA_FALLBACK;

  const rng = opts.rng ?? Math.random;
  const target = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
  const generate = opts.generate ?? ((words) => defaultGenerate(language, words));
  const board = generate([target]);
  return { board, target };
}
