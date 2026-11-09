import type { Language, LetterGrid } from '@/types';
import { BONUS_WORD_LISTS } from '@/utils/dailyChallenge/wordLists';
import { findWordPath } from '@/utils/wordPathFinder';
import { normalizeWord } from '@/utils/clientWordValidator';
import type { HuntCell } from './huntStage';

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

function fromCurated(input: FindStarterWordInput, skip: Set<string>): StarterWord | null {
  const { grid, language, targetLength } = input;
  const curated = BONUS_WORD_LISTS[language] ?? [];
  const candidates = curated
    .map((w) => w.toUpperCase())
    .filter((w) => w.length >= MIN_LEN && w.length <= MAX_LEN + 1 && w.length !== targetLength)
    .filter((w) => !skip.has(normalizeWord(w, language)))
    .sort((a, b) => a.length - b.length);
  for (const word of candidates) {
    const path = findWordPath(word, grid, language);
    if (path) return { word, path: path.map(({ row, col }) => ({ row, col })) };
  }
  return null;
}

function fromDictionary(input: FindStarterWordInput, skip: Set<string>): StarterWord | null {
  const { grid, language, targetLength, isWord } = input;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const lengths = [MAX_LEN, MIN_LEN].filter((n) => n !== targetLength);

  for (const want of lengths) {
    const path: HuntCell[] = [];
    const used = new Set<string>();
    let hit: StarterWord | null = null;

    const walk = (r: number, c: number): boolean => {
      path.push({ row: r, col: c });
      used.add(`${r},${c}`);
      if (path.length === want) {
        const word = path.map((p) => String(grid[p.row][p.col])).join('').toUpperCase();
        if (!skip.has(normalizeWord(word, language)) && isWord(word)) {
          hit = { word, path: [...path] };
          return true;
        }
      } else {
        for (const [dr, dc] of NEIGHBOURS) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || used.has(`${nr},${nc}`)) continue;
          if (walk(nr, nc)) return true;
        }
      }
      path.pop();
      used.delete(`${r},${c}`);
      return false;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (walk(r, c)) return hit;
      }
    }
  }
  return null;
}

/**
 * A real word on today's board that a stuck first-time player can trace: curated common words
 * first (the generator plants some of them), then any short dictionary word. Never a word of the
 * hidden word's length, which would spend one of the ten tries.
 */
export function findStarterWord(input: FindStarterWordInput): StarterWord | null {
  if (!input.grid?.length) return null;
  const skip = new Set(input.exclude.map((w) => normalizeWord(w.toUpperCase(), input.language)));
  return fromCurated(input, skip) ?? fromDictionary(input, skip);
}
