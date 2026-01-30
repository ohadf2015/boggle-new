/**
 * AdventureLevelUpModal Component
 *
 * Displays a celebratory modal when a player levels up in adventure mode.
 * Features confetti, animated level display, and auto-close after 3 seconds.
 *
 * Design: Neo-brutalist style with hard shadows, chunky borders, bold colors.
 */

'use client';

import React, { memo, useEffect, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';

// ==============================================
// TYPES
// ==============================================

export interface AdventureLevelUpModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** New level after the level-up */
  newLevel: number;
  /** Callback when modal is dismissed */
  onClose: () => void;
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureLevelUpModal = memo<AdventureLevelUpModalProps>(
  ({ isOpen, newLevel, onClose }) => {
    const { t } = useLanguage();
    const titleId = useId();

    // Check for reduced motion preference
    const prefersReducedMotion = useMemo(() => {
      if (typeof window === 'undefined') return false;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Fire confetti when modal opens (unless reduced motion)
    useEffect(() => {
      if (isOpen && !prefersReducedMotion) {
        fireLevelUpConfetti();
      }
    }, [isOpen, prefersReducedMotion]);

    // Auto-close after 3 seconds
    useEffect(() => {
      if (!isOpen) return;

      const timeout = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timeout);
    }, [isOpen, onClose]);

    // Don't render if not open
    if (!isOpen) {
      return null;
    }

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
              🎉
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
              {t('adventure.xp.levelUp')}
            </h2>

            {/* Level Display */}
            <div className="mb-6">
              <p className="text-neo-white/70 font-bold text-lg mb-2">
                {t('adventure.xp.newLevel')}
              </p>
              <motion.div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'bg-neo-cyan/20 border-4 border-neo-cyan',
                  'rounded-full'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                <span
                  className={cn(
                    'text-4xl md:text-5xl font-black',
                    'text-neo-cyan',
                    'drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]'
                  )}
                >
                  {newLevel}
                </span>
              </motion.div>
            </div>

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
              transition={{ delay: 0.6 }}
            >
              {t('adventure.xp.continue')}
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }
);

AdventureLevelUpModal.displayName = 'AdventureLevelUpModal';

export { AdventureLevelUpModal };
export default AdventureLevelUpModal;
