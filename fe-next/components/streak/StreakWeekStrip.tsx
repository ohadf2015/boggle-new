'use client';

import { Check, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WeekDay, WeekDayState } from '@/lib/daily/streakRewards';

const LOCALES: Record<string, string> = { he: 'he-IL', ja: 'ja-JP', sv: 'sv-SE', es: 'es-ES', ru: 'ru-RU' };

const CELL_ON_LIGHT: Record<WeekDayState, string> = {
  played: 'border-neo-black bg-neo-black text-neo-yellow',
  frozen: 'border-neo-black bg-neo-cyan text-neo-black',
  missed: 'border-neo-black/40 bg-transparent text-neo-black/40',
  today: 'border-dashed border-neo-black bg-neo-yellow text-neo-black',
  future: 'border-neo-black/25 bg-transparent text-neo-black/25',
};

const CELL: Record<WeekDayState, string> = {
  played: 'border-neo-black bg-neo-orange text-neo-black shadow-hard-sm',
  frozen: 'border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm',
  missed: 'border-neo-cream/40 bg-neo-navy text-neo-cream/40',
  today: 'border-dashed border-neo-lime bg-neo-navy text-neo-lime',
  future: 'border-neo-cream/40 bg-neo-navy/60 text-neo-cream/40',
};

function dayInitial(date: string, language: string): string {
  try {
    return new Date(date + 'T00:00:00Z').toLocaleDateString(LOCALES[language] ?? 'en-US', { weekday: 'narrow', timeZone: 'UTC' });
  } catch {
    return date.slice(8);
  }
}

interface StreakWeekStripProps {
  week: WeekDay[];
  size?: 'sm' | 'md';
  /** `light` for a strip printed on a bright card (the home's orange daily ticket). */
  tone?: 'dark' | 'light';
  className?: string;
}

/** Monday..Sunday: a flame-orange check for a played day, a snowflake for a frozen one, today outlined. */
export function StreakWeekStrip({ week, size = 'md', tone = 'dark', className }: StreakWeekStripProps) {
  const cells = tone === 'light' ? CELL_ON_LIGHT : CELL;
  const todayText = tone === 'light' ? 'text-neo-black' : 'text-neo-lime';
  const dayText = tone === 'light' ? 'text-neo-black/60' : 'text-neo-cream/60';
  const { t, language } = useLanguage();
  const box = size === 'sm' ? 'h-6 w-6 md:h-8 md:w-8' : 'h-9 w-9 md:h-10 md:w-10';
  const icon = size === 'sm' ? 'h-3.5 w-3.5 md:h-4 md:w-4' : 'h-5 w-5';

  return (
    <ol data-testid="streak-week" aria-label={t('dailyStreak.flame.week')} className={cn('flex items-end gap-1 md:gap-1.5', className)}>
      {week.map((day) => (
        <li
          key={day.date}
          data-testid="streak-week-day"
          data-state={day.state}
          aria-current={day.isToday ? 'date' : undefined}
          aria-label={`${dayInitial(day.date, language)}: ${t(`dailyStreak.flame.day.${day.state}`)}`}
          className="flex flex-col items-center gap-0.5"
        >
          <span
            aria-hidden="true"
            className={cn(
              'font-neo-display text-[10px] font-bold uppercase leading-none md:text-xs',
              day.isToday ? todayText : dayText,
            )}
          >
            {dayInitial(day.date, language)}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'flex items-center justify-center rounded-[6px] border-2',
              box,
              cells[day.state],
              day.isToday && day.state === 'played' && (tone === 'light' ? 'ring-2 ring-neo-black ring-offset-1 ring-offset-neo-orange' : 'ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy'),
            )}
          >
            {day.state === 'played' && <Check className={icon} strokeWidth={3.5} />}
            {day.state === 'frozen' && <Snowflake className={icon} strokeWidth={3} />}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default StreakWeekStrip;
