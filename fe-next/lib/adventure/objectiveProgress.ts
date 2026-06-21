/**
 * Objective progress helpers
 *
 * Shared, pure logic for adventure level objectives — progress fraction,
 * human-readable label, and primary-objective selection. Centralizes math
 * that was previously duplicated across AdventureObjectives / GameSidebar /
 * ObjectiveProgress, and powers the in-game PrimaryObjectiveBanner.
 */

import type { LevelObjective } from '@/types/adventure';
import { OBJECTIVE_TRANSLATION_KEYS } from './constants';

export interface ObjectiveProgress {
  current: number;
  target: number;
  /** 0–100, clamped. */
  pct: number;
  isComplete: boolean;
}

/** Compute clamped progress for an objective. */
export function getObjectiveProgress(objective: LevelObjective): ObjectiveProgress {
  const current = objective.current ?? 0;
  const target = objective.target;
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = objective.isComplete ?? (target > 0 && current >= target);
  return { current, target, pct, isComplete };
}

/** Translate an objective to its human-readable label, passing the target param. */
export function getObjectiveLabel(
  objective: LevelObjective,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const key = OBJECTIVE_TRANSLATION_KEYS[objective.type] ?? objective.type;
  return t(key, { target: objective.target });
}

/**
 * Pick the single objective to feature as the player's primary goal:
 * an incomplete flagged-primary first, then any primary, then the first
 * incomplete objective, then the first objective. Returns null when empty.
 */
export function selectPrimaryObjective(
  objectives: LevelObjective[]
): LevelObjective | null {
  if (!objectives || objectives.length === 0) return null;

  const primaries = objectives.filter((o) => o.isPrimary);
  const incompletePrimary = primaries.find((o) => !getObjectiveProgress(o).isComplete);
  if (incompletePrimary) return incompletePrimary;
  if (primaries.length > 0) return primaries[0];

  const firstIncomplete = objectives.find((o) => !getObjectiveProgress(o).isComplete);
  return firstIncomplete ?? objectives[0];
}
