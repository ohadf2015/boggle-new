'use client';

import { m } from 'framer-motion';
import { getRewardForDay, getNextMilestone } from '@/lib/dailyRewards';

interface DailyRewardPreviewProps {
  /**
   * 1-indexed day the user is about to claim. Pass `streak + 1` from the call site,
   * since `streak` is days already completed (0 for fresh users).
   */
  currentStreakDay: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function DailyRewardPreview({ currentStreakDay, t }: DailyRewardPreviewProps) {
  const todayReward = getRewardForDay(currentStreakDay);
  const justEarnedBadge =
    todayReward.isMilestone && todayReward.badge && todayReward.label
      ? { label: todayReward.label }
      : null;
  const nextMilestone = justEarnedBadge ? null : getNextMilestone(currentStreakDay, { badgeOnly: true });

  const timelineDays = Array.from({ length: 5 }, (_, i) => {
    const day = currentStreakDay + i;
    const reward = getRewardForDay(day);
    return {
      day,
      coins: reward.coins,
      isToday: i === 0,
      isBadge: reward.isMilestone && !!reward.badge,
    };
  });

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="w-full bg-neo-navy/80 border-3 border-neo-black rounded-xl p-4 shadow-hard-sm"
    >
      {justEarnedBadge && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-neo-yellow/15 border border-neo-yellow/40 text-center">
          <p className="text-neo-yellow text-xs font-bold">
            {t('daily.milestoneEarned', {
              badge: t(`daily.badges.${justEarnedBadge.label}`),
            })}
          </p>
        </div>
      )}

      <div data-testid="reward-timeline" className="relative flex items-stretch justify-between gap-1">
        {/* Connecting rail — sits behind dots, brighter than before so it actually reads */}
        <div
          className="absolute top-[18px] left-[12%] right-[12%] h-0.5 bg-neo-cream/20 rounded-full"
          aria-hidden="true"
        />

        {timelineDays.map((entry) => {
          const dotClass = entry.isToday
            ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-sm'
            : entry.isBadge
              ? 'bg-neo-yellow text-neo-black border-neo-black'
              : 'bg-neo-navy-light text-neo-white border-neo-black/60';
          const labelClass = entry.isToday
            ? 'text-neo-cyan'
            : entry.isBadge
              ? 'text-neo-yellow'
              : 'text-neo-white';

          return (
            <div
              key={entry.day}
              className="relative z-[1] flex flex-col items-center gap-1.5 flex-1"
            >
              <m.div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${dotClass}`}
                animate={entry.isToday ? { scale: [1, 1.08, 1] } : undefined}
                transition={entry.isToday ? { repeat: Infinity, duration: 2.5 } : undefined}
              >
                {entry.coins}
              </m.div>
              <span className={`text-[10px] font-bold whitespace-nowrap ${labelClass}`}>
                {entry.isToday
                  ? t('daily.today')
                  : t('daily.rewardDay', { day: entry.day })}
              </span>
            </div>
          );
        })}
      </div>

      {nextMilestone && (
        <p className="mt-3 text-center text-neo-purple text-[11px] font-bold">
          {t(nextMilestone.daysAway === 1 ? 'daily.nearMilestoneOne' : 'daily.nearMilestone', {
            days: nextMilestone.daysAway,
            badge: t(`daily.badges.${nextMilestone.label}`),
          })}
        </p>
      )}
    </m.div>
  );
}
