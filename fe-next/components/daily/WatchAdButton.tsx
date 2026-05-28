'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Play, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useCoinContext } from '@/contexts/CoinContext';
import { trackRewardedAdOffered } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

interface WatchAdButtonProps {
  /** Callback when coins are earned */
  onCoinsEarned: (coins: number, newTotal: number) => void;
  /** Translation function */
  t: (key: string) => string;
  /** Optional className for styling */
  className?: string;
  /** Whether to show as a compact button or full card */
  variant?: 'button' | 'card';
  /** Placement tag for PostHog funnel (e.g. 'daily_watch', 'word_hunt_results'). */
  surface: string;
}

/**
 * WatchAdButton - A button/card component to watch a rewarded ad and earn coins.
 *
 * Shows different states:
 * - Idle: "Watch Ad" button with reward amount
 * - Loading: Loading spinner
 * - Showing: "Watching ad..." state
 * - Completed: Success checkmark with coin animation
 * - Error: Error message
 */
const WatchAdButton: React.FC<WatchAdButtonProps> = ({
  onCoinsEarned,
  t,
  className,
  variant = 'button',
  surface,
}) => {
  useEffect(() => {
    trackRewardedAdOffered(surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);

  const { refreshCoins } = useCoinContext();

  // Update effect to refresh coins when ad succeeds
  const { showAd, isAdAvailable, isPlaceholderCooldown, status, error, rewardAmount } = useRewardedAd({
    surface: 'generic',
    analyticsSurface: surface,
    onRewardEarned: async (earned) => {
      setEarnedAmount(earned);
      setShowSuccess(true);

      // Refresh coins to get latest balance (especially for auth users)
      // refreshCoins now returns the new balance, avoiding stale closure issues
      // Note: freshCoins already includes the earned coins (added by useRewardedAd)
      const freshCoins = await refreshCoins();
      onCoinsEarned(earned, freshCoins);

      // Hide success after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000);
    },
    onAdError: (errorMsg) => {
      console.warn('Ad error:', errorMsg);
    },
  });

  const isLoading = status === 'loading';
  const isShowing = status === 'showing';
  const isDisabled = !isAdAvailable || isLoading || isShowing || isPlaceholderCooldown;

  // Get status-specific content
  const getStatusContent = () => {
    if (showSuccess) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-neo-lime" />,
        text: `+${earnedAmount} ${t('wordHunt.ad.coinsEarned')}`,
        subtext: null,
      };
    }

    switch (status) {
      case 'loading':
        return {
          icon: <Loader size="sm" />,
          text: t('wordHunt.ad.loading'),
          subtext: null,
        };
      case 'showing':
        return {
          icon: <Play className="w-5 h-5 animate-pulse" />,
          text: t('wordHunt.ad.watching'),
          subtext: t('wordHunt.ad.almostDone'),
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
          text: t('wordHunt.ad.error'),
          subtext: error || t('wordHunt.ad.tryAgain'),
        };
      default:
        return {
          icon: <Play className="w-5 h-5" />,
          text: t('wordHunt.ad.watchAd'),
          subtext: `+${rewardAmount} ${t('common.coins')}`,
        };
    }
  };

  const content = getStatusContent();

  if (variant === 'card') {
    // Full card variant for settings/dedicated section
    return (
      <m.div
        whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={cn(
          "relative overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard transition-all cursor-pointer",
          showSuccess
            ? "bg-linear-to-br from-neo-lime to-emerald-500"
            : isDisabled
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-neo-purple hover:shadow-hard-lg",
          className
        )}
        onClick={!isDisabled ? showAd : undefined}
      >
        {/* Reward badge */}
        <div className="absolute top-2 inset-e-2 flex items-center gap-1 px-2.5 py-1 bg-neo-lime rounded-full border-2 border-neo-black shadow-hard-sm text-neo-black">
          <Coins className="w-4 h-4" />
          <span className="font-black text-sm">+{rewardAmount}</span>
        </div>

        {/* Main content */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-2 border-neo-black",
              showSuccess ? "bg-white/30" : "bg-white/20"
            )}>
              {content.icon}
            </div>
            <div className="flex-1 text-start">
              <div className="font-black text-sm uppercase tracking-wide text-white">
                {content.text}
              </div>
              {content.subtext && (
                <div className="text-xs mt-0.5 text-white">
                  {content.subtext}
                </div>
              )}
            </div>
          </div>
        </div>
      </m.div>
    );
  }

  // Compact button variant (default)
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={showSuccess ? 'success' : status}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        <Button
          onClick={showAd}
          disabled={isDisabled}
          className={cn(
            "w-full py-3 text-base font-black uppercase border-2 border-neo-black rounded-neo shadow-hard transition-all",
            showSuccess
              ? "bg-neo-lime text-neo-black"
              : isDisabled
                ? "bg-slate-500 text-slate-300 cursor-not-allowed opacity-70"
                : "bg-linear-to-r from-purple-500 to-indigo-600 text-white hover:shadow-hard-lg hover:-translate-y-0.5"
          )}
        >
          <span className="flex items-center justify-center gap-2">
            {content.icon}
            <span>{content.text}</span>
            {!showSuccess && status === 'idle' && (
              <span className="flex items-center gap-0.5 text-neo-lime">
                <Coins className="w-4 h-4" />
                <span className="text-xs font-bold">+{rewardAmount}</span>
              </span>
            )}
          </span>
        </Button>
      </m.div>
    </AnimatePresence>
  );
};

export default WatchAdButton;
