/**
 * In-round economy for classroom live games. Pure: no Redis, no sockets.
 * The store and socket layers call these and own all I/O, so every number a
 * student sees comes from one place the server computes.
 *
 * Cash and a held shield carry across rounds (the between-round shop sells
 * them for the next round). Streak and double-cash do not.
 */

import {
  CHEST_ODDS,
  CHEST_XP,
  POWER_UPS,
  WRONG_ANSWER_COST,
  type ChestRarity,
  type PowerUpId,
} from '@/shared/constants/classroomEconomy';
import { chestPartPool } from './classroomEconomyPool';

export { CHEST_ODDS, CHEST_XP, POWER_UPS, WRONG_ANSWER_COST };
export type { PowerUpId };

export interface EconomyState {
  cash: number;
  cashEarned: number;
  /** Cash earned in the round named by roundId. Resets at the round boundary. */
  roundCash: number;
  streak: number;
  roundId: string | null;
  doubleCashUntil: number | null;
  shieldHeld: boolean;
  hintsHeld: number;
}

const BASE_CAP = 6;

export function emptyEconomyState(): EconomyState {
  return {
    cash: 0,
    cashEarned: 0,
    roundCash: 0,
    streak: 0,
    roundId: null,
    doubleCashUntil: null,
    shieldHeld: false,
    hintsHeld: 0,
  };
}

export function wordCash(input: { wordLength: number; fromLesson: boolean }): number {
  const base = Math.min(BASE_CAP, Math.max(1, input.wordLength - 2));
  return input.fromLesson ? base * 2 : base;
}

export function streakMultiplier(streak: number): 1 | 2 | 3 {
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function applyRoundBoundary(state: EconomyState, roundId: string): EconomyState {
  if (state.roundId === roundId) return state;
  return { ...state, roundId, roundCash: 0, streak: 0, doubleCashUntil: null };
}

export function recordCorrectWord(
  state: EconomyState,
  input: { wordLength: number; fromLesson: boolean; now: number }
): { state: EconomyState; delta: number; multiplier: 1 | 2 | 3; streak: number } {
  const streak = state.streak + 1;
  const multiplier = streakMultiplier(streak);
  const doubled = state.doubleCashUntil !== null && input.now < state.doubleCashUntil ? 2 : 1;
  const delta = wordCash(input) * multiplier * doubled;
  return {
    state: { ...state, streak, cash: state.cash + delta, cashEarned: state.cashEarned + delta, roundCash: state.roundCash + delta },
    delta,
    multiplier,
    streak,
  };
}

export function recordWrongWord(
  state: EconomyState,
  input: { costEnabled: boolean }
): { state: EconomyState; cost: number } {
  if (state.shieldHeld) {
    return { state: { ...state, shieldHeld: false }, cost: 0 };
  }
  const cost = input.costEnabled ? Math.min(WRONG_ANSWER_COST, state.cash) : 0;
  return { state: { ...state, cash: state.cash - cost, streak: 0 }, cost };
}

export type BuyResult =
  | { ok: true; state: EconomyState }
  | { ok: false; reason: 'unknown_power_up' | 'insufficient_cash' | 'already_active' | 'already_held'; state: EconomyState };

export function buyPowerUp(state: EconomyState, id: string, now: number): BuyResult {
  if (!isPowerUpId(id)) return { ok: false, reason: 'unknown_power_up', state };
  const { cost, durationMs } = POWER_UPS[id];
  if (state.cash < cost) return { ok: false, reason: 'insufficient_cash', state };
  const paid = { ...state, cash: state.cash - cost };
  if (id === 'doubleCash') {
    if (state.doubleCashUntil !== null && now < state.doubleCashUntil) {
      return { ok: false, reason: 'already_active', state };
    }
    return { ok: true, state: { ...paid, doubleCashUntil: now + (durationMs ?? 0) } };
  }
  if (id === 'streakShield') {
    if (state.shieldHeld) return { ok: false, reason: 'already_held', state };
    return { ok: true, state: { ...paid, shieldHeld: true } };
  }
  return { ok: true, state: { ...paid, hintsHeld: state.hintsHeld + 1 } };
}

export function useHint(state: EconomyState): { ok: boolean; state: EconomyState } {
  if (state.hintsHeld <= 0) return { ok: false, state };
  return { ok: true, state: { ...state, hintsHeld: state.hintsHeld - 1 } };
}

export function isPowerUpId(id: string): id is PowerUpId {
  return Object.prototype.hasOwnProperty.call(POWER_UPS, id);
}

export interface ChestRoll {
  rarity: ChestRarity;
  xp: number;
  itemId: string;
}

function hash01(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

/** Deterministic in its seed, so a replayed claim cannot re-roll a better chest. */
export function rollChest(seed: string): ChestRoll {
  const u = hash01(`rarity:${seed}`);
  const rarity: ChestRarity = u < CHEST_ODDS.epic ? 'epic' : u < CHEST_ODDS.epic + CHEST_ODDS.rare ? 'rare' : 'common';
  const pool = chestPartPool(rarity);
  const pick = Math.floor(hash01(`item:${seed}`) * pool.length) % pool.length;
  return { rarity, xp: CHEST_XP[rarity], itemId: pool[pick] };
}

/** One student's cash and placing in one round. Rank is null when they earned nothing in it. */
export function roundStanding(
  all: Record<string, EconomyState>,
  roundId: string,
  userId: string
): { roundCash: number; rank: number | null; size: number } {
  const earners = Object.entries(all)
    .filter(([, s]) => s.roundId === roundId && s.roundCash > 0)
    .sort((a, b) => b[1].roundCash - a[1].roundCash);
  const index = earners.findIndex(([uid]) => uid === userId);
  const own = all[userId];
  const roundCash = own && own.roundId === roundId ? own.roundCash : 0;
  return { roundCash, rank: index === -1 ? null : index + 1, size: earners.length };
}
