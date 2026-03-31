'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getRewardForDay, getRewardCoins, getNextMilestone, DAILY_REWARD_SCHEDULE } from '@/lib/dailyRewards';

interface DailyRewardPreviewProps {
  currentStreakDay: number;
  t: (key: string) => string;
}

function interpolateTranslation(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, String(value));
  }
  return result;
}

/**
 * DailyRewardPreview - Shows upcoming rewards before playing daily challenge.
 * Displays today's reward, tomorrow's preview, and proximity to next badge milestone.
 */
export function DailyRewardPreview({ currentStreakDay, t }: DailyRewardPreviewProps) {
  const todayReward = getRewardForDay(currentStreakDay);
  const tomorrowCoins = getRewardCoins(currentStreakDay + 1);

  // Find next badge milestone
  const nextMilestone = getNextMilestoneWithBadge(currentStreakDay);

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
      className="bg-neo-navy border-3 border-neo-black rounded-neo p-4 shadow-hard-sm space-y-3"
    >
      {/* Today's reward */}
      <div className="text-center">
        <p className="text-neo-cream font-bold text-sm">
          {interpolateTranslation(t('daily.todayReward'), { coins: todayReward.coins })}
        </p>
      </div>

      {/* Tomorrow preview */}
      <div className="text-center">
        <p className="text-neo-cream/70 text-xs">
          {interpolateTranslation(t('daily.tomorrowReward'), { coins: tomorrowCoins })}
        </p>
      </div>

      {/* Milestone proximity */}
      {nextMilestone && (
        <div className="text-center">
          <p className="text-neo-yellow text-xs font-bold">
            {interpolateTranslation(t('daily.nearMilestone'), {
              days: nextMilestone.daysAway,
              badge: nextMilestone.label,
            })}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div data-testid="reward-timeline" className="flex items-center justify-between gap-1 pt-2">
        {timelineDays.map((entry) => (
          <div
            key={entry.day}
            className={`flex flex-col items-center gap-1 flex-1 ${
              entry.isToday ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                entry.isToday
                  ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-sm'
                  : 'bg-neo-navy-light text-neo-cream/60 border-neo-black/30'
              }`}
              animate={entry.isToday ? { scale: [1, 1.1, 1] } : undefined}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {entry.coins}
            </motion.div>
            <span className="text-[9px] text-neo-cream/40">
              {entry.isToday ? '▼' : `D${entry.day}`}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Find the next milestone that has a badge (not just any milestone).
 */
function getNextMilestoneWithBadge(currentDay: number) {
  for (const milestone of DAILY_REWARD_SCHEDULE) {
    if (milestone.day > currentDay && 'badge' in milestone) {
      return {
        day: milestone.day,
        coins: milestone.coins,
        badge: (milestone as { badge: string }).badge,
        label: milestone.label,
        daysAway: milestone.day - currentDay,
      };
    }
  }
  return null;
}
