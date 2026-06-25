/**
 * MilestoneCelebration Component
 *
 * Celebration overlay shown when student reaches a milestone level.
 * Features confetti, milestone level display, XP/coin rewards, and title unlock.
 */

'use client';

import { memo, useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';
import { SilentVideo } from '@/components/ui/SilentVideo';

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
    const modalRef = useRef<HTMLDivElement>(null);

    useFocusTrap(modalRef, !!milestone, onClose);

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
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration Mascot */}
            <div
              className="mb-4 animate-in zoom-in-50 duration-300"
              style={{ animationDelay: '0.2s' }}
            >
              {isMajor ? (
                <Image
                  src="/mascot/trophy-nobg.webp"
                  alt=""
                  width={80}
                  height={80}
                  className="mx-auto drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  unoptimized
                  aria-hidden="true"
                />
              ) : (
                <SilentVideo
                  src="/mascot/celebration.webp"
                  width={80}
                  height={80}
                  className="mx-auto drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  preload="metadata"
                  aria-hidden="true"
                />
              )}
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
              {t('education.milestones.reached')}
            </h2>

            {/* Level Display */}
            <div className="mb-6">
              <p className="text-neo-white font-bold text-lg mb-2">
                {t('education.milestones.level')}
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
                    'text-4xl md:text-5xl font-black',
                    'text-neo-pink',
                    'drop-shadow-[0_0_10px_rgb(255_20_147/0.5)]'
                  )}
                >
                  {level}
                </span>
              </div>
            </div>

            {/* Rewards Section */}
            <div className="mb-6 space-y-3">
              {/* XP Bonus */}
              <div
                className={cn(
                  'p-3 rounded-neo',
                  'bg-neo-cyan/10 border-neo border-neo-cyan',
                  'animate-in fade-in-0 slide-in-from-left-2 duration-300'
                )}
                style={{ animationDelay: '0.5s' }}
              >
                <p className="text-neo-cyan font-bold text-sm">
                  {t('education.milestones.xpBonus')}
                </p>
                <p className="text-2xl font-black text-neo-white">
                  +{xpBonus}
                </p>
              </div>

              {/* Coin Bonus */}
              <div
                className={cn(
                  'p-3 rounded-neo',
                  'bg-neo-lime/10 border-neo border-neo-lime',
                  'animate-in fade-in-0 slide-in-from-right-2 duration-300'
                )}
                style={{ animationDelay: '0.6s' }}
              >
                <p className="text-neo-lime font-bold text-sm">
                  {t('education.milestones.coinBonus')}
                </p>
                <p className="text-2xl font-black text-neo-white">
                  +{coinBonus}
                </p>
              </div>
            </div>

            {/* Title Unlock Section */}
            {title && (
              <div
                className={cn(
                  'mb-6 p-4 rounded-neo',
                  'bg-neo-pink/20 border-neo border-neo-pink',
                  'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                )}
                style={{ animationDelay: '0.7s' }}
              >
                <p className="text-neo-pink font-bold text-sm uppercase tracking-wide mb-2">
                  {t('education.milestones.titleUnlocked')}
                </p>
                <p className="text-lg md:text-xl font-black text-neo-white">
                  {title}
                </p>
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
              {t('education.milestones.continue')}
            </button>
          </div>
        </div>
      </>
    );
  }
);

MilestoneCelebration.displayName = 'MilestoneCelebration';
