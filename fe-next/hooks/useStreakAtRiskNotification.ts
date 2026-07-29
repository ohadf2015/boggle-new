'use client';

/**
 * useStreakAtRiskNotification
 *
 * In-app notification for when a player has an active streak but hasn't
 * played today yet. Shows a nudge to keep the streak alive.
 *
 * Also emits a PostHog event for streak-at-risk so we can later trigger
 * Telegram/push notifications server-side.
 */

import { useEffect, useState } from 'react';
import { isStreakAtRisk, getStreakMilestoneMessage } from '@/utils/dailyChallenge/streaks';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';

export interface StreakAtRiskState {
  atRisk: boolean;
  currentStreak: number;
  hoursRemaining: number;
  message: string | null;
}

/**
 * Returns the current streak-at-risk state. Re-checks every 60s while the
 * component is mounted so the countdown feels live.
 *
 * Call from any page where you want to surface an early-day streak nudge
 * (e.g. the daily challenge landing page or the homepage).
 */
export function useStreakAtRiskNotification(): StreakAtRiskState {
  const { t } = useLanguage();
  const [state, setState] = useState<StreakAtRiskState>({
    atRisk: false,
    currentStreak: 0,
    hoursRemaining: 0,
    message: null,
  });

  useEffect(() => {
    function check() {
      const risk = isStreakAtRisk();
      const milestoneMsg = risk.currentStreak >= 2
        ? getStreakMilestoneMessage(risk.currentStreak)
        : null;

      let message: string | null = null;
      if (risk.atRisk && risk.currentStreak > 0) {
        // Use existing translation key for streak urgency
        const raw = t('daily.streakUrgency')
          .replace('{{streak}}', String(risk.currentStreak))
          .replace('{{hours}}', String(risk.hoursRemaining));
        message = milestoneMsg
          ? `${milestoneMsg.emoji} ${milestoneMsg.title} — ${raw}`
          : `🔥 ${risk.currentStreak}-day streak! ${raw}`;
      }

      setState({
        atRisk: risk.atRisk,
        currentStreak: risk.currentStreak,
        hoursRemaining: risk.hoursRemaining,
        message,
      });

      // Emit PostHog event for server-side notification triggers
      if (risk.atRisk && risk.currentStreak >= 3) {
        try {
          posthog.capture('growth:streak_at_risk', {
            currentStreak: risk.currentStreak,
            hoursRemaining: risk.hoursRemaining,
          });
        } catch {
          // swallow — analytics never blocks gameplay
        }
      }
    }

    check();
    const interval = setInterval(check, 60_000); // re-check every minute
    return () => clearInterval(interval);
  }, [t]);

  return state;
}

/**
 * Format the streak at-risk message for display in a toast/banner.
 */
export function formatStreakUrgency(state: StreakAtRiskState): string | null {
  if (!state.atRisk) return null;
  return state.message;
}