/**
 * Structural equality for two Blast boards (grid letters + per-cell tile state),
 * used to skip redundant applyServerBoard() replacements in multiplayer.
 *
 * Why: in MP the client predicts the board optimistically, then the server
 * echoes a FULL authoritative board. When the prediction was right (the common
 * case), replacing the tileStates array wholesale still re-renders every tile —
 * positional keys + AnimatePresence turn that into exit/enter flicker. Skipping
 * the replacement when boards are equal eliminates that flicker.
 *
 * SAFETY: a false "equal" keeps a stale client board (a correctness bug), so we
 * compare EVERY rendered/gameplay field of BlastTileState. uid/row/col are
 * deliberately excluded — they don't affect what is drawn, and comparing uid
 * would re-trigger the remount we are trying to avoid.
 */
import type { BlastTileState } from '@/shared/types/blast';
import type { LetterGrid } from '@/types';

/** Every BlastTileState field that affects rendering or selectability. Keep in
 *  sync with shared/types/blast.ts — uid/row/col excluded by design. */
const COMPARED_FIELDS: ReadonlyArray<keyof BlastTileState> = [
  'type',
  'isCleared',
  'activationEffect',
  'hitsRemaining',
  'innerType',
  'isThawed',
  'countdown',
  'portalPairId',
  'crystalMultiplier',
  'fuseGroupId',
  'fuseTimer',
  'colorTag',
  'jellyLayers',
  'cakeHp',
  'cakeAnchorUid',
];

export function blastBoardsEqual(
  gridA: LetterGrid,
  tilesA: BlastTileState[][],
  gridB: LetterGrid,
  tilesB: BlastTileState[][],
): boolean {
  if (tilesA.length !== tilesB.length) return false;
  if (gridA.length !== gridB.length) return false;

  for (let r = 0; r < tilesA.length; r++) {
    const rowA = tilesA[r];
    const rowB = tilesB[r];
    if (rowA.length !== rowB.length) return false;
    if ((gridA[r]?.length ?? 0) !== (gridB[r]?.length ?? 0)) return false;

    for (let c = 0; c < rowA.length; c++) {
      // Letter
      if (gridA[r]?.[c] !== gridB[r]?.[c]) return false;
      // Tile fields
      const ta = rowA[c];
      const tb = rowB[c];
      for (const field of COMPARED_FIELDS) {
        if (ta[field] !== tb[field]) return false;
      }
    }
  }

  return true;
}

/**
 * Content equality for two tileStates matrices (same fields as blastBoardsEqual,
 * minus the letter grid). Used by effects that must distinguish "fresh array,
 * same content" from a real server overlay update — treating them as equal is
 * what prevents setState loops when a caller rebuilds the array every render.
 */
export function blastTileStatesEqual(
  tilesA: BlastTileState[][],
  tilesB: BlastTileState[][],
): boolean {
  if (tilesA.length !== tilesB.length) return false;
  for (let r = 0; r < tilesA.length; r++) {
    const rowA = tilesA[r];
    const rowB = tilesB[r];
    if (rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c++) {
      const ta = rowA[c];
      const tb = rowB[c];
      for (const field of COMPARED_FIELDS) {
        if (ta[field] !== tb[field]) return false;
      }
    }
  }
  return true;
}
