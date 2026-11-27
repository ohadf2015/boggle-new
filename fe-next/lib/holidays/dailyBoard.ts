import type { LetterGrid } from '@/types';
import { normalizeHebrewFinalLetters } from '@/utils/dailyChallenge/constants';
import { hashString, mulberry32 } from '@/utils/dailyChallenge/prng';
import { trackIndex, windowFor, type HolidayKey } from './calendar';
import { GIFT_WORDS } from './dailyGiftWords';

export interface Cell {
  row: number;
  col: number;
}

export const GELT_COINS = 5;
export const GELT_CAP_COINS = 40;
export const GIFT_COINS = 100;

export type HolidayDailyPlan =
  | { kind: 'nightly'; holiday: 'hanukkah'; day: number; gelt: Cell[] }
  | { kind: 'advent'; holiday: 'christmas'; day: number; giftWord: string; giftLength: number };

export interface HolidayWordsResult {
  geltWords: string[];
  giftFound: boolean;
  coins: number;
}

const HANUKKAH_NIGHTS = 8;

function seeded(tag: string, puzzleDate: string, language: string): () => number {
  return mulberry32(hashString(`lexiclash-holiday-${tag}-${puzzleDate}-${language}`));
}

export function normalizeHolidayWord(word: string): string {
  return normalizeHebrewFinalLetters(word).toUpperCase();
}

export function geltCells(grid: LetterGrid, puzzleDate: string, language: string, count: number): Cell[] {
  const cells = grid.flatMap((row, r) => row.map((_, c) => ({ row: r, col: c })));
  const random = seeded('gelt', puzzleDate, language);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, Math.max(0, count));
}

export function pathThroughCells(word: string, grid: LetterGrid, cells: readonly Cell[]): Cell[] | null {
  const target = normalizeHolidayWord(word);
  if (!target || !grid.length) return null;
  const rows = grid.length;
  const cols = grid[0].length;
  const upper = grid.map((row) => row.map((c) => (c ?? '').toUpperCase()));
  const marked = new Set(cells.map((c) => c.row * cols + c.col));
  const path: Cell[] = [];
  const visited = new Set<number>();

  const dfs = (r: number, c: number, i: number, touched: boolean): boolean => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const key = r * cols + c;
    if (visited.has(key) || upper[r][c] !== target[i]) return false;
    const hit = touched || marked.has(key);
    path.push({ row: r, col: c });
    if (i === target.length - 1 && hit) return true;
    visited.add(key);
    if (i < target.length - 1) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((dr || dc) && dfs(r + dr, c + dc, i + 1, hit)) return true;
        }
      }
    }
    visited.delete(key);
    path.pop();
    return false;
  };

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (dfs(r, c, 0, false)) return path;
  return null;
}

export function wordThroughCells(word: string, grid: LetterGrid, cells: readonly Cell[]): boolean {
  return pathThroughCells(word, grid, cells) !== null;
}

export function giftWordFor(grid: LetterGrid, puzzleDate: string, language: string): string | null {
  const list = [...(GIFT_WORDS[language] ?? [])];
  if (!list.length) return null;
  const random = seeded('gift', puzzleDate, language);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const all = grid.flatMap((row, r) => row.map((_, c) => ({ row: r, col: c })));
  return list.map(normalizeHolidayWord).find((w) => wordThroughCells(w, grid, all)) ?? null;
}

export function holidayDailyDay(holiday: HolidayKey, puzzleDate: string, language: string): number | null {
  const win = windowFor(holiday, puzzleDate, language);
  if (!win) return null;
  const idx = trackIndex(win, puzzleDate);
  if (holiday === 'hanukkah') return idx === null ? HANUKKAH_NIGHTS : idx + 1;
  return idx === null || !GIFT_WORDS[language]?.length ? null : idx + 1;
}

export function holidayDailyPlan(i: {
  holiday: HolidayKey;
  puzzleDate: string;
  language: string;
  grid: LetterGrid;
}): HolidayDailyPlan | null {
  const day = holidayDailyDay(i.holiday, i.puzzleDate, i.language);
  if (day === null) return null;
  if (i.holiday === 'hanukkah') {
    return { kind: 'nightly', holiday: 'hanukkah', day, gelt: geltCells(i.grid, i.puzzleDate, i.language, day) };
  }
  const giftWord = giftWordFor(i.grid, i.puzzleDate, i.language);
  return giftWord ? { kind: 'advent', holiday: 'christmas', day, giftWord, giftLength: giftWord.length } : null;
}

export function settleHolidayWords(plan: HolidayDailyPlan, grid: LetterGrid, words: readonly string[]): HolidayWordsResult {
  const unique = [...new Set(words.map(normalizeHolidayWord))];
  if (plan.kind === 'advent') {
    const giftFound = unique.includes(normalizeHolidayWord(plan.giftWord));
    return { geltWords: [], giftFound, coins: giftFound ? GIFT_COINS : 0 };
  }
  const geltWords = unique.filter((w) => w.length >= 2 && wordThroughCells(w, grid, plan.gelt));
  return { geltWords, giftFound: false, coins: Math.min(GELT_CAP_COINS, geltWords.length * GELT_COINS) };
}
