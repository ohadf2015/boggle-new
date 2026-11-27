'use client';

import { useHoliday, type HolidayState } from '@/hooks/useHoliday';

export const arcadeHoliday = (s: Pick<HolidayState, 'holiday'>) => s.holiday;

export function useArcadeGate() {
  const s = useHoliday();
  return { holiday: arcadeHoliday(s), resolved: s.resolved, region: s.region };
}
