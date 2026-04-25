'use client';

import { motion } from 'framer-motion';
import { getRewardForDay, getRewardCoins, getNextMilestone } from '@/lib/dailyRewards';

interface DailyRewardPreviewProps {
  currentStreakDay: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * DailyRewardPreview - Shows upcoming rewards before playing daily challenge.
 * Displays today's reward, tomorrow's preview, and proximity to next badge milestone.
 */
export function DailyRewardPreview({ currentStreakDay, t }: DailyRewardPreviewProps) {
  const todayReward = getRewardForDay(currentStreakDay);
  const tomorrowCoins = getRewardCoins(currentStreakDay + 1);

  const justEarnedBadge =
    todayReward.isMilestone && todayReward.badge && todayReward.label
      ? { label: todayReward.label }
      : null;
  const nextMilestone = justEarnedBadge ? null : getNextMilestone(currentStreakDay, { badgeOnly: true });

  // Build timeline: show 5 days starting from today
  const timelineDays = [];
  for (let i = 0; i < 5; i++) {
    const day = currentStreakDay + i;
    timelineDays.push({
      day,
      coins: getRewardCoins(day),
      isToday: i === 0,
      isPast: false,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="w-full bg-slate-900/80 border-3 border-neo-black rounded-xl p-4 shadow-hard-sm space-y-3"
    >
      {/* Today's reward + tomorrow preview */}
      <div className="flex items-center justify-between">
        <p className="text-neo-cream font-bold text-sm">
          {t('daily.todayReward', { coins: todayReward.coins })}
        </p>
        <p className="text-neo-cream/50 text-xs">
          {t('daily.tomorrowReward', { coins: tomorrowCoins })}
        </p>
      </div>

      {/* Just-earned badge celebration (takes precedence over next-milestone teaser) */}
      {justEarnedBadge && (
        <div className="px-3 py-1.5 rounded-lg bg-neo-yellow/15 border border-neo-yellow/40 text-center">
          <p className="text-neo-yellow text-xs font-bold">
            {t('daily.milestoneEarned', {
              badge: t(`daily.badges.${justEarnedBadge.label}`),
            })}
          </p>
        </div>
      )}

      {/* Milestone proximity */}
      {nextMilestone && (
        <div className="px-3 py-1.5 rounded-lg bg-neo-purple/10 border border-neo-purple/30 text-center">
          <p className="text-neo-purple text-xs font-bold">
            {t(nextMilestone.daysAway === 1 ? 'daily.nearMilestoneOne' : 'daily.nearMilestone', {
              days: nextMilestone.daysAway,
              badge: t(`daily.badges.${nextMilestone.label}`),
            })}
          </p>
        </div>
      )}

      {/* Timeline — connected dots */}
      <div data-testid="reward-timeline" className="relative flex items-center justify-between gap-1 pt-2">
        {/* Connecting line behind dots */}
        <div className="absolute top-[calc(50%+4px)] inset-x-4 h-0.5 bg-neo-navy-light rounded-full" aria-hidden="true" />

        {timelineDays.map((entry) => (
          <div
            key={entry.day}
            className={`relative flex flex-col items-center gap-1 flex-1 ${
              entry.isToday ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <motion.div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${
                entry.isToday
                  ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-sm'
                  : 'bg-neo-navy-light text-neo-cream/60 border-neo-black/30'
              }`}
              animate={entry.isToday ? { scale: [1, 1.08, 1] } : undefined}
              transition={entry.isToday ? { repeat: Infinity, duration: 2.5 } : undefined}
            >
              {entry.coins}
            </motion.div>
            <span className={`text-[9px] font-bold ${entry.isToday ? 'text-neo-cyan' : 'text-neo-cream/30'}`}>
              {entry.isToday ? '▼' : t('daily.rewardDay', { day: entry.day })}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

