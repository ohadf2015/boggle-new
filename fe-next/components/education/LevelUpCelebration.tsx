/**
 * LevelUpCelebration Component
 *
 * Displays a celebratory modal when a student levels up in education mode.
 * Features confetti, animated level display, and optional title unlocks.
 *
 * Design: Neo-brutalist style with hard shadows, chunky borders, bold colors.
 */

'use client';

import { memo, useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';
import { SilentVideo } from '@/components/ui/SilentVideo';

// ==============================================
// TYPES
// ==============================================

export interface LevelUpPayload {
  /** Previous level before the level-up */
  oldLevel: number;
  /** New level after the level-up */
  newLevel: number;
  /** Titles unlocked at this level (if any) */
  newTitles?: string[];
}

export interface LevelUpCelebrationProps {
  /** Level up data - null hides the modal */
  levelUpData: LevelUpPayload | null;
  /** Callback when modal is dismissed */
  onClose: () => void;
}

// ==============================================
// COUNT-UP HOOK
// ==============================================

// ==============================================
// COMPONENT
// ==============================================

const LevelUpCelebration = memo<LevelUpCelebrationProps>(
  ({ levelUpData, onClose }) => {
    const { t } = useLanguage();
    const titleId = useId();
    const modalRef = useRef<HTMLDivElement>(null);

    useFocusTrap(modalRef, !!levelUpData, onClose);

    // Fire confetti when modal opens
    useEffect(() => {
      if (levelUpData) {
        fireLevelUpConfetti();
      }
    }, [levelUpData]);

    // Don't render if no level-up data
    if (!levelUpData) {
      return null;
    }

    const { newTitles = [] } = levelUpData;
    const hasTitleUnlocks = newTitles.length > 0;

    return (
      <AdaptiveAnimatePresence>
        {/* Overlay */}
        <AdaptiveMotion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'fixed inset-0 z-60',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-xs'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Modal Card */}
          <AdaptiveMotion.div
            ref={modalRef}
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
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Celebration mascot */}
            <AdaptiveMotion.div
              className="mb-4"
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
            >
              <SilentVideo
                src="/mascot/celebration.webp"
                width={96}
                height={96}
                className="mx-auto drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                preload="metadata"
                aria-hidden="true"
              />
            </AdaptiveMotion.div>

            {/* Title */}
            <h2
              id={titleId}
              className={cn(
                'text-3xl md:text-4xl font-black',
                'text-neo-lime',
                'drop-shadow-[0_0_15px_rgb(255_225_53/0.6)]',
                'mb-4'
              )}
            >
              {t('education.xp.levelUp')}
            </h2>

            {/* Level Display */}
            <div className="mb-6">
              <p className="text-neo-white font-bold text-lg mb-2">
                {t('education.xp.newLevel')}
              </p>
              <AdaptiveMotion.div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'bg-neo-pink/20 border-4 border-neo-pink',
                  'rounded-full'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                <span
                  className={cn(
                    'text-4xl md:text-5xl font-black tabular-nums',
                    'text-neo-pink',
                    'drop-shadow-[0_0_10px_rgb(255_107_53/0.5)]'
                  )}
                >
                  {levelUpData.newLevel}
                </span>
              </AdaptiveMotion.div>
            </div>

            {/* Title Unlock Section */}
            {hasTitleUnlocks && (
              <AdaptiveMotion.div
                className={cn(
                  'mb-6 p-4 rounded-neo',
                  'bg-neo-pink/20 border-neo border-neo-pink'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-neo-pink font-bold text-sm uppercase tracking-wide mb-2">
                  {t('education.xp.newTitleUnlocked')}
                </p>
                <div className="space-y-1">
                  {newTitles.map((title, index) => (
                    <AdaptiveMotion.p
                      key={title}
                      className={cn(
                        'text-lg md:text-xl font-black',
                        'text-neo-white'
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                    >
                      {title}
                    </AdaptiveMotion.p>
                  ))}
                </div>
              </AdaptiveMotion.div>
            )}

            {/* Continue Button */}
            <AdaptiveMotion.button
              onClick={onClose}
              className={cn(
                'w-full py-3 px-6',
                'bg-neo-lime hover:bg-neo-pink',
                'text-neo-black font-black text-lg',
                'border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                'transition-all duration-200'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              {t('education.xp.continue')}
            </AdaptiveMotion.button>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    );
  }
);

LevelUpCelebration.displayName = 'LevelUpCelebration';

export { LevelUpCelebration };
export default LevelUpCelebration;
