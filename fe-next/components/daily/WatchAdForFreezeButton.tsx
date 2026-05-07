'use client';

import React, { useEffect } from 'react';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useStreakFreeze, MAX_FREEZES } from '@/hooks/useStreakFreeze';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

interface WatchAdForFreezeButtonProps {
  t: (key: string) => string;
  className?: string;
  /** Placement tag for PostHog funnel (e.g. 'daily_freeze'). */
  surface: string;
}

/**
 * R2 — Rewarded ad → streak freeze (saves a missed day).
 * Hides at cap. Uses useRewardedAd for daily cap + platform routing.
 */
const WatchAdForFreezeButton: React.FC<WatchAdForFreezeButtonProps> = ({ t, className = '', surface }) => {
  const { freezeCount, earnFreeze } = useStreakFreeze();
  const { showAd, status, isDailyLimitReached, canShowAd } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'freeze',
    onRewardEarned: () => earnFreeze(),
  });

  const offered = freezeCount < MAX_FREEZES;
  useEffect(() => {
    if (offered && canShowAd) trackRewardedAdOffered(surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (freezeCount >= MAX_FREEZES) return null;

  const busy = status === 'loading' || status === 'showing';
  const disabled = busy || isDailyLimitReached;

  return (
    <button
      onClick={showAd}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={t('daily.watchAdForFreeze')}
    >
      <span aria-hidden="true">{'\u2744\uFE0F'}</span>
      <span>{t('daily.watchAdForFreeze')}</span>
      <span className="px-1.5 py-0.5 bg-neo-black/20 rounded text-xs font-black">
        {freezeCount}/{MAX_FREEZES}
      </span>
    </button>
  );
};

export default WatchAdForFreezeButton;
