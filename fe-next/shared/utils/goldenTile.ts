/**
 * Quick Play golden tile: a seeded surprise on some classic boards.
 *
 * About 60% of boards carry one golden cell. Any word whose path can run
 * through it scores double. The seed decides both whether a board has one and
 * where it sits, so the server's plausibility ceiling (submit rebuilds the
 * round from the seed) and the player's board always agree, and a challenge
 * link replays the same golden cell.
 *
 * Pure and dependency-free: imported by the server round builder and by the
 * client board.
 */

export interface GoldenCell {
  row: number;
  col: number;
}

/** Share of boards that get a golden tile. Not every board: that is the surprise. */
export const GOLDEN_TILE_CHANCE = 0.6;
/** Score multiplier for a word that runs through the golden tile. */
export const GOLDEN_MULTIPLIER = 2;

/** 32-bit FNV-1a. Stable across Node and browsers. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32) returning floats in [0, 1). */
export function seededRandom(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The golden cell for this seed and board, or null on boards without one.
 * `chance` lets a themed week guarantee one (1) without changing the default.
 */
export function pickGoldenTile(
  seed: string,
  grid: ReadonlyArray<ReadonlyArray<string>>,
  chance: number = GOLDEN_TILE_CHANCE,
): GoldenCell | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols || !seed) return null;
  const roll = (hashSeed(`golden:${seed}`) % 10_000) / 10_000;
  if (roll >= chance) return null;
  const idx = hashSeed(`golden-cell:${seed}`) % (rows * cols);
  return { row: Math.floor(idx / cols), col: idx % cols };
}

const HEBREW_FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

/** Lower-case and fold Hebrew final letters so a word matches its tiles. */
export function normalizeTileText(text: string): string {
  return [...String(text ?? '').toLowerCase()].map((ch) => HEBREW_FINALS[ch] ?? ch).join('');
}

/**
 * True when SOME valid board path for `word` passes through `cell`
 * (8-way adjacency, each tile used once). Multi-letter tiles match as a unit.
 * Generous by design: if the word can be traced through the golden tile, it counts.
 */
export function wordUsesCell(
  grid: ReadonlyArray<ReadonlyArray<string>>,
  word: string,
  cell: GoldenCell | null | undefined,
): boolean {
  if (!cell || !word) return false;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols) return false;
  if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) return false;
  const target = normalizeTileText(word);
  const tiles = grid.map((row) => row.map((t) => normalizeTileText(t)));
  const visited = new Uint8Array(rows * cols);

  const dfs = (r: number, c: number, pos: number, usedGolden: boolean): boolean => {
    const tile = tiles[r][c];
    if (!tile || !target.startsWith(tile, pos)) return false;
    const next = pos + tile.length;
    const golden = usedGolden || (r === cell.row && c === cell.col);
    if (next === target.length) return golden;
    visited[r * cols + c] = 1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || visited[nr * cols + nc]) continue;
        if (dfs(nr, nc, next, golden)) {
          visited[r * cols + c] = 0;
          return true;
        }
      }
    }
    visited[r * cols + c] = 0;
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0, false)) return true;
    }
  }
  return false;
}

/** Points multiplier for `word` on this board: 2 through the golden tile, else 1. */
export function goldenMultiplierFor(
  grid: ReadonlyArray<ReadonlyArray<string>>,
  word: string,
  cell: GoldenCell | null | undefined,
): number {
  return wordUsesCell(grid, word, cell) ? GOLDEN_MULTIPLIER : 1;
}
