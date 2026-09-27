/** Board-path helpers for the fx layer: which tiles a word used, which tiles a hint lights. */
import { findWordPath } from '@/utils/wordPathFinder';
import type { Language, LetterGrid } from '@/types';

export interface Cell { row: number; col: number }

const lower = (grid: readonly (readonly string[])[]) => grid.map((r) => r.map((c) => (c ?? '').toLowerCase())) as LetterGrid;

function solve(word: string, grid: readonly (readonly string[])[], language: string): Cell[] {
  const path = findWordPath(word.toLowerCase(), lower(grid), language as Language);
  return path ? path.map(({ row, col }) => ({ row, col })) : [];
}

/** Hint tiles: the first 2 tiles of a real board path, or the whole path with the full-reveal relic. */
export function hintCells(word: string, grid: readonly (readonly string[])[], language: string, full: boolean): Cell[] {
  const path = solve(word, grid, language);
  return full ? path : path.slice(0, 2);
}

/** Tiles a submitted word used: the path the player traced when it spells the word, else a solved one. */
export function resolveHitPath(word: string, traced: readonly Cell[] | null, grid: readonly (readonly string[])[], language: string): Cell[] {
  if (traced && traced.length > 0) {
    const spelled = traced.map(({ row, col }) => grid[row]?.[col] ?? '').join('').toLowerCase();
    if (spelled === word.toLowerCase()) return traced.map(({ row, col }) => ({ row, col }));
  }
  return solve(word, grid, language);
}
