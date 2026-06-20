/**
 * Combat status effects.
 *
 * Boss: a successful parry STUNS the boss — its ability activation is suppressed
 * for a short window (the player's reward for defending). Stun is shorter in
 * enrage so a low-HP boss stays threatening (rising difficulty).
 *
 * Player buffs: focusArmed (next valid word crits 2x), wardArmed (next boss
 * attack is auto-blocked). Both are one-shot.
 *
 * Pure: all time-based checks take an explicit `now` so they're deterministic.
 */

import type { BossVisualPhase } from './parry';

export interface CombatStatus {
  /** Epoch ms until which the boss is stunned (0 = not stunned). */
  stunUntil: number;
  /** Next valid word deals 2x crit. */
  focusArmed: boolean;
  /** Next boss attack is auto-blocked. */
  wardArmed: boolean;
}

export function createCombatStatus(): CombatStatus {
  return { stunUntil: 0, focusArmed: false, wardArmed: false };
}

const STUN_MS_BY_PHASE: Record<BossVisualPhase, number> = {
  phase1: 2200,
  phase2: 1800,
  enraged: 1300,
};

export function stunDurationForPhase(phase: BossVisualPhase): number {
  return STUN_MS_BY_PHASE[phase] ?? 1800;
}

/** Stun the boss until `now + durationMs`, never shortening an existing stun. */
export function applyStun(state: CombatStatus, now: number, durationMs: number): CombatStatus {
  const until = now + durationMs;
  return { ...state, stunUntil: Math.max(state.stunUntil, until) };
}

export function isStunned(state: CombatStatus, now: number): boolean {
  return now < state.stunUntil;
}

export function armFocus(state: CombatStatus): CombatStatus {
  return { ...state, focusArmed: true };
}

export function consumeFocus(state: CombatStatus): { state: CombatStatus; consumed: boolean } {
  if (!state.focusArmed) return { state, consumed: false };
  return { state: { ...state, focusArmed: false }, consumed: true };
}

export function armWard(state: CombatStatus): CombatStatus {
  return { ...state, wardArmed: true };
}

export function consumeWard(state: CombatStatus): { state: CombatStatus; consumed: boolean } {
  if (!state.wardArmed) return { state, consumed: false };
  return { state: { ...state, wardArmed: false }, consumed: true };
}
