/**
 * Duel combo scoring (server-side source of truth).
 *
 * Real-time duels used to pay a flat dictionary score per word regardless of
 * pace. This module adds a streak: words accepted inside a rolling window chain
 * together and each one pays a flat ADDITIVE bonus on top of its base score.
 *
 * Additive, never multiplicative — a 9-letter word on a hot streak is
 * `base + bonus`, so the streak rewards pace without letting one lucky long
 * word decide the duel.
 *
 * The client never recomputes points: it renders the streak/bonus the server
 * sends with `duel:word-accepted` (recurring-pitfalls Class 3 — one side owns
 * the number, the other displays it).
 */

/** Words landing within this many ms of the previous accepted word chain. */
export const DUEL_COMBO_WINDOW_MS = 8_000;

/** Flat points added per extra word in the chain. */
export const DUEL_COMBO_BONUS_STEP = 2;

/** Hard ceiling on the per-word combo bonus. */
export const DUEL_COMBO_MAX_BONUS = 10;

export interface DuelComboState {
  /** Current unbroken chain length. 0 = no chain. */
  streak: number;
  /** Epoch ms of the last accepted word, 0 when there is none. */
  lastAcceptedAt: number;
}

export interface DuelComboResult {
  streak: number;
  bonus: number;
}

export function createDuelComboState(): DuelComboState {
  return { streak: 0, lastAcceptedAt: 0 };
}

/**
 * Register an accepted word. Mutates and returns the new streak + the additive
 * bonus this word earns.
 */
export function advanceDuelCombo(state: DuelComboState, nowMs: number): DuelComboResult {
  const withinWindow =
    state.streak > 0 && nowMs - state.lastAcceptedAt <= DUEL_COMBO_WINDOW_MS;

  state.streak = withinWindow ? state.streak + 1 : 1;
  state.lastAcceptedAt = nowMs;

  const bonus = Math.min((state.streak - 1) * DUEL_COMBO_BONUS_STEP, DUEL_COMBO_MAX_BONUS);

  return { streak: state.streak, bonus };
}

/** Register a rejected word — the chain snaps. */
export function breakDuelCombo(state: DuelComboState): void {
  state.streak = 0;
}
