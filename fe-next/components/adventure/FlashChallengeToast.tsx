'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FlashChallenge } from '@/types/adventure';

interface FlashChallengeToastProps {
  challenge: FlashChallenge | null;
  isComplete: boolean;
  onDismiss: () => void;
  timeLeft: number;
}

export const FlashChallengeToast = memo(function FlashChallengeToast({
  challenge,
  isComplete,
  onDismiss,
  timeLeft,
}: FlashChallengeToastProps) {
  const { t } = useLanguage();

  if (!challenge) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={challenge.id}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={cn(
          'fixed bottom-24 left-1/2 -translate-x-1/2 z-50',
          'w-[calc(100vw-2rem)] max-w-sm',
          'rounded-neo border-3 shadow-hard',
          'p-3',
          isComplete
            ? 'bg-neo-lime border-neo-black'
            : 'bg-neo-navy border-neo-yellow'
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className={cn('w-4 h-4', isComplete ? 'text-neo-black' : 'text-neo-yellow')} />
            <span className={cn('text-xs font-black uppercase tracking-wide', isComplete ? 'text-neo-black' : 'text-neo-yellow')}>
              {t('adventure.quests.flash.title')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <span className="text-xs font-mono font-black text-neo-white/60">{timeLeft}s</span>
            )}
            <button
              data-testid="challenge-dismiss"
              onClick={onDismiss}
              className={cn('w-5 h-5 flex items-center justify-center rounded-full border-2', isComplete ? 'border-neo-black text-neo-black' : 'border-neo-white/40 text-neo-white/60')}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className={cn('text-sm font-bold', isComplete ? 'text-neo-black' : 'text-neo-white')}>
          {t(challenge.descriptionKey, { param: String(challenge.param) })}
        </p>

        {/* Reward row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Coins className={cn('w-3.5 h-3.5', isComplete ? 'text-neo-black' : 'text-neo-yellow')} />
            <span className={cn('text-xs font-black', isComplete ? 'text-neo-black' : 'text-neo-yellow')}>
              +{challenge.rewardCoins}
            </span>
          </div>
          {isComplete && (
            <div
              data-testid="challenge-complete-badge"
              className="flex items-center gap-1 bg-neo-black/20 rounded-neo px-2 py-0.5"
            >
              <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
              <span className="text-xs font-black text-neo-black">{t('adventure.quests.flash.complete')}</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

FlashChallengeToast.displayName = 'FlashChallengeToast';
export default FlashChallengeToast;
