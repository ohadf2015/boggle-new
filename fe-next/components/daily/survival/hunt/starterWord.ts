import type { Language, LetterGrid } from '@/types';
import { findWordPath } from '@/utils/wordPathFinder';
import { normalizeWord } from '@/utils/clientWordValidator';
import type { HuntCell } from './huntStage';
import { commonStarterWords } from './starterCommonWords';

export interface StarterWord {
  word: string;
  path: HuntCell[];
}

export interface FindStarterWordInput {
  grid: LetterGrid;
  language: Language;
  /** Words this long are guesses at the hidden word, so a starter is never one. */
  targetLength: number;
  /** Words the player already found. */
  exclude: string[];
  /** Dictionary lookup used when no curated word is on the board. */
  isWord: (word: string) => boolean;
}

/** Short words are the easiest first trace: three or four letters, never more. */
const MIN_LEN = 3;
const MAX_LEN = 4;

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

/** Four letters read as a real word most easily, then three, then five. */
const LENGTH_ORDER: Record<number, number> = { 4: 0, 3: 1, 5: 2 };

function fromCurated(input: FindStarterWordInput, skip: Set<string>): StarterWord | null {
  const { grid, language, targetLength } = input;
  const candidates = commonStarterWords(language)
    .filter((w) => w.length >= MIN_LEN && w.length <= MAX_LEN + 1 && w.length !== targetLength)
    .filter((w) => !skip.has(normalizeWord(w, language)))
    .sort((a, b) => (LENGTH_ORDER[a.length] ?? 9) - (LENGTH_ORDER[b.length] ?? 9));
  for (const word of candidates) {
    const path = findWordPath(word, grid, language);
    if (path) return { word, path: path.map(({ row, col }) => ({ row, col })) };
  }
  return null;
}

/** Rare letters mark rare words (ZOEA, QOPH): a lower total reads as a more familiar word. */
const LETTER_WEIGHT: Record<string, number> = {
  Q: 10, Z: 10, X: 8, J: 8, K: 5, V: 4, W: 4, Y: 3, F: 3, B: 3,
  G: 2, H: 2, P: 2, M: 2, U: 2, C: 2, D: 1, L: 1, R: 1, N: 1, T: 1, O: 1,
};
const letterWeight = (word: string) => [...word].reduce((sum, ch) => sum + (LETTER_WEIGHT[ch] ?? 0), 0);

function fromDictionary(input: FindStarterWordInput, skip: Set<string>): StarterWord | null {
  const { grid, language, targetLength, isWord } = input;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const lengths = new Set([MIN_LEN, MAX_LEN].filter((n) => n !== targetLength));
  const found = new Map<string, HuntCell[]>();
  const path: HuntCell[] = [];
  const used = new Set<string>();

  const walk = (r: number, c: number) => {
    path.push({ row: r, col: c });
    used.add(`${r},${c}`);
    if (lengths.has(path.length)) {
      const word = path.map((p) => String(grid[p.row][p.col])).join('').toUpperCase();
      if (!found.has(word) && !skip.has(normalizeWord(word, language)) && isWord(word)) found.set(word, [...path]);
    }
    if (path.length < MAX_LEN) {
      for (const [dr, dc] of NEIGHBOURS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || used.has(`${nr},${nc}`)) continue;
        walk(nr, nc);
      }
    }
    path.pop();
    used.delete(`${r},${c}`);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) walk(r, c);
  }

  let best: StarterWord | null = null;
  let bestKey = Infinity;
  for (const [word, wordPath] of found) {
    const key = letterWeight(word) * 10 + (LENGTH_ORDER[word.length] ?? 9);
    if (key < bestKey) {
      bestKey = key;
      best = { word, path: wordPath };
    }
  }
  return best;
}

/**
 * A real word on today's board that a stuck first-time player can trace: everyday words first,
 * then the dictionary word made of the most common letters. Never a word of the
 * hidden word's length, which would spend one of the ten tries.
 */
export function findStarterWord(input: FindStarterWordInput): StarterWord | null {
  if (!input.grid?.length) return null;
  const skip = new Set(input.exclude.map((w) => normalizeWord(w.toUpperCase(), input.language)));
  return fromCurated(input, skip) ?? fromDictionary(input, skip);
}
