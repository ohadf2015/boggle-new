/**
 * Pure logic for blast cell selectability filtering.
 *
 * Board effects:
 * - ice/frozen: NOT selectable until thawed by an adjacent word
 * - gem: only selectable when current path already has 2+ tiles
 * - all others: always selectable
 */
import type { BlastTileState } from '../types';
import type { GridPosition } from '@/types';
import { isAdjacentCell } from '@/components/grid/gridGeometry';
// Thaw logic lives in a pure util (single source of truth, shared with the
// server cascade). Re-exported here so existing client import sites keep working.
import { THAWABLE_TYPES, computeThawedCells } from '../utils/blastThaw';

export { computeThawedCells };

type CellCoord = { row: number; col: number };

/**
 * Returns a function (row, col) => boolean indicating if a cell is selectable.
 * @param tileStates - current tile state grid
 * @param currentPath - tiles already selected in the current drag path
 */
export function computeCellFilter(
  tileStates: BlastTileState[][],
  currentPath: CellCoord[],
): (row: number, col: number, currentPathLength?: number) => boolean {
  return (row: number, col: number, currentPathLength?: number): boolean => {
    const tile = tileStates[row]?.[col];
    if (!tile) return false;

    // Cleared tiles — not really on the board
    if (tile.isCleared) return true;

    // Ice/frozen: blocked until thawed
    if (THAWABLE_TYPES.has(tile.type) && !tile.isThawed) {
      return false;
    }

    // Gem: requires 2+ tiles already in path (strategic gating)
    // Use currentPathLength from drag ref when available (avoids stale React state)
    const pathLen = currentPathLength ?? currentPath.length;
    if (tile.type === 'gem' && pathLen < 2) {
      return false;
    }

    return true;
  };
}

/**
 * Creates a portal-aware adjacency function for blast mode.
 * Two cells are "adjacent" if they are standard 8-directional neighbors,
 * OR if cell1 is a portal and cell2 is adjacent to cell1's portal partner
 * (but not the partner cell itself — you teleport THROUGH portals, not TO them).
 */
export function createPortalAdjacency(
  tileStates: BlastTileState[][],
): (cell1: GridPosition, cell2: GridPosition) => boolean {
  // Pre-build portal partner lookup: position key → partner position
  const portalPartner = new Map<string, GridPosition>();
  const portalsByPairId = new Map<string, GridPosition[]>();

  for (const row of tileStates) {
    for (const tile of row) {
      if (tile.type === 'portal' && tile.portalPairId && !tile.isCleared) {
        const existing = portalsByPairId.get(tile.portalPairId) ?? [];
        existing.push({ row: tile.row, col: tile.col });
        portalsByPairId.set(tile.portalPairId, existing);
      }
    }
  }

  for (const positions of portalsByPairId.values()) {
    if (positions.length === 2) {
      portalPartner.set(`${positions[0].row}-${positions[0].col}`, positions[1]);
      portalPartner.set(`${positions[1].row}-${positions[1].col}`, positions[0]);
    }
  }

  return (cell1: GridPosition, cell2: GridPosition): boolean => {
    // Standard adjacency always works
    if (isAdjacentCell(cell1, cell2)) return true;

    // Portal teleportation: if cell1 is a portal with a partner,
    // check if cell2 is adjacent to the partner (but not the partner itself)
    const partner = portalPartner.get(`${cell1.row}-${cell1.col}`);
    if (partner) {
      // Block direct movement to partner cell
      if (cell2.row === partner.row && cell2.col === partner.col) return false;
      // Allow if cell2 is adjacent to partner
      if (isAdjacentCell(partner, cell2)) return true;
    }

    return false;
  };
}
