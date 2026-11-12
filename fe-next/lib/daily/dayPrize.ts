/**
 * Daily prizes: a variable reward for clearing the day.
 *
 * Two prizes a day, each rolled once per player per date:
 *  - `clear`: the two required quests (Word Wheel + Word Hunt) are done. This is
 *    what the hub calls "clearing the day", so it is what pays first.
 *  - `perfect`: all four quests, bonuses included.
 *
 * The roll is a pure hash of (player, date, kind), so the server and a retry
 * always agree on what the box held, and a repeat claim can answer with the
 * same prize without storing a second copy of the roll. Mostly small, sometimes
 * lucky, rarely a jackpot, with the odds shown on the box.
 *
 * Play inside the education system (teacher accounts, classroom students) gets
 * a fixed amount instead (`eduDayPrize`): no roll, no tier. The claim route
 * decides which, server-side.
 */

import type { ChestItemDrop } from '@/lib/avatar/chestDrops';

export type DayPrizeKind = 'clear' | 'perfect';
export type DayPrizeTier = 'common' | 'lucky' | 'jackpot';

export interface DayPrize {
  kind: DayPrizeKind;
  tier: DayPrizeTier;
  coins: number;
  xp: number;
  /** True for the education side's fixed prize (no roll, no tier to show). */
  fixed: boolean;
}

interface PrizeTable {
  /** Common payouts, one picked at random. */
  common: readonly number[];
  lucky: number;
  jackpot: number;
  xp: number;
}

export const DAY_PRIZE_TABLE: Record<DayPrizeKind, PrizeTable> = {
  clear: { common: [15, 20, 25, 30], lucky: 50, jackpot: 100, xp: 50 },
  perfect: { common: [40, 50, 60], lucky: 90, jackpot: 150, xp: 100 },
};

/** Odds of the two rare tiers; the rest is common. */
export const JACKPOT_ODDS = 0.06;
export const LUCKY_ODDS = 0.19;

/** The odds as whole percents, for the one small odds line on the box. */
export function dayPrizeOddsPct(): Record<DayPrizeTier, number> {
  const jackpot = Math.round(JACKPOT_ODDS * 100);
  const lucky = Math.round(LUCKY_ODDS * 100);
  return { common: 100 - jackpot - lucky, lucky, jackpot };
}

/** Education side: the same every day, no roll. */
export const EDU_FIXED_PRIZE_COINS: Record<DayPrizeKind, number> = { clear: 25, perfect: 50 };

export function eduDayPrize(kind: DayPrizeKind): DayPrize {
  return { kind, tier: 'common', coins: EDU_FIXED_PRIZE_COINS[kind], xp: DAY_PRIZE_TABLE[kind].xp, fixed: true };
}

/** Highest payout of a kind, for "up to N coins" copy. */
export function maxPrizeCoins(kind: DayPrizeKind): number {
  return DAY_PRIZE_TABLE[kind].jackpot;
}

/** FNV-1a 32-bit: small, stable across runtimes, good enough to spread dates. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Two independent uniforms in [0, 1) from one seed. */
function uniforms(seed: string): [number, number] {
  return [hash32(`${seed}#tier`) / 0x100000000, hash32(`${seed}#amount`) / 0x100000000];
}

export function rollDayPrize(playerId: string, date: string, kind: DayPrizeKind): DayPrize {
  const table = DAY_PRIZE_TABLE[kind];
  const [tierRoll, amountRoll] = uniforms(`${playerId}|${date}|${kind}`);
  if (tierRoll < JACKPOT_ODDS) return { kind, tier: 'jackpot', coins: table.jackpot, xp: table.xp, fixed: false };
  if (tierRoll < JACKPOT_ODDS + LUCKY_ODDS) return { kind, tier: 'lucky', coins: table.lucky, xp: table.xp, fixed: false };
  const coins = table.common[Math.floor(amountRoll * table.common.length)] ?? table.common[0];
  return { kind, tier: 'common', coins, xp: table.xp, fixed: false };
}

/** Shape the claim routes answer with. `claimed` is false when the box was already opened. */
export interface DayPrizeClaimResponse extends Omit<DayPrize, 'fixed'> {
  claimed: boolean;
  /** The item this box held, an avatar part or a skin / theme (random boxes only; missing if that side was down). */
  part?: ChestItemDrop;
  /** Missing on boxes cached before the education-side split: read as false. */
  fixed?: boolean;
  /** Present only on the claim that pushed the player up a level. */
  levelUp?: { oldLevel: number; newLevel: number };
}

export function isDayPrizeResponse(body: unknown): body is DayPrizeClaimResponse {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    (b.kind === 'clear' || b.kind === 'perfect') &&
    (b.tier === 'common' || b.tier === 'lucky' || b.tier === 'jackpot') &&
    typeof b.coins === 'number' &&
    typeof b.xp === 'number' &&
    typeof b.claimed === 'boolean' &&
    (b.fixed === undefined || typeof b.fixed === 'boolean')
  );
}
