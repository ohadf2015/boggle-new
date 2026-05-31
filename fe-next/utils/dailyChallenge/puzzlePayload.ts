import type { LetterGrid } from '../../types';

export interface UsableDailyPuzzle {
  grid: LetterGrid;
  targetWord: string;
}

/**
 * A daily puzzle payload is only usable if it has a non-empty grid AND a
 * non-empty target word.
 *
 * The puzzle endpoint can return HTTP 200 with an empty body
 * ({ grid: null, targetWord: '' }) — from a stale/corrupt cache or an empty word
 * bank for a given day+language. Code that trusted `response.ok` (client) or the
 * generated payload (server) alone would advance the game to a state whose render
 * guard matched nothing → a blank screen. Validate before use/cache; otherwise
 * regenerate locally (the generator is deterministic per date+language, so every
 * client still gets the same board).
 */
export function isUsableDailyPuzzle(data: unknown): data is UsableDailyPuzzle {
  if (!data || typeof data !== 'object') return false;
  const { grid, targetWord } = data as { grid?: unknown; targetWord?: unknown };
  return (
    Array.isArray(grid) &&
    grid.length > 0 &&
    Array.isArray(grid[0]) &&
    (grid[0] as unknown[]).length > 0 &&
    typeof targetWord === 'string' &&
    targetWord.length > 0
  );
}
