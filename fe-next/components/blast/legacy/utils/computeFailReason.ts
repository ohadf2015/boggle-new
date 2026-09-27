/**
 * computeFailReason — derive a specific, actionable wave-fail reason from
 * clear stats. Keeps the math out of the React layer so it's testable.
 *
 * Sprint 1 clarity guard: enables "Just N tiles short!" copy on the wave-fail
 * card instead of the older generic "Game Over" message.
 */

const ADVANCE_THRESHOLD_PCT = 90;

export interface ComputeFailReasonInput {
  tilesCleared: number;
  totalTiles: number;
}

export type FailReasonKind = 'tiles_short' | 'met';

export interface FailReason {
  kind: FailReasonKind;
  /** Additional tiles needed to reach the 90% advance bar. */
  tilesShort: number;
}

export function computeFailReason({
  tilesCleared,
  totalTiles,
}: ComputeFailReasonInput): FailReason {
  if (totalTiles <= 0) return { kind: 'met', tilesShort: 0 };

  const required = Math.ceil((totalTiles * ADVANCE_THRESHOLD_PCT) / 100);
  const short = Math.max(0, required - tilesCleared);

  if (short === 0) return { kind: 'met', tilesShort: 0 };
  return { kind: 'tiles_short', tilesShort: short };
}
