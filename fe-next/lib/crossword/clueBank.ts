// Runtime accessor for the committed, lexicon-derived English clue bank. The JSON is baked
// at build time (Datamuse definitions → LLM-crafted clue → dual-judge → pure gates), so the
// game stays fully offline. See scripts/crossword/clues/* and the clue-craft workflow.

import bankJson from './data/clueBank.en.json';

export interface ClueEntry {
  clue: string;
  pos: string;
  score: number;
  alts?: string[];
}

const bank = bankJson as Record<string, ClueEntry>;

/** The crafted clue for a (lowercase) word, or undefined if not in the bank. */
export function getClue(word: string): string | undefined {
  return bank[word.toLowerCase()]?.clue;
}

/** Whether the bank has a clue for the word. */
export function hasClue(word: string): boolean {
  return Boolean(bank[word.toLowerCase()]);
}

/** Corpus-frequency score for a word (0 if unknown). Higher = more common. */
export function clueScore(word: string): number {
  return bank[word.toLowerCase()]?.score ?? 0;
}

/** Full entry (clue + pos + score + alts) for a word. */
export function getClueEntry(word: string): ClueEntry | undefined {
  return bank[word.toLowerCase()];
}

/** Number of words in the bank. */
export function clueBankSize(): number {
  return Object.keys(bank).length;
}
