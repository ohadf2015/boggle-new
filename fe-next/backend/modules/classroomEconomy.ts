/**
 * In-round economy for classroom live games. Pure: no Redis, no sockets.
 * The store and socket layers call these and own all I/O, so every number a
 * student sees comes from one place the server computes.
 *
 * Cash carries across rounds. Streak, shield and double-cash do not.
 */

import { COSMETICS } from '@/lib/cosmetics';

export interface EconomyState {
  cash: number;
  cashEarned: number;
  streak: number;
  roundId: string | null;
  doubleCashUntil: number | null;
  shieldHeld: boolean;
  hintsHeld: number;
}

export type PowerUpId = 'doubleCash' | 'streakShield' | 'hintReveal';

export const POWER_UPS: Record<PowerUpId, { cost: number; durationMs?: number }> = {
  doubleCash: { cost: 15, durationMs: 30_000 },
  streakShield: { cost: 20 },
  hintReveal: { cost: 10 },
};

export const WRONG_ANSWER_COST = 2;

const BASE_CAP = 6;

export function emptyEconomyState(): EconomyState {
  return {
    cash: 0,
    cashEarned: 0,
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
  return { ...state, roundId, streak: 0, shieldHeld: false, doubleCashUntil: null };
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
    state: { ...state, streak, cash: state.cash + delta, cashEarned: state.cashEarned + delta },
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

/** Published odds. The student UI reads this same object, never a copy. */
export const CHEST_ODDS: Record<'common' | 'rare' | 'epic', number> = {
  common: 0.7,
  rare: 0.25,
  epic: 0.05,
};

export const CHEST_XP: Record<'common' | 'rare' | 'epic', number> = {
  common: 10,
  rare: 25,
  epic: 60,
};

export interface ChestRoll {
  rarity: 'common' | 'rare' | 'epic';
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

function poolFor(rarity: 'common' | 'rare' | 'epic'): string[] {
  const ids = COSMETICS.filter((c) => c.rarity === rarity).map((c) => c.id);
  return ids.length > 0 ? ids : COSMETICS.filter((c) => c.rarity === 'common').map((c) => c.id);
}

/** Deterministic in its seed, so a replayed claim cannot re-roll a better chest. */
export function rollChest(seed: string): ChestRoll {
  const u = hash01(`rarity:${seed}`);
  const rarity: ChestRoll['rarity'] = u < CHEST_ODDS.epic ? 'epic' : u < CHEST_ODDS.epic + CHEST_ODDS.rare ? 'rare' : 'common';
  const pool = poolFor(rarity);
  const pick = Math.floor(hash01(`item:${seed}`) * pool.length) % pool.length;
  return { rarity, xp: CHEST_XP[rarity], itemId: pool[pick] };
}
