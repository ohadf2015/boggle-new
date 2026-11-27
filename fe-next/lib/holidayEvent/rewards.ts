import type { HolidayKey, HolidayWindow } from '@/lib/holidays/calendar';
import { GIFT_FULL_RUN_PART } from '@/lib/holidays/gift';
import { SEEKER_PART } from '@/lib/holidays/hunt';

export interface HolidayDayReward {
  coins?: number;
  /** premium_avatar_parts key, e.g. "accessory:santaHat". */
  partKey?: string;
  /** Title id; shown with t(`holiday.title.${title}`). */
  title?: string;
}

export const HOLIDAY_COINS = 50;

const coins: HolidayDayReward = { coins: HOLIDAY_COINS };
const part = (id: string, title?: string): HolidayDayReward => ({ partKey: `accessory:${id}`, ...(title ? { title } : {}) });

const REWARDS: Record<HolidayKey, readonly HolidayDayReward[]> = {
  hanukkah: [
    coins, part('beanieBlue'), coins, part('scarfBlue'), coins, part('dreidelPin'), coins, part('menorahCrown', 'keeperOfTheLight'),
  ],
  christmas: [
    coins, part('santaHat'), coins, part('elfHat'), coins, part('antlers'),
    coins, part('earmuffs'), coins, part('scarfXmas'), coins, part('candyGlasses', 'snowChampion'),
  ],
};

export function holidayRewards(key: HolidayKey): readonly HolidayDayReward[] {
  return REWARDS[key];
}

export function holidayReward(key: HolidayKey, index: number): HolidayDayReward | null {
  return REWARDS[key][index] ?? null;
}

export const HOLIDAY_PART_KEYS: readonly string[] = Object.values(REWARDS)
  .flat()
  .flatMap((r) => (r.partKey ? [r.partKey] : []));

export const HOLIDAY_ALL_PART_KEYS: readonly string[] = [
  ...HOLIDAY_PART_KEYS,
  ...Object.values(SEEKER_PART),
  ...Object.values(GIFT_FULL_RUN_PART),
];

export function eventKeyFor(win: HolidayWindow): string {
  return `${win.key}-${win.start.slice(0, 4)}`;
}
