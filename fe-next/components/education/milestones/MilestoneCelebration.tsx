/**
 * MilestoneCelebration Component
 *
 * Celebration overlay shown when student reaches a milestone level.
 * Features confetti, milestone level display, XP/coin rewards, and title unlock.
 */

'use client';

import { memo, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';

// ==============================================
// TYPES
// ==============================================

export interface MilestonePayload {
  /** Milestone level reached */
  level: number;
  /** Whether this is a major milestone */
  isMajor: boolean;
  /** Rewards earned */
  rewards: {
    xpBonus: number;
    coinBonus: number;
    title: string | null;
  };
}

export interface MilestoneCelebrationProps {
  /** Milestone data - null hides the modal */
  milestone: MilestonePayload | null;
  /** Callback when modal is dismissed */
  onClose: () => void;
}

// ==============================================
// COMPONENT
// ==============================================

export const MilestoneCelebration = memo<MilestoneCelebrationProps>(
  ({ milestone, onClose }) => {
    const { t } = useLanguage();
    const titleId = useId();

    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && milestone) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [milestone, onClose]);

    // Fire confetti when modal opens
    useEffect(() => {
      if (milestone) {
        fireLevelUpConfetti();
      }
    }, [milestone]);

    // Don't render if no milestone data
    if (!milestone) {
      return null;
    }

    const { level, isMajor, rewards } = milestone;
    const { xpBonus, coinBonus, title } = rewards;

    return (
      <AnimatePresence>
        {/* Overlay */}
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
              {isMajor ? '🏆' : '⭐'}
            </motion.span>

            {/* Title */}
            <h2
              id={titleId}
              className={cn(
                'text-3xl md:text-4xl font-black',
                'text-neo-yellow',
                'drop-shadow-[0_0_15px_rgba(255,225,53,0.6)]',
                'mb-4'
              )}
            >
              {t('education.milestones.reached')}
            </h2>

            {/* Level Display */}
            <div className="mb-6">
              <p className="text-neo-white/70 font-bold text-lg mb-2">
                {t('education.milestones.level')}
              </p>
              <motion.div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'bg-neo-orange/20 border-4 border-neo-orange',
                  'rounded-full'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                <span
                  className={cn(
                    'text-4xl md:text-5xl font-black',
                    'text-neo-orange',
                    'drop-shadow-[0_0_10px_rgba(255,107,53,0.5)]'
                  )}
                >
                  {level}
                </span>
              </motion.div>
            </div>

            {/* Rewards Section */}
            <div className="mb-6 space-y-3">
              {/* XP Bonus */}
              <motion.div
                className={cn(
                  'p-3 rounded-neo',
                  'bg-neo-cyan/10 border-neo border-neo-cyan'
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-neo-cyan font-bold text-sm">
                  {t('education.milestones.xpBonus')}
                </p>
                <p className="text-2xl font-black text-neo-white">
                  +{xpBonus}
                </p>
              </motion.div>

              {/* Coin Bonus */}
              <motion.div
                className={cn(
                  'p-3 rounded-neo',
                  'bg-neo-yellow/10 border-neo border-neo-yellow'
                )}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-neo-yellow font-bold text-sm">
                  {t('education.milestones.coinBonus')}
                </p>
                <p className="text-2xl font-black text-neo-white">
                  +{coinBonus}
                </p>
              </motion.div>
            </div>

            {/* Title Unlock Section */}
            {title && (
              <motion.div
                className={cn(
                  'mb-6 p-4 rounded-neo',
                  'bg-neo-orange/20 border-neo border-neo-orange'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-neo-orange font-bold text-sm uppercase tracking-wide mb-2">
                  {t('education.milestones.titleUnlocked')}
                </p>
                <p className="text-lg md:text-xl font-black text-neo-white">
                  {title}
                </p>
              </motion.div>
            )}

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
              {t('education.milestones.continue')}
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }
);

MilestoneCelebration.displayName = 'MilestoneCelebration';
