'use client';

import React from 'react';
import { m } from 'framer-motion';
import { NeoPanel } from '@/components/ui/panel';
import { getRewardCoins } from '@/lib/dailyRewards';

interface DailyRewardClaimProps {
  coinsEarned: number;
  currentStreakDay: number;
  badge?: string;
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
 * DailyRewardClaim - Shows reward after completing daily challenge.
 * Displays coin count, optional badge reveal, and tomorrow's preview.
 */
export function DailyRewardClaim({ coinsEarned, currentStreakDay, badge, t }: DailyRewardClaimProps) {
  const tomorrowCoins = getRewardCoins(currentStreakDay + 1);

  return (
    <NeoPanel asChild tone="navy" shadow="sm" className="p-5 text-center space-y-3">
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Coin reward */}
      <m.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
      >
        <p className="text-2xl font-black text-neo-cyan">
          {interpolateTranslation(t('daily.rewardClaimed'), { coins: coinsEarned })}
        </p>
      </m.div>

      {/* Badge reveal */}
      {badge && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-lg font-bold text-neo-yellow">
            {interpolateTranslation(t('daily.milestoneReached'), { badge })}
          </p>
        </m.div>
      )}

      {/* Come back tomorrow */}
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm text-neo-white"
      >
        {interpolateTranslation(t('daily.comeBackTomorrow'), { coins: tomorrowCoins })}
      </m.p>
    </m.div>
    </NeoPanel>
  );
}
