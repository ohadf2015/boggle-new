'use client';

import { memo, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Coins, Check, Zap, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { FlashChallenge } from '@/types/adventure';

/** Auto-dismiss delay after completion/failure (ms) */
const AUTO_DISMISS_MS = 2500;

interface FlashChallengeToastProps {
  challenge: FlashChallenge | null;
  isComplete: boolean;
  isFailed?: boolean;
  onDismiss: () => void;
  timeLeft: number;
}

export const FlashChallengeToast = memo(function FlashChallengeToast({
  challenge,
  isComplete,
  isFailed = false,
  onDismiss,
  timeLeft,
}: FlashChallengeToastProps) {
  const { t, language } = useLanguage();

  // Auto-dismiss after completion or failure
  useEffect(() => {
    if (!challenge || (!isComplete && !isFailed)) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [challenge, isComplete, isFailed, onDismiss]);

  if (!challenge) return null;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        key={isFailed ? `${challenge.id}-failed` : challenge.id}
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 10, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        data-testid="challenge-dismiss"
        className={cn(
          // Bottom-right corner — avoids header and grid center
          'fixed bottom-[calc(5.5rem+var(--admob-banner-height,0px))] sm:bottom-[calc(1.5rem+var(--admob-banner-height,0px))] inset-e-3 z-30',
          'w-auto max-w-[240px]',
          'min-w-[44px] min-h-[44px]',
          'rounded-neo border-2 shadow-hard-sm',
          'px-2.5 py-1.5',
          'cursor-pointer',
          isFailed
            ? 'bg-neo-red/20 border-neo-red'
            : isComplete
              ? 'bg-neo-lime border-neo-black'
              : 'bg-neo-navy/95 border-neo-yellow/70'
        )}
        onClick={onDismiss}
        role="status"
        aria-label={t('common.dismiss')}
      >
        {/* Single-row ultra-compact layout */}
        <div className="flex items-center gap-1.5">
          {isFailed ? (
            <XCircle className="w-3.5 h-3.5 shrink-0 text-neo-red" />
          ) : (
            <Zap className={cn('w-3.5 h-3.5 shrink-0', isComplete ? 'text-neo-black' : 'text-neo-yellow')} />
          )}
          <div className="flex-1 min-w-0">
            {isFailed ? (
              <p className="text-[11px] font-bold leading-tight text-neo-red" data-testid="challenge-failed-text">
                {t('adventure.quests.flash.missed')}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={cn('text-[11px] font-bold leading-tight truncate', isComplete ? 'text-neo-black' : 'text-neo-white')}>
                  {t(challenge.descriptionKey, { param: String(challenge.param) })}
                </p>
                <div className="flex items-center gap-1">
                  <Coins className={cn('w-3 h-3', isComplete ? 'text-neo-black' : 'text-neo-yellow')} />
                  <span className={cn('text-[11px] font-black', isComplete ? 'text-neo-black' : 'text-neo-yellow')}>
                    +{safeToLocaleString(challenge.rewardCoins, language)}
                  </span>
                  {!isComplete && (
                    <span className="text-[10px] font-mono font-bold text-neo-white">{timeLeft}s</span>
                  )}
                  {isComplete && (
                    <Check data-testid="challenge-complete-badge" className="w-3 h-3 text-neo-black" strokeWidth={3} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

FlashChallengeToast.displayName = 'FlashChallengeToast';
export default FlashChallengeToast;
