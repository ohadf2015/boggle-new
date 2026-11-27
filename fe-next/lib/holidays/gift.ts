import type { HolidayKey, HolidayWindow } from './calendar';

export const GIFT_TIER_COUNT: Record<HolidayKey, number> = { hanukkah: 8, christmas: 9 };
export const GIFT_TRACK_LENGTH: Record<HolidayKey, number> = { hanukkah: 8, christmas: 12 };
export const GIFT_FULL_RUN_PART: Record<HolidayKey, string> = {
  hanukkah: 'accessory:goldGeltMedal',
  christmas: 'accessory:goldBell',
};
export const GIFT_HINT_COUNT = 5;

const COINS_PER_DAY = 40;
const FULL_RUN_BONUS = 200;
const CONSOLATION = 20;

export interface GiftReward {
  coins: number;
  partKey?: string;
}

export function giftTier(holiday: HolidayKey, lit: number): number {
  const tiers = GIFT_TIER_COUNT[holiday];
  const days = GIFT_TRACK_LENGTH[holiday];
  const n = Math.max(0, Math.min(lit, days));
  return Math.max(1, Math.ceil((n * tiers) / days));
}

export function giftOpenable(win: HolidayWindow, localDate: string): boolean {
  return localDate >= win.finale && localDate <= win.end;
}

export function giftReward(holiday: HolidayKey, lit: number): GiftReward {
  const days = GIFT_TRACK_LENGTH[holiday];
  const n = Math.max(0, Math.min(lit, days));
  if (n === 0) return { coins: CONSOLATION };
  if (n < days) return { coins: n * COINS_PER_DAY };
  return { coins: n * COINS_PER_DAY + FULL_RUN_BONUS, partKey: GIFT_FULL_RUN_PART[holiday] };
}

export function giftHintIndex(taps: number): number {
  return ((taps % GIFT_HINT_COUNT) + GIFT_HINT_COUNT) % GIFT_HINT_COUNT;
}
