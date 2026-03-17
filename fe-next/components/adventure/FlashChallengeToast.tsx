'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Check, Zap, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FlashChallenge } from '@/types/adventure';

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
  const { t } = useLanguage();

  if (!challenge) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={isFailed ? `${challenge.id}-failed` : challenge.id}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          // Compact chip below boss HUD, doesn't overlap HP bar
          'fixed top-28 sm:top-32 end-2 z-30',
          'w-auto max-w-[220px]',
          'rounded-neo border-2 shadow-hard-sm',
          'px-2.5 py-1.5',
          isFailed
            ? 'bg-neo-red/20 border-neo-red'
            : isComplete
              ? 'bg-neo-lime border-neo-black'
              : 'bg-neo-navy/95 border-neo-yellow/70 backdrop-blur-sm'
        )}
      >
        {/* Single-row compact layout */}
        <div className="flex items-center gap-1.5">
          {isFailed ? (
            <XCircle className="w-3.5 h-3.5 flex-shrink-0 text-neo-red" />
          ) : (
            <Zap className={cn('w-3.5 h-3.5 flex-shrink-0', isComplete ? 'text-neo-black' : 'text-neo-yellow')} />
          )}
          <div className="flex-1 min-w-0">
            {isFailed ? (
              <p className="text-[10px] font-bold leading-tight text-neo-red" data-testid="challenge-failed-text">
                {t('adventure.quests.flash.missed')}
              </p>
            ) : (
              <>
                <p className={cn('text-[10px] font-bold leading-tight truncate', isComplete ? 'text-neo-black' : 'text-neo-white')}>
                  {t(challenge.descriptionKey, { param: String(challenge.param) })}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Coins className={cn('w-3 h-3', isComplete ? 'text-neo-black' : 'text-neo-yellow')} />
                  <span className={cn('text-[10px] font-black', isComplete ? 'text-neo-black' : 'text-neo-yellow')}>
                    +{challenge.rewardCoins}
                  </span>
                  {!isComplete && (
                    <span className="text-[10px] font-mono font-bold text-neo-white/50">{timeLeft}s</span>
                  )}
                  {isComplete && (
                    <Check data-testid="challenge-complete-badge" className="w-3 h-3 text-neo-black" strokeWidth={3} />
                  )}
                </div>
              </>
            )}
          </div>
          <button
            data-testid="challenge-dismiss"
            onClick={onDismiss}
            aria-label={t('common.dismiss')}
            className={cn('w-4 h-4 flex items-center justify-center flex-shrink-0',
              isFailed ? 'text-neo-red/50' : isComplete ? 'text-neo-black/50' : 'text-neo-white/40'
            )}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

FlashChallengeToast.displayName = 'FlashChallengeToast';
export default FlashChallengeToast;
