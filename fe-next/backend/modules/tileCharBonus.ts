type Tile = { row: number; col: number };
type Grid = ReadonlyArray<ReadonlyArray<unknown>>;

/**
 * Letter-based tile bonus (golden, lightning, meteor). The server has no
 * submitted path for board words, so a word earns it when it uses any letter
 * that sits on a marked tile, even if the player traced a different copy.
 */
export function tileCharBonus(word: string, tiles: readonly Tile[] | null | undefined, grid: Grid | null | undefined, wordScore: number, rate: number): number {
  if (!tiles?.length || !grid) return 0;
  const marked = new Set(
    tiles
      .map(({ row, col }) => grid[row]?.[col])
      .filter((ch) => ch !== undefined && ch !== null && ch !== '')
      .map((ch) => String(ch).toLowerCase()),
  );
  if (marked.size === 0) return 0;
  const usesMarked = [...word.toLowerCase()].some((ch) => marked.has(ch));
  return usesMarked ? Math.ceil(wordScore * rate) : 0;
}
