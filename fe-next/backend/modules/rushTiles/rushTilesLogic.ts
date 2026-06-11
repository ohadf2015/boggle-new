/**
 * Pure rush-tile logic: spawn positions, cadence, and char-based scoring.
 *
 * Rush tiles are recurring transient bonus tiles that pop at random grid
 * positions for ALL players, live ~10s, then disappear — a server-driven
 * "rush" mechanic separate from the one-shot round events. Scoring is
 * char-based (a word qualifies if it uses any letter currently sitting on a
 * rush tile), matching the golden/lightning bonus model.
 *
 * Kept pure (RNG injected) so the spawn/cadence/scoring are unit-testable
 * without the socket or timer layer.
 */

export interface RushTile {
  row: number;
  col: number;
}

/** Each rush batch lives this long before the server clears it. */
export const RUSH_TILE_DURATION_MS = 10_000;

/** Recurring spawn cadence window (jittered between min and max). */
export const RUSH_SPAWN_MIN_MS = 18_000;
export const RUSH_SPAWN_MAX_MS = 26_000;

/** Bonus multiplier applied to the word score when a rush tile is used (+50%). */
export const RUSH_BONUS_MULT = 0.5;

type Rng = () => number;

/**
 * Pick `count` distinct, in-bounds tile positions, skipping anything in
 * `exclude` (keys formatted "row,col"). Caps at the number of free cells and
 * bounds attempts so it can never spin forever on a full/small grid.
 */
export function computeRushTilePositions(
  rows: number,
  cols: number,
  count: number,
  rng: Rng = Math.random,
  exclude: Set<string> = new Set(),
): RushTile[] {
  const result: RushTile[] = [];
  const seen = new Set(exclude);
  const free = rows * cols - exclude.size;
  const target = Math.min(count, Math.max(0, free));
  const maxAttempts = rows * cols * 4;
  let attempts = 0;

  while (result.length < target && attempts < maxAttempts) {
    attempts++;
    const row = Math.floor(rng() * rows);
    const col = Math.floor(rng() * cols);
    const key = `${row},${col}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ row, col });
    }
  }
  return result;
}

/** Jittered delay (ms) until the next rush batch, within [min, max]. */
export function nextRushDelayMs(
  rng: Rng = Math.random,
  min: number = RUSH_SPAWN_MIN_MS,
  max: number = RUSH_SPAWN_MAX_MS,
): number {
  return Math.round(min + rng() * (max - min));
}

/**
 * Number of rush tiles to spawn, scaled by grid size. Kept deliberately small:
 * scoring is char-based (a word qualifies if it uses ANY letter sitting on a
 * rush tile), so 1–2 tiles keeps the bonus a genuine "rush" instead of firing
 * on nearly every word and inflating scores.
 */
export function rushTileCountForGrid(rows: number, cols: number): number {
  const cells = rows * cols;
  if (cells <= 16) return 1; // 4x4 and below — one hot letter
  return 2;
}

/**
 * Char-based rush bonus. Returns the extra points (ceil of wordScore * mult)
 * when rush is active AND the word uses any letter currently on a rush tile.
 * Zero otherwise. Independent of `activeRoundEvent` by design — a rush tile
 * and a round event may be live at the same instant without clobbering each
 * other's scoring gate.
 */
export function computeRushBonus(
  wordScore: number,
  word: string,
  rushTiles: RushTile[] | undefined | null,
  grid: ReadonlyArray<ReadonlyArray<string>> | undefined | null,
  active: boolean,
  mult: number = RUSH_BONUS_MULT,
): number {
  if (!active || !rushTiles?.length || !grid?.length) return 0;

  const rushChars = rushTiles
    .map(tile => {
      const row = grid[tile.row];
      const ch = row ? row[tile.col] : undefined;
      return ch ? String(ch).toLowerCase() : '';
    })
    .filter(Boolean);

  if (rushChars.length === 0) return 0;

  const wordChars = word.toLowerCase().split('');
  const usesRush = wordChars.some(ch => rushChars.includes(ch));
  return usesRush ? Math.ceil(wordScore * mult) : 0;
}
