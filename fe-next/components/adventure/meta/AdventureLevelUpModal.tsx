/**
 * AdventureLevelUpModal Component
 *
 * Displays a celebratory modal when a player levels up in adventure mode.
 * Features confetti, animated level display, and auto-close after 3 seconds.
 *
 * Design: Neo-brutalist style with hard shadows, chunky borders, bold colors.
 */

'use client';

import { memo, useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
    const dialogRef = useRef<HTMLDivElement>(null);

    useFocusTrap(dialogRef, isOpen, onClose);

    // Fire confetti when modal opens (unless reduced motion). Read matchMedia
    // live inside the effect (client-only) rather than via usePrefersReducedMotion:
    // that hook starts false for SSR/#418 safety and only syncs post-mount, so the
    // confetti effect would fire once on the stale `false` before the value lands.
    useEffect(() => {
      if (!isOpen) return;
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        fireLevelUpConfetti();
      }
    }, [isOpen]);

    // Auto-close after 3 seconds
    useEffect(() => {
      if (!isOpen) return;

      const timeout = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timeout);
    }, [isOpen, onClose]);

    // Scroll lock
    useEffect(() => {
      if (!isOpen) return;

      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }, [isOpen]);

    // Don't render if not open
    if (!isOpen) {
      return null;
    }

    return (
      <>
        {/* Overlay */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'fixed inset-0 z-60',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-xs animate-in fade-in-0 duration-300'
          )}
          onClick={onClose}
        >
          {/* Modal Card */}
          <div
            className={cn(
              'relative w-full max-w-md mx-4',
              'bg-neo-navy border-4 border-neo-black',
              'rounded-neo shadow-hard-lg',
              'p-6 md:p-8',
              'text-center',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration Emoji */}
            <span
              style={{ animationDelay: '0.2s' }}
              className="block text-6xl mb-4 animate-in zoom-in-95 duration-300 fill-mode-both"
            >
              🎉
            </span>

            {/* Title */}
            <h2
              id={titleId}
              className={cn(
                'text-3xl md:text-4xl font-black',
                'text-neo-yellow',
                'drop-shadow-[0_0_15px_rgba(255,225,53,0.6)]',
                'mb-4',
                'animate-in fade-in-0 duration-300'
              )}
            >
              {t('adventure.xp.levelUp')}
            </h2>

            {/* Level Display */}
            <div className="mb-6">
              <p className="text-neo-white font-bold text-lg mb-2">
                {t('adventure.xp.newLevel')}
              </p>
              <div
                style={{ animationDelay: '0.4s' }}
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'bg-neo-cyan/20 border-4 border-neo-cyan',
                  'rounded-full',
                  'animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both'
                )}
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
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={onClose}
              style={{ animationDelay: '0.6s' }}
              className={cn(
                'w-full py-3 px-6',
                'bg-neo-yellow hover:bg-neo-orange',
                'text-neo-black font-black text-lg',
                'border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                'transition-all duration-200',
                'animate-in fade-in-0 duration-300 fill-mode-both'
              )}
            >
              {t('adventure.xp.continue')}
            </button>
          </div>
        </div>
      </>
    );
  }
);

AdventureLevelUpModal.displayName = 'AdventureLevelUpModal';

export { AdventureLevelUpModal };
export default AdventureLevelUpModal;
