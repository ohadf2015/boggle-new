/**
 * Ranked Result Store
 *
 * Simple shared store for ranked game MMR change data.
 * Lives outside Zustand to avoid coupling with the game state store,
 * since MMR changes arrive with the validatedScores payload and are
 * consumed by the results UI component.
 */

export interface MmdChangeInfo {
  oldMmr: number;
  newMmr: number;
  delta: number;
}

let _mmrChanges: Record<string, MmdChangeInfo> | null = null;

export function setMmdChanges(changes: Record<string, MmdChangeInfo> | null): void {
  _mmrChanges = changes;
}

export function getMmdChanges(): Record<string, MmdChangeInfo> | null {
  return _mmrChanges;
}

export function clearMmdChanges(): void {
  _mmrChanges = null;
}