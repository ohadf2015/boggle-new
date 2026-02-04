/**
 * AchievementUnlockModal Component
 *
 * Displays celebration modal/toast when achievements unlock.
 * Tier-appropriate prominence:
 * - Bronze/Silver: Toast (compact, auto-dismiss after 3s)
 * - Gold/Platinum: Full modal (confetti, sound, manual dismiss)
 *
 * Design: Neo-brutalist style with tier-colored badges and hard shadows
 */

'use client';

import React, { memo, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';
import type { UnlockPayload } from '@/hooks/useAchievementUnlock';

// ==============================================
// TYPES
// ==============================================

export interface AchievementUnlockModalProps {
  /** Unlock data - null hides the modal */
  unlock: UnlockPayload | null;
  /** Callback when modal/toast is dismissed */
  onClose: () => void;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Tier colors for badges (Neo-Brutalist palette) */
const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFE135', // neo-yellow
  platinum: '#E5E4E2',
} as const;

/** Auto-dismiss timeout for toast (Bronze/Silver) */
const TOAST_DISMISS_MS = 3000;

// ==============================================
// COMPONENT
// ==============================================

const AchievementUnlockModal = memo<AchievementUnlockModalProps>(({ unlock, onClose }) => {
  const { t, dir } = useLanguage();
  const titleId = useId();

  // Determine display mode based on tier
  const isToast = unlock?.tier === 'bronze' || unlock?.tier === 'silver';
  const isFullModal = unlock?.tier === 'gold' || unlock?.tier === 'platinum';

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && unlock) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [unlock, onClose]);

  // Fire confetti for Gold/Platinum only
  useEffect(() => {
    if (unlock && isFullModal) {
      fireLevelUpConfetti();
    }
  }, [unlock, isFullModal]);

  // Auto-dismiss toast after timeout
  useEffect(() => {
    if (!unlock || !isToast) return;

    const timer = setTimeout(() => {
      onClose();
    }, TOAST_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [unlock, isToast, onClose]);

  // Don't render if no unlock data
  if (!unlock) {
    return null;
  }

  const { tier, icon, isNew, isUpgrade } = unlock;

  // Get tier name for display
  const tierName = t(`education.achievements.tiers.${tier}`);

  // Get title message
  const titleMessage = isNew
    ? t('education.achievements.unlocked')
    : t('education.achievements.upgraded', { tier: tierName });

  // Get badge text
  const badgeText = isNew
    ? t('education.achievements.newBadge')
    : t('education.achievements.tierUpgrade');

  return (
    <AnimatePresence>
      {/* Toast Layout (Bronze/Silver) */}
      {isToast && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className={cn(
            'fixed top-4 ltr:right-4 rtl:left-4 z-[300]',
            'w-full max-w-sm mx-4 sm:mx-0',
            'bg-neo-navy border-3 border-neo-black',
            'rounded-neo shadow-hard',
            'p-4',
            'cursor-pointer'
          )}
          initial={{ opacity: 0, x: dir === 'rtl' ? -50 : 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: dir === 'rtl' ? -50 : 50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={onClose}
        >
          {/* Toast Content */}
          <div className="flex items-center gap-3">
            {/* Badge Icon */}
            <div
              className={cn(
                'flex-shrink-0 w-12 h-12',
                'flex items-center justify-center',
                'bg-neo-cyan/20 border-2 border-neo-cyan',
                'rounded-neo'
              )}
              style={{
                borderColor: TIER_COLORS[tier],
                backgroundColor: `${TIER_COLORS[tier]}20`,
              }}
            >
              <span className="text-2xl">{icon}</span>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p
                id={titleId}
                className={cn('text-sm font-bold', 'text-neo-white', 'truncate')}
              >
                {titleMessage}
              </p>
              <p
                className="text-xs font-medium mt-0.5"
                style={{ color: TIER_COLORS[tier] }}
              >
                {badgeText}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Modal Layout (Gold/Platinum) */}
      {isFullModal && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'fixed inset-0 z-[300]',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-sm'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Modal Card */}
          <motion.div
            className={cn(
              'relative w-full max-w-md mx-4',
              'bg-neo-navy border-4 border-neo-black',
              'rounded-neo shadow-hard-lg',
              'p-6 md:p-8',
              'text-center'
            )}
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration Emoji */}
            <motion.span
              className="block text-6xl mb-4"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.3, 1], rotate: [30, -15, 0] }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            >
              🎉
            </motion.span>

            {/* Title */}
            <h2
              id={titleId}
              className={cn(
                'text-3xl md:text-4xl font-black',
                'mb-4'
              )}
              style={{
                color: TIER_COLORS[tier],
                textShadow: `0 0 15px ${TIER_COLORS[tier]}60`,
              }}
            >
              {titleMessage}
            </h2>

            {/* Badge Display */}
            <div className="mb-6">
              <p className="text-neo-white/70 font-bold text-lg mb-2">{badgeText}</p>
              <motion.div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'border-4 rounded-full'
                )}
                style={{
                  backgroundColor: `${TIER_COLORS[tier]}20`,
                  borderColor: TIER_COLORS[tier],
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                <span className="text-4xl md:text-5xl">{icon}</span>
              </motion.div>
            </div>

            {/* Tier Badge */}
            <motion.div
              className={cn(
                'mb-6 py-2 px-4 rounded-neo',
                'border-2'
              )}
              style={{
                backgroundColor: `${TIER_COLORS[tier]}20`,
                borderColor: TIER_COLORS[tier],
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="font-bold text-sm uppercase tracking-wide" style={{ color: TIER_COLORS[tier] }}>
                {tierName}
              </p>
            </motion.div>

            {/* Continue Button */}
            <motion.button
              onClick={onClose}
              className={cn(
                'w-full py-3 px-6',
                'bg-neo-yellow hover:bg-neo-orange',
                'text-neo-black font-black text-lg',
                'border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                'transition-all duration-200'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {t('education.achievements.continue')}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

AchievementUnlockModal.displayName = 'AchievementUnlockModal';

export { AchievementUnlockModal };
export default AchievementUnlockModal;
