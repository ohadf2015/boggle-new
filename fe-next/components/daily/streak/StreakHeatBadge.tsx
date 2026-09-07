'use client';

import * as React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { getStreakHeat } from '@/lib/streakHeat';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { cn } from '@/lib/utils';
import StreakHeatCard from './StreakHeatCard';

interface StreakHeatBadgeProps {
  /**
   * Locally-known streak (localStorage). Used as the floor — the server row
   * wins when it has one, so a stale local value cannot understate a streak.
   */
  streak: number;
  /** Injectable for tests; defaults to today's UTC daily date. */
  today?: string;
  className?: string;
}

/**
 * The streak, made visible.
 *
 * Replaces the inline fire-emoji-plus-number that the daily hub and the home
 * banner used to render. Shows the tier mascot so the streak's size is legible
 * at a glance, and opens the full streak card on tap — which is how a player
 * gets to the share action without the app interrupting them to offer it.
 */
export default function StreakHeatBadge({ streak, today, className }: StreakHeatBadgeProps) {
  const { t, language } = useLanguage();
  const { currentStreak: serverStreak, completedDates, cycleStart, isClaimable } = useWeeklyChest();
  const [open, setOpen] = React.useState(false);

  const todayIso = today ?? getDailyChallengeDate();

  // Class 1 (dual source of truth): the server row and localStorage both hold a
  // streak, and the server one resolves LATER. Taking the max means the late
  // resolution can only ever correct the number upward — it never flashes a
  // smaller streak at a player who has one, and guests (server = 0) keep theirs.
  const effectiveStreak = Math.max(streak, serverStreak);

  if (effectiveStreak <= 0) return null;

  const heat = getStreakHeat(effectiveStreak);

  return (
    <>
      <button
        type="button"
        data-testid="streak-heat-badge"
        data-claimable={String(isClaimable)}
        onClick={() => setOpen(true)}
        aria-label={t('daily.streakHeat.open', 'View your streak')}
        className={cn(
          'flex items-center gap-1.5 ps-1 pe-3 py-1 rounded-full',
          'border-2 border-neo-black shadow-hard-sm active:shadow-hard-pressed active:translate-y-px',
          className,
        )}
        style={{ background: heat.ring }}
      >
        <Mascot variant={heat.mascot} size="xs" animated className="!w-7 !h-7" alt="" />
        <span className="font-neo-display font-black text-base text-neo-black tabular-nums">
          {safeToLocaleString(effectiveStreak, language)}
        </span>
        {/* A filled chest waiting to be opened is worth a nudge on the badge. */}
        {isClaimable && (
          <m.span
            aria-hidden="true"
            className="w-2 h-2 rounded-full bg-neo-black"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/85 backdrop-blur-md px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
          >
            <StreakHeatCard
              streak={effectiveStreak}
              cycleStart={cycleStart}
              completedDates={completedDates}
              today={todayIso}
              isClaimable={isClaimable}
              onClose={() => setOpen(false)}
            />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
