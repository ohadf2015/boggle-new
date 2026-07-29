'use client';

import React, { useEffect, useState } from 'react';
import { Play, Coins, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useCoinContext } from '@/contexts/CoinContext';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

interface DoubleGoldAdButtonProps {
  /** Coins the player just earned — doubled (granted as bonus) on ad complete. */
  earnedAmount: number;
  /** Analytics placement (e.g. 'sp_results', 'daily_results'). */
  surface: string;
  /** Optional style override. */
  className?: string;
  /** Notified after the bonus is granted with the bonus amount. */
  onDoubled?: (bonus: number) => void;
}

/**
 * End-of-game "Watch ad to DOUBLE your gold" CTA.
 *
 * Psychology: endowment + anchoring. Doubling a visible number converts
 * meaningfully better than offering a flat bonus. Uses rewardKind='feature'
 * to bypass the default WATCH_AD grant, then manually credits the matching
 * bonus so the doubling is exact.
 */
export const DoubleGoldAdButton: React.FC<DoubleGoldAdButtonProps> = ({
  earnedAmount,
  surface,
  className,
  onDoubled,
}) => {
  const { t } = useLanguage();
  const { addCoins } = useCoinContext();
  const [doubled, setDoubled] = useState(false);

  const { showAd, status, canShowAd, isPlaceholderCooldown } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'doubleGold',
    analyticsSurface: surface,
    onRewardEarned: async () => {
      await addCoins(earnedAmount, 'Double Gold Ad', { surface, bonus: earnedAmount });
      setDoubled(true);
      onDoubled?.(earnedAmount);
    },
  });

  const visible = earnedAmount > 0 && canShowAd && !doubled;

  useEffect(() => {
    if (visible) trackRewardedAdOffered(surface, { earnedAmount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const isLoading = status === 'loading' || status === 'showing';
  const disabled = isLoading || isPlaceholderCooldown;
  const Icon = isLoading ? Loader2 : status === 'completed' ? CheckCircle : Play;
  const label = isLoading
    ? t('ads.doubleGold.earning')
    : t('ads.doubleGold.cta', { amount: earnedAmount });

  return (
    <button
      type="button"
      onClick={showAd}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-black',
        'px-4 py-3 text-base w-full',
        'bg-linear-to-r from-neo-yellow via-neo-orange to-neo-yellow',
        'text-neo-black border-3 border-neo-black rounded-neo shadow-hard-lg',
        'hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
        'transition-all duration-150',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0',
        className,
      )}
    >
      <Icon className={cn('h-5 w-5', isLoading && 'animate-spin')} />
      <span>{label}</span>
      <span className="inline-flex items-center gap-0.5 font-black">
        <Coins className="h-4 w-4" />
        +{earnedAmount}
      </span>
    </button>
  );
};

export default DoubleGoldAdButton;
