'use client';

import * as React from 'react';
import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { buildStreakCycle, CYCLE_LENGTH, type StreakCycleDay } from '@/utils/dailyChallenge/streakCycle';
import type { StreakHeat } from '@/lib/streakHeat';
import { cn } from '@/lib/utils';

interface StreakWeekRowProps {
  /** Server chest-cycle anchor; empty for guests (cycle is then derived locally). */
  cycleStart: string;
  completedDates: string[];
  /** Today, UTC `YYYY-MM-DD`. */
  today: string;
  currentStreak: number;
  heat: StreakHeat;
  /** Chest is filled and waiting to be claimed. */
  isClaimable: boolean;
  className?: string;
}

/**
 * Short weekday for a UTC date in the player's locale.
 *
 * Formatted in UTC on purpose: the slot's identity is its UTC date (the daily
 * rolls over at UTC midnight), so formatting in local time would label the
 * slot with the wrong weekday for anyone west of Greenwich for part of the day.
 */
function weekdayLabel(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${iso}T00:00:00Z`));
  } catch {
    // An unsupported locale tag must not take the row down with it.
    return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${iso}T00:00:00Z`));
  }
}

/** Length of the done-run starting at slot 0 — what the lit pill spans. */
function litRunLength(days: StreakCycleDay[]): number {
  let run = 0;
  for (const day of days) {
    if (!day.done) break;
    run += 1;
  }
  return run;
}

/**
 * The seven-slot streak row: completed days joined by one continuous lit pill,
 * the remaining days as dim dots, and the weekly chest in the final slot.
 *
 * Shaped after the reference: real weekday labels over a rolling cycle, so a
 * Thursday starter reads Thu…Wed and still reaches the chest on their 7th day.
 */
export default function StreakWeekRow({
  cycleStart,
  completedDates,
  today,
  currentStreak,
  heat,
  isClaimable,
  className,
}: StreakWeekRowProps) {
  const { language, dir } = useLanguage();

  const days = React.useMemo(
    () => buildStreakCycle({ cycleStart, completedDates, today, currentStreak }),
    [cycleStart, completedDates, today, currentStreak],
  );

  const litSpan = litRunLength(days);

  return (
    <div
      data-testid="streak-week-row"
      data-dir={dir}
      dir={dir}
      className={cn('relative grid grid-cols-7 gap-1.5 w-full', className)}
    >
      {/*
        One continuous pill behind the completed run rather than a lit ring per
        day — a single unbroken shape is what makes the streak read as one thing
        you would hate to break. Positioned with logical inset-inline-start so
        it starts from the correct edge in RTL without a second code path.
      */}
      {litSpan > 0 && (
        <m.div
          data-testid="streak-lit-pill"
          data-span={String(litSpan)}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 rounded-full border-2 border-neo-black shadow-hard-sm"
          style={{
            insetInlineStart: 0,
            width: `calc(${(litSpan / CYCLE_LENGTH) * 100}% - 0.1875rem)`,
            background: heat.ring,
          }}
          initial={{ scaleX: 0.85, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      )}

      {days.map(day => (
        <div
          key={day.iso}
          data-testid={`streak-day-${day.index}`}
          data-done={String(day.done)}
          data-today={String(day.isToday)}
          className="relative z-10 flex flex-col items-center gap-1"
        >
          <span
            data-testid={`streak-day-label-${day.index}`}
            className={cn(
              'font-neo-display font-black text-[10px] uppercase tracking-wide',
              day.isFuture ? 'opacity-50' : 'opacity-90',
            )}
            style={{ color: heat.ink }}
          >
            {weekdayLabel(day.iso, language)}
          </span>

          {day.isChestSlot ? (
            <span data-testid="streak-chest-slot" className="flex items-center justify-center w-7 h-7">
              <Mascot
                variant={isClaimable ? 'streakChestOpen' : 'streakChestClosed'}
                size="xs"
                animated={isClaimable}
                className="!w-7 !h-7"
                alt=""
              />
            </span>
          ) : (
            <span
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full border-2 border-neo-black',
                day.isToday && !day.done && 'ring-2 ring-offset-1 ring-offset-transparent',
              )}
              style={{
                background: day.done ? heat.ring : heat.track,
                // Today, unplayed: outline it in the tier colour so the one slot
                // the player can still act on is the one that draws the eye.
                ...(day.isToday && !day.done ? { boxShadow: `0 0 0 2px ${heat.ring}` } : null),
              }}
            >
              {day.done && <Check className="w-4 h-4 text-neo-black" strokeWidth={4} />}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
