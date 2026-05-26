import type { Board } from '../board';
import type { PlacedTile } from '../types';
import { validateAndScoreMove } from '../moveValidator';
import { resolveCommitTier, type CommitTier } from './commitTier';

export interface ScorePreview {
  score: number;
  tier: CommitTier;
  bingoReady: boolean;
}

/**
 * Speculative score for the current pending placements. Assumes any word
 * formed would be dictionary-valid — we want the badge to show the player
 * "if you commit now, this is what you'd score" without bouncing on dict
 * checks the placement might still fail. Returns null when the placement
 * isn't even geometrically valid yet.
 */
export function previewScore(board: Board, placements: readonly PlacedTile[]): ScorePreview | null {
  if (placements.length === 0) return null;
  const result = validateAndScoreMove(board, placements as PlacedTile[], () => true);
  if (!result.ok || typeof result.score !== 'number') return null;

  const bingoReady = placements.length >= 7;
  let premiumTriggered = false;
  let hasRareTile = false;
  for (const p of placements) {
    if (p.value >= 8) hasRareTile = true;
    const cell = board.cells[p.row]?.[p.col];
    if (cell?.premium) premiumTriggered = true;
  }

  const tier = resolveCommitTier({
    scoreThisTurn: result.score,
    tilesPlaced: placements.length,
    bingo: bingoReady,
    streak: 0,
    hasRareTile,
    premiumTriggered,
    heatLevel: 0,
  });

  return { score: result.score, tier, bingoReady };
}
