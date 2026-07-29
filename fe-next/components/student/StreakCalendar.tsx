/**
 * StreakCalendar Component
 *
 * 7-day visual streak calendar showing which days the student was active.
 * Animated flame icons, staggered day entrances, pulsing streak counter.
 */

'use client';

import { useMemo } from 'react';
import { m } from 'framer-motion';
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

// --- Animation variants ---

const containerEntrance = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const dayCell = {
  hidden: { opacity: 0, scale: 0.7, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 18 },
  },
};

const streakBadgePop = {
  hidden: { scale: 0, rotate: -15 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 500, damping: 14, delay: 0.3 },
  },
};

const flameFlicker = {
  animate: {
    scale: [1, 1.15, 0.95, 1.1, 1],
    rotate: [0, -6, 4, -3, 0],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

export default function StreakCalendar({ currentStreak, lastWinDate }: StreakCalendarProps) {
  const { t } = useLanguage();

  // Generate last 7 days and determine active status
  const days = useMemo(() => {
    const today = new Date();
    const result: DayInfo[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);

      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      const isToday = i === 0;

      let isActive = false;
      if (lastWinDate && currentStreak > 0) {
        const lastWin = new Date(lastWinDate);
        const lastWinDay = new Date(lastWin.getFullYear(), lastWin.getMonth(), lastWin.getDate());
        const checkDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const daysSinceLastWin = Math.floor((lastWinDay.getTime() - checkDay.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceLastWin >= 0 && daysSinceLastWin < currentStreak) {
          isActive = true;
        }
      }

      result.push({ date, dayName, isActive, isToday, index: 6 - i });
    }

    return result;
  }, [currentStreak, lastWinDate]);

  return (
    <m.div
      className="p-5 rounded-neo border-3 border-black bg-neo-navy shadow-hard"
      variants={containerEntrance}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      {/* Header: Streak count */}
      <div className="flex items-center gap-3 mb-5">
        <m.div
          className="w-10 h-10 rounded-neo bg-neo-lime border-3 border-black shadow-hard-sm flex items-center justify-center shrink-0"
          whileHover={{ scale: 1.15, rotate: -8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Flame className="w-5 h-5 text-black" />
        </m.div>
        <p className="text-base font-neo-display font-black text-neo-white uppercase tracking-tight">
          {t('student.dashboard.streakCalendar')}
        </p>
        <m.div
          variants={streakBadgePop}
          className="ms-auto flex items-center gap-2 bg-neo-lime border-3 border-black rounded-neo px-3 py-1 shadow-hard-sm"
        >
          <span className="text-xl font-neo-display font-black text-black tabular-nums">
            {currentStreak}
          </span>
          <m.div {...(currentStreak >= 3 ? flameFlicker : {})}>
            <Flame className="w-5 h-5 text-neo-pink" />
          </m.div>
        </m.div>
      </div>

      {/* 7-day calendar */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <m.div
            key={day.index}
            variants={dayCell}
            data-testid={`day-${day.index}`}
            data-active={day.isActive}
            whileHover={{ scale: 1.08, y: -2, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center gap-1.5 p-2 rounded-neo border-3 cursor-default',
              day.isActive
                ? 'bg-neo-lime border-black shadow-hard-sm text-black'
                : 'bg-neo-navy border-black/40 text-neo-white',
              day.isToday && !day.isActive && 'border-neo-cyan bg-neo-cyan/10 text-neo-white',
              day.isToday && 'ring-2 ring-neo-cyan ring-offset-1 ring-offset-neo-navy'
            )}
          >
            <span className="text-xs font-neo-body font-black uppercase">
              {day.dayName}
            </span>
            {day.isActive ? (
              <m.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  type: 'tween',
                  duration: 2,
                  repeat: Infinity,
                  delay: day.index * 0.15,
                  ease: 'easeInOut',
                }}
              >
                <Flame className="w-4 h-4 text-neo-pink" />
              </m.div>
            ) : (
              <div className="w-3 h-3 rounded-full bg-neo-white/20 border border-black/20" />
            )}
          </m.div>
        ))}
      </div>
    </m.div>
  );
}
