'use client';

import { useMemo } from 'react';
import { useHoliday } from '@/hooks/useHoliday';
import { holidayDailyPlan, type HolidayDailyPlan } from '@/lib/holidays/dailyBoard';
import type { LetterGrid } from '@/types';

export function useHolidayDailyPlan(grid: LetterGrid | null | undefined, puzzleDate: string | null | undefined, language: string): HolidayDailyPlan | null {
  const { holiday } = useHoliday();
  return useMemo(
    () => (holiday && grid?.length && puzzleDate ? holidayDailyPlan({ holiday, puzzleDate, language, grid }) : null),
    [holiday, grid, puzzleDate, language],
  );
}
