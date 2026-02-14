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
    <div className="p-4 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy/40 shadow-hard-lg">
      {/* Header: Streak count */}
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-neo-pink" />
        <p className="text-sm font-neo-body text-neo-white/70">
          {t('student.dashboard.streakCalendar')}
        </p>
        <span className="ms-auto text-lg font-neo-display font-bold text-neo-pink tabular-nums">
          {currentStreak} 🔥
        </span>
      </div>

      {/* 7-day calendar */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.index}
            data-testid={`day-${day.index}`}
            data-active={day.isActive}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-neo border-neo',
              day.isActive
                ? 'bg-neo-pink/30 border-neo-pink text-neo-pink'
                : 'bg-neo-black/20 border-neo-black/50 text-neo-white/30',
              day.isToday && 'ring-2 ring-neo-cyan'
            )}
          >
            <span className="text-xs font-neo-body font-medium">
              {day.dayName}
            </span>
            {day.isActive && (
              <Flame className="w-4 h-4 text-neo-pink" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
