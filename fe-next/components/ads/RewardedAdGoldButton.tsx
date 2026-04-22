'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Coins, Loader2, CheckCircle } from 'lucide-react';
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
  /** Larger, more prominent variant for primary CTAs. */
  size?: 'sm' | 'md';
}

export const RewardedAdGoldButton: React.FC<RewardedAdGoldButtonProps> = ({
  goldAmount,
  onRewardEarned,
  className,
  surface,
  size = 'sm',
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
  const isLoading = status === 'loading' || status === 'showing';
  const isDone = status === 'completed';
  const isDisabled = isLoading || capped;
  const isIdle = status === 'idle' && !capped;

  const label = status === 'showing'
    ? t('ads.rewarded.earning')
    : isDone
      ? t('ads.rewarded.earned').replace('{amount}', String(goldAmount))
      : capped
        ? t('ads.rewarded.cooldown')
        : t('ads.rewarded.watchForGold').replace('{amount}', String(goldAmount));

  const Icon = isDone ? CheckCircle : isLoading ? Loader2 : Play;
  const isMd = size === 'md';

  return (
    <motion.button
      type="button"
      onClick={showAd}
      disabled={isDisabled}
      aria-label={t('ads.rewarded.watchForGold').replace('{amount}', String(goldAmount))}
      whileHover={!isDisabled ? { scale: 1.04, y: -1 } : undefined}
      whileTap={!isDisabled ? { scale: 0.96 } : undefined}
      animate={isIdle ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={isIdle ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}
      className={cn(
        'relative inline-flex items-center gap-2 font-bold',
        isMd ? 'px-4 py-2.5 text-base' : 'px-3 py-1.5 text-sm',
        'border-2 border-black rounded-neo shadow-hard',
        'transition-colors active:shadow-hard-pressed',
        isDone
          ? 'bg-neo-lime text-black border-black'
          : isDark
            ? 'bg-neo-navy-light text-neo-lime border-neo-lime/60 hover:bg-neo-navy-light/80'
            : 'bg-neo-yellow text-black border-black hover:brightness-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {isIdle && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-neo pointer-events-none animate-pulse opacity-40 ring-2 ring-neo-lime"
        />
      )}
      <Icon className={cn(isMd ? 'h-4 w-4' : 'h-3.5 w-3.5', isLoading && 'animate-spin')} />
      <span className="relative flex items-center gap-1">
        <span>{label}</span>
        {isIdle && (
          <span className="inline-flex items-center gap-0.5 font-black text-neo-lime">
            <Coins className={isMd ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            +{goldAmount}
          </span>
        )}
      </span>
    </motion.button>
  );
};

export default RewardedAdGoldButton;
