'use client';

/**
 * PowerHourBadge - Small badge for StreakBar during active Power Hour
 *
 * Shows lightning bolt + countdown timer. Glows neo-cyan when active.
 * Briefly shows "Boost Complete!" on expiry then disappears.
 */

import React, { memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePowerHour } from '@/hooks/usePowerHour';
import useReducedMotion from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export const PowerHourBadge: React.FC = memo(() => {
  const { t } = useLanguage();
  const { active, remainingMinutes, remainingSeconds, expired } = usePowerHour();
  const reducedMotion = useReducedMotion();

  if (!active && !expired) return null;

  const timeStr = `${remainingMinutes}:${String(remainingSeconds).padStart(2, '0')}`;

  return (
    <AnimatePresence>
      <m.div
        data-testid="power-hour-badge"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full',
          'font-black text-xs tabular-nums whitespace-nowrap',
          active && 'text-neo-cyan bg-neo-cyan/10 shadow-[0_0_8px_rgba(0,255,255,0.3)]',
          expired && 'text-neo-yellow bg-neo-yellow/10',
        )}
        role="status"
        aria-label={active ? t('powerHour.badge', { time: timeStr }) : t('powerHour.expired')}
      >
        {active && (
          <span className="text-neo-cyan">
            {t('powerHour.badge', { time: timeStr })}
          </span>
        )}
        {expired && (
          <span className="text-neo-yellow">
            {t('powerHour.expired')}
          </span>
        )}
      </m.div>
    </AnimatePresence>
  );
});

PowerHourBadge.displayName = 'PowerHourBadge';
export default PowerHourBadge;
