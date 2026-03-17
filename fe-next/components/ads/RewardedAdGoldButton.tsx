'use client';

import React, { useMemo } from 'react';
import { Play, Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardedAd } from '@/hooks/useRewardedAd';

const AD_TIMESTAMPS_KEY = 'lexiclash_ad_timestamps';
const MAX_ADS_PER_HOUR = 3;
const ONE_HOUR = 60 * 60 * 1000;

function isFrequencyCapped(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(AD_TIMESTAMPS_KEY);
    if (!stored) return false;
    const timestamps: number[] = JSON.parse(stored);
    const cutoff = Date.now() - ONE_HOUR;
    const recentCount = timestamps.filter(t => t > cutoff).length;
    return recentCount >= MAX_ADS_PER_HOUR;
  } catch {
    return false;
  }
}

function recordAdView(): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(AD_TIMESTAMPS_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const cutoff = Date.now() - ONE_HOUR;
    const updated = [...timestamps.filter(t => t > cutoff), Date.now()];
    localStorage.setItem(AD_TIMESTAMPS_KEY, JSON.stringify(updated));
  } catch { /* silent */ }
}

interface RewardedAdGoldButtonProps {
  goldAmount: number;
  onRewardEarned?: (amount: number) => void;
  className?: string;
}

export const RewardedAdGoldButton: React.FC<RewardedAdGoldButtonProps> = ({
  goldAmount,
  onRewardEarned,
  className,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useLanguage();
  const capped = useMemo(() => isFrequencyCapped(), []);

  const { showAd, isAdAvailable, status } = useRewardedAd({
    onRewardEarned: (amount) => {
      recordAdView();
      onRewardEarned?.(amount);
    },
  });

  // Don't render if no real ad platform is available (no fake gold in production)
  if (!isAdAvailable) return null;

  const isDisabled = status === 'loading' || status === 'showing' || capped;

  const label = status === 'showing'
    ? t('ads.rewarded.earning')
    : status === 'completed'
      ? t('ads.rewarded.earned').replace('{amount}', String(goldAmount))
      : capped
        ? t('ads.rewarded.cooldown')
        : t('ads.rewarded.watchForGold').replace('{amount}', String(goldAmount));

  const Icon = status === 'loading' || status === 'showing' ? Loader2 : Play;

  return (
    <button
      type="button"
      onClick={showAd}
      disabled={isDisabled}
      aria-label={t('ads.rewarded.watchForGold').replace('{amount}', String(goldAmount))}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold',
        'border-2 border-black rounded-neo',
        'transition-all active:translate-y-0.5',
        isDark
          ? 'bg-neo-navy-light text-neo-yellow border-neo-yellow/40 hover:bg-neo-navy-light/80'
          : 'bg-yellow-50 text-amber-800 border-amber-400 hover:bg-yellow-100',
        'active:shadow-none',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0',
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', (status === 'loading' || status === 'showing') && 'animate-spin')} />
      <Coins className="h-3.5 w-3.5 text-neo-yellow" />
      <span>{label}</span>
    </button>
  );
};

export default RewardedAdGoldButton;
