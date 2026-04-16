'use client';

import React, { useEffect } from 'react';
import { Play, Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

interface RewardedAdGoldButtonProps {
  goldAmount: number;
  onRewardEarned?: (amount: number) => void;
  className?: string;
  /** Placement tag for PostHog funnel (e.g. 'gold_top_up', 'player_waiting'). */
  surface: string;
}

export const RewardedAdGoldButton: React.FC<RewardedAdGoldButtonProps> = ({
  goldAmount,
  onRewardEarned,
  className,
  surface,
}) => {
  useEffect(() => {
    trackRewardedAdOffered(surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useLanguage();

  const { showAd, status, isPlaceholderCooldown } = useRewardedAd({
    onRewardEarned: (amount) => {
      onRewardEarned?.(amount);
    },
  });

  const capped = isPlaceholderCooldown;
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
          ? 'bg-neo-navy-light text-neo-lime border-neo-lime/40 hover:bg-neo-navy-light/80'
          : 'bg-yellow-50 text-amber-800 border-amber-400 hover:bg-yellow-100',
        'active:shadow-none',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0',
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', (status === 'loading' || status === 'showing') && 'animate-spin')} />
      <Coins className="h-3.5 w-3.5 text-neo-lime" />
      <span>{label}</span>
    </button>
  );
};

export default RewardedAdGoldButton;
