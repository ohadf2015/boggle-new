'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCosyMode } from '@/contexts/AccessibilityContext';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

interface TimeLowAdPromptProps {
  /** Seconds left on the game clock. */
  timeRemaining: number;
  /** Trigger threshold (inclusive). Default 10s. */
  threshold?: number;
  /** Seconds granted on ad complete. Default 30s. */
  bonusSeconds?: number;
  /** Called with bonusSeconds after the ad rewards. */
  onExtend: (bonusSeconds: number) => void;
  /** Style override. */
  className?: string;
}

/**
 * Mid-game "Watch ad for +30s" prompt at time-critical moment.
 *
 * Psychology: loss aversion — the player has invested time/attention and
 * is about to lose it all when the timer hits zero. High-intent moment,
 * so the offered-rate should be high.
 *
 * One-shot per component mount (i.e. per game). rewardKind='feature' so
 * no coin grant is layered on top of the time bonus.
 */
export const TimeLowAdPrompt: React.FC<TimeLowAdPromptProps> = ({
  timeRemaining,
  threshold = 10,
  bonusSeconds = 30,
  onExtend,
  className,
}) => {
  const { t } = useLanguage();
  // Cozy / Calm Mode deliberately removes this loss-aversion nag — it is the
  // opposite of a calm, no-rush session. Reward-neutral (a prompt, not a grant).
  const cosyMode = useCosyMode();
  const [used, setUsed] = useState(false);

  const { showAd, status, canShowAd } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'timeLow',
    onRewardEarned: () => {
      setUsed(true);
      onExtend(bonusSeconds);
    },
  });

  const timeLow = timeRemaining > 0 && timeRemaining <= threshold;
  const visible = timeLow && canShowAd && !used && !cosyMode;

  useEffect(() => {
    if (visible) trackRewardedAdOffered('time_low_extend', { timeRemaining, bonusSeconds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const isLoading = status === 'loading' || status === 'showing';
  const Icon = isLoading ? Loader2 : Play;
  const label = isLoading
    ? t('ads.timeLow.earning')
    : t('ads.timeLow.cta', { seconds: bonusSeconds });

  return (
    <button
      type="button"
      onClick={showAd}
      disabled={isLoading}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-2 font-black text-sm',
        'px-3 py-2',
        'bg-neo-orange text-neo-black',
        'border-3 border-neo-black rounded-neo shadow-hard',
        'hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
        'transition-all duration-150',
        'animate-pulse',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:animate-none',
        className,
      )}
    >
      <Icon className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      <Clock className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </button>
  );
};

export default TimeLowAdPrompt;
