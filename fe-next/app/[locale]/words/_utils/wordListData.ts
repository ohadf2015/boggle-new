import seedWords from './seed-words.json';
import { calculateWordScore } from '@/shared/utils/scoring';

export type WordLength = 3 | 4 | 5 | 6 | 7 | 8;
export const VALID_LENGTHS: WordLength[] = [3, 4, 5, 6, 7, 8];
export type Letter = string;
export const VALID_LETTERS: Letter[] = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Base LexiClash score for a word using canonical scoring */
export function getWordScore(word: string): number {
  return calculateWordScore(word);
}

/** Get words by exact length (max 100). */
export function getWordsByLength(n: WordLength): string[] {
  const key = String(n) as keyof typeof seedWords.byLength;
  return (seedWords.byLength[key] ?? []) as string[];
}

/** Get words starting with a letter (max 50), grouped by length. */
export function getWordsByLetter(letter: Letter): string[] {
  const key = letter as keyof typeof seedWords.byLetter;
  return (seedWords.byLetter[key] ?? []) as string[];
}

/** Group an array of words by their first letter. */
export function groupByFirstLetter(words: string[]): Record<string, string[]> {
  return words.reduce<Record<string, string[]>>((acc, w) => {
    const l = w[0].toUpperCase();
    if (!acc[l]) acc[l] = [];
    acc[l].push(w);
    return acc;
  }, {});
}

/** Group words by length. */
export function groupByLength(words: string[]): Record<number, string[]> {
  return words.reduce<Record<number, string[]>>((acc, w) => {
    if (!acc[w.length]) acc[w.length] = [];
    acc[w.length].push(w);
    return acc;
  }, {});
}

/** Validate that a length param string maps to a supported WordLength. */
export function parseWordLength(raw: string): WordLength | null {
  const n = parseInt(raw, 10);
  if (VALID_LENGTHS.includes(n as WordLength)) return n as WordLength;
  return null;
}

/** Validate that a letter param is a single a-z character. */
export function parseLetter(raw: string): Letter | null {
  const l = raw.toLowerCase();
  if (l.length === 1 && /^[a-z]$/.test(l)) return l as Letter;
  return null;
}
