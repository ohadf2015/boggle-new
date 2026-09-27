'use client';

/**
 * StreakBar - Persistent engagement status bar
 *
 * Shows streak count, XP progress, level, and gold balance
 * on every screen. Pulses red when streak is at risk.
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import { Flame, Coins } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import useReducedMotion from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { PowerHourBadge } from './PowerHourBadge';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const STREAK_MILESTONES = [7, 14, 30, 50, 100];

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export const StreakBar: React.FC = memo(() => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const status = useEngagementStatus();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { playStreakMilestoneSound, playStreakLegendarySound } = useSoundEffects();
  const prevStreakRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevStreakRef.current;
    const curr = status.streak;
    if (prev !== null && curr > prev) {
      const hitMilestone = STREAK_MILESTONES.some(m => curr >= m && prev < m);
      if (hitMilestone) {
        // Legendary sound for 7+ day streaks, regular for smaller milestones
        if (curr >= 7) playStreakLegendarySound();
        else playStreakMilestoneSound();
      }
    }
    prevStreakRef.current = curr;
  }, [status.streak, playStreakMilestoneSound, playStreakLegendarySound]);

  // Always return null on server & first client render to avoid hydration mismatch
  if (!mounted) return null;

  // Don't render while loading or for unauthenticated users with no data
  if (status.loading) return null;
  if (!user && status.streak === 0 && status.gold === 0) return null;

  // Don't show bar if user has never played (all zeros)
  const hasActivity = status.streak > 0 || status.xp > 0 || status.gold > 0 || status.gamesToday > 0;
  if (!hasActivity) return null;

  const xpPercent = Math.round(status.xpProgress * 100);

  return (
    <AnimatePresence>
      <m.div
        data-testid="streak-bar"
        initial={reducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4',
          'bg-neo-navy-dark/80',
          'border-b border-neo-white/10',
          'text-xs sm:text-sm font-bold',
          'select-none',
          status.streakAtRisk && 'streak-at-risk border-b-neo-pink/50 animate-pulse-subtle',
        )}
        role="status"
        aria-label={t('streakBar.streak', { count: status.streak })}
      >
        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <span
            data-testid="streak-flame"
            className={cn(
              'text-neo-orange',
              status.streakAtRisk && 'text-neo-pink',
            )}
          >
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </span>
          <span className={cn(
            'font-black tabular-nums',
            status.streakAtRisk ? 'text-neo-pink' : 'text-neo-orange',
          )}>
            {status.streak}
          </span>
        </div>

        {/* XP Progress — center */}
        <div className="flex items-center gap-2 flex-1 max-w-[200px] sm:max-w-[280px]">
          <span className="text-neo-cyan/80 whitespace-nowrap">
            {t('streakBar.level', { level: status.level })}
          </span>
          <div
            className="flex-1 h-1.5 sm:h-2 bg-neo-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={xpPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP ${xpPercent}%`}
          >
            <div
              className="h-full bg-neo-cyan rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Power Hour Badge */}
        <PowerHourBadge />

        {/* Gold */}
        <div className="flex items-center gap-1" data-testid="streak-gold">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-neo-yellow" />
          <span className="text-neo-yellow font-black tabular-nums">
            {formatNumber(status.gold)}
          </span>
        </div>
      </m.div>
    </AnimatePresence>
  );
});

StreakBar.displayName = 'StreakBar';
export default StreakBar;
