/**
 * StreakCalendar Component
 *
 * 7-day visual streak calendar showing which days the student was active.
 * Active days are highlighted based on current streak and last win date.
 */

'use client';

import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface StreakCalendarProps {
  currentStreak: number;
  lastWinDate: string | null;
}

interface DayInfo {
  date: Date;
  dayName: string;
  isActive: boolean;
  isToday: boolean;
  index: number;
}

export default function StreakCalendar({ currentStreak, lastWinDate }: StreakCalendarProps) {
  const { t } = useLanguage();

  // Generate last 7 days and determine active status
  const days = useMemo(() => {
    const today = new Date();
    const result: DayInfo[] = [];

    // Generate array of last 7 days (6 days ago to today)
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);

      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      const isToday = i === 0;

      // Determine if this day is active based on streak
      let isActive = false;
      if (lastWinDate && currentStreak > 0) {
        const lastWin = new Date(lastWinDate);
        // Normalize dates to midnight for comparison
        const lastWinDay = new Date(lastWin.getFullYear(), lastWin.getMonth(), lastWin.getDate());
        const checkDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Calculate days between last win and the day we're checking
        const daysSinceLastWin = Math.floor((lastWinDay.getTime() - checkDay.getTime()) / (1000 * 60 * 60 * 24));

        // Day is active if it falls within the streak window
        // Streak covers N consecutive days ending at lastWinDate
        if (daysSinceLastWin >= 0 && daysSinceLastWin < currentStreak) {
          isActive = true;
        }
      }

      result.push({
        date,
        dayName,
        isActive,
        isToday,
        index: 6 - i, // Index from 0 (oldest) to 6 (today)
      });
    }

    return result;
  }, [currentStreak, lastWinDate]);

  return (
    <div className="p-5 rounded-neo border-3 border-black bg-white shadow-hard-sm">
      {/* Header: Streak count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-neo bg-neo-pink border-2 border-black shadow-hard-sm flex items-center justify-center flex-shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <p className="text-base font-neo-display font-bold text-black">
          {t('student.dashboard.streakCalendar')}
        </p>
        <div className="ms-auto flex items-center gap-2 bg-neo-pink border-2 border-black rounded-neo px-3 py-1 shadow-hard-sm">
          <span className="text-xl font-neo-display font-black text-white tabular-nums">
            {currentStreak}
          </span>
          <span className="text-lg">🔥</span>
        </div>
      </div>

      {/* 7-day calendar */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.index}
            data-testid={`day-${day.index}`}
            data-active={day.isActive}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-neo border-2',
              day.isActive
                ? 'bg-neo-pink border-black shadow-hard-sm text-white'
                : 'bg-gray-100 border-black/30 text-black/40',
              day.isToday && !day.isActive && 'border-black bg-neo-yellow/30 text-black',
              day.isToday && 'ring-2 ring-neo-cyan'
            )}
          >
            <span className="text-xs font-neo-body font-bold">
              {day.dayName}
            </span>
            {day.isActive ? (
              <Flame className="w-4 h-4 text-white" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-black/20" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
