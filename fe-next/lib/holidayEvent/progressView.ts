import type { HolidayKey, HolidayWindow } from '@/lib/holidays/calendar';
import { holidayReward, type HolidayDayReward } from './rewards';

export type HolidayDaySource = 'game' | 'daily' | 'friend';

export interface HolidayDayView {
  index: number;
  date: string;
  lit: boolean;
  reward: HolidayDayReward;
  source?: HolidayDaySource;
}

export interface HolidayProgressView {
  holiday: HolidayKey;
  window: { start: string; end: string };
  days: HolidayDayView[];
}

export function buildProgressView(
  win: HolidayWindow,
  lit: ReadonlySet<number>,
  sources: ReadonlyMap<number, HolidayDaySource> = new Map(),
): HolidayProgressView {
  return {
    holiday: win.key,
    window: { start: win.start, end: win.end },
    days: win.trackDays.map((date, index) => ({
      index,
      date,
      lit: lit.has(index),
      reward: holidayReward(win.key, index) ?? {},
      ...(lit.has(index) ? { source: sources.get(index) ?? 'game' } : {}),
    })),
  };
}
