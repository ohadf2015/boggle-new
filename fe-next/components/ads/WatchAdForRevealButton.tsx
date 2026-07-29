'use client';

import React from 'react';
import { Eye, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface WatchAdForRevealButtonProps {
  /** Called once after the ad rewards — should perform the reveal. */
  onReveal: () => void | Promise<void>;
  /** Whether the reveal already happened (hides the button). */
  revealed: boolean;
  /** Analytics placement (e.g. 'reveal_target_word'). */
  placement: string;
  className?: string;
}

/**
 * Paywall-softener. When a player can't afford a coin-gated reveal, this
 * button gives them a rewarded-ad alternative instead of a dead-end.
 *
 * Uses useRewardedFeatureUnlock so the reward is the reveal itself — no
 * coin payout is layered on top (matches fix for the double-reward bug).
 */
export const WatchAdForRevealButton: React.FC<WatchAdForRevealButtonProps> = ({
  onReveal,
  revealed,
  placement,
  className,
}) => {
  const { t } = useLanguage();
  const { offer, status, canShowAd } = useRewardedFeatureUnlock({
    placement,
    surface: 'hint',
    onUnlock: onReveal,
  });

  if (revealed || !canShowAd) return null;

  const isLoading = status === 'loading' || status === 'showing';
  const Icon = isLoading ? Loader2 : Play;

  return (
    <button
      type="button"
      onClick={offer}
      disabled={isLoading}
      aria-label={t('ads.reveal.freeViaAd')}
      className={cn(
        'w-full inline-flex items-center justify-center gap-2 font-bold text-sm',
        'py-2.5 px-3',
        'bg-neo-purple/15 text-neo-purple',
        'border-2 border-neo-purple/50 rounded-neo',
        'hover:bg-neo-purple/25 hover:border-neo-purple',
        'transition-all duration-150',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
    >
      <Icon className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      <Eye className="h-4 w-4" aria-hidden />
      <span>{t('ads.reveal.freeViaAd')}</span>
    </button>
  );
};

export default WatchAdForRevealButton;
