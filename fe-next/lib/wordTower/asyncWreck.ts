/**
 * Word Tower — apply pending async wrecking-ball attacks (pure).
 *
 * The async raid loop (Clash-of-Clans style, scaled to our small pool): an
 * attacker spends a charge to wreck a rival; the hit is persisted and lands when
 * the DEFENDER next starts a climb. This module folds a batch of pending wrecks
 * into the defender's RESTORED session state at start-up:
 *   - knocks the summed floors off the tower (via {@link damageTower}, which only
 *     touches floors/height/combo — the personal-best high-water mark and the
 *     server's monotonic `best_*` columns are never affected),
 *   - hands back compensation scrambles so the beat feels fair, not punitive,
 *   - reports attacker names + applied ids so the caller can show a "Wreck
 *     Report" and mark the rows applied idempotently.
 *
 * Pure + renderer-agnostic so the apply maths are unit-testable without a DB.
 */

import { damageTower, type WordTowerPlayerState } from './wordTowerManager';
import { WRECK_COMPENSATION_SCRAMBLES } from './sabotage';
import { WORD_TOWER_SCRAMBLES_MAX_BANKED } from '@/shared/constants/wordTowerConstants';

export interface PendingWreck {
  id: string;
  attackerName: string;
  damageFloors: number;
}

export interface AsyncWreckResult {
  state: WordTowerPlayerState;
  totalFloorsRemoved: number;
  totalMetersLost: number;
  attackerNames: string[];
  appliedIds: string[];
  compensationScrambles: number;
}

export function applyAsyncWrecks(
  state: WordTowerPlayerState,
  pending: ReadonlyArray<PendingWreck>,
): AsyncWreckResult {
  if (pending.length === 0) {
    return {
      state,
      totalFloorsRemoved: 0,
      totalMetersLost: 0,
      attackerNames: [],
      appliedIds: [],
      compensationScrambles: 0,
    };
  }

  const totalFloors = pending.reduce((s, w) => s + Math.max(0, Math.floor(w.damageFloors)), 0);
  const { state: damaged, removed, metersLost } = damageTower(state, totalFloors);

  // Compensation: a flat scramble top-up (capped) so the defender starts with a
  // tool to climb back, not just a deficit.
  const compensationScrambles = WRECK_COMPENSATION_SCRAMBLES;
  const scramblesLeft = Math.min(
    WORD_TOWER_SCRAMBLES_MAX_BANKED,
    damaged.scramblesLeft + compensationScrambles,
  );

  return {
    state: { ...damaged, scramblesLeft },
    totalFloorsRemoved: removed,
    totalMetersLost: metersLost,
    attackerNames: pending.map((w) => w.attackerName),
    appliedIds: pending.map((w) => w.id),
    compensationScrambles,
  };
}
