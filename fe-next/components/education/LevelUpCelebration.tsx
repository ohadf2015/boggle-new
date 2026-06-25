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
      <>
        {/* Overlay */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'fixed inset-0 z-60',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-xs',
            'animate-in fade-in-0 duration-300'
          )}
          onClick={onClose}
        >
          {/* Modal Card */}
          <div
            ref={modalRef}
            className={cn(
              'relative w-full max-w-md mx-4',
              'bg-neo-navy border-4 border-neo-black',
              'rounded-neo shadow-hard-lg',
              'p-6 md:p-8',
              'text-center',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
            )}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Celebration mascot */}
            <div
              className="mb-4 animate-in zoom-in-50 duration-300"
              style={{ animationDelay: '0.2s' }}
            >
              <SilentVideo
                src="/mascot/celebration.webp"
                width={96}
                height={96}
                className="mx-auto drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                preload="metadata"
                aria-hidden="true"
              />
            </div>

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
              <div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'bg-neo-pink/20 border-4 border-neo-pink',
                  'rounded-full',
                  'animate-in zoom-in-50 duration-300'
                )}
                style={{ animationDelay: '0.4s' }}
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
              </div>
            </div>

            {/* Title Unlock Section */}
            {hasTitleUnlocks && (
              <div
                className={cn(
                  'mb-6 p-4 rounded-neo',
                  'bg-neo-pink/20 border-neo border-neo-pink',
                  'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                )}
                style={{ animationDelay: '0.6s' }}
              >
                <p className="text-neo-pink font-bold text-sm uppercase tracking-wide mb-2">
                  {t('education.xp.newTitleUnlocked')}
                </p>
                <div className="space-y-1">
                  {newTitles.map((title, index) => (
                    <p
                      key={title}
                      className={cn(
                        'text-lg md:text-xl font-black',
                        'text-neo-white',
                        'animate-in fade-in-0 slide-in-from-left-2 duration-300 fill-mode-both'
                      )}
                      style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                    >
                      {title}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={onClose}
              className={cn(
                'w-full py-3 px-6',
                'bg-neo-lime hover:bg-neo-pink',
                'text-neo-black font-black text-lg',
                'border-3 border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                'active:translate-y-0.5 active:shadow-hard-pressed',
                'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                'transition-all duration-200',
                'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
              )}
              style={{ animationDelay: '0.8s' }}
            >
              {t('education.xp.continue')}
            </button>
          </div>
        </div>
      </>
    );
  }
);

LevelUpCelebration.displayName = 'LevelUpCelebration';

export { LevelUpCelebration };
export default LevelUpCelebration;
