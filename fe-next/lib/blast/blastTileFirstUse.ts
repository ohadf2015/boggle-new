import type { BlastTileType } from '@/shared/types/blast';

/**
 * First-use teaching for blast special tiles.
 *
 * The user feedback was "I can't tell what each special tile does." Curation
 * trimmed the roster to a legible core; this teaches that core the first time
 * each tile actually shows up on the player's board — one short, non-blocking
 * callout per tile, ever. The order matches the FTUE unlock cadence so the
 * callout introduces a tile roughly when the player first meets it.
 *
 * Pure + deterministic so the selection logic is unit-tested without a DOM.
 */
export const BLAST_TEACHABLE_ORDER: readonly BlastTileType[] = [
  'bomb',
  'ice',
  'gold',
  'rainbow',
  'prism',
  'lightning',
  'frozen',
  'mystery',
];

/**
 * Pick the next special tile to teach: the first teachable type that is
 * present on the board AND not yet seen. Returns null when everything present
 * has already been taught (or nothing teachable is on the board).
 */
export function selectBlastTileToTeach(
  presentTypes: Iterable<BlastTileType>,
  seen: ReadonlySet<BlastTileType>,
  order: readonly BlastTileType[] = BLAST_TEACHABLE_ORDER,
): BlastTileType | null {
  const present = presentTypes instanceof Set ? presentTypes : new Set(presentTypes);
  for (const type of order) {
    if (present.has(type) && !seen.has(type)) return type;
  }
  return null;
}

/**
 * Collect the distinct special tile types currently visible (not cleared) on a
 * blast board. Accepts the engine's `tileStates` grid shape (rows of cells with
 * `{ type, isCleared }`). Standard tiles are ignored.
 */
export function collectVisibleSpecialTypes(
  tileStates: ReadonlyArray<ReadonlyArray<{ type: BlastTileType; isCleared: boolean }>> | null | undefined,
): Set<BlastTileType> {
  const out = new Set<BlastTileType>();
  if (!tileStates) return out;
  for (const row of tileStates) {
    for (const cell of row) {
      if (cell && !cell.isCleared && cell.type !== 'standard') out.add(cell.type);
    }
  }
  return out;
}
