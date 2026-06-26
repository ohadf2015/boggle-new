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

import { memo, useEffect, useId, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';
import type { UnlockPayload } from '@/hooks/useAchievementUnlock';
import { trackEduAchievementUnlock } from '@/lib/education/telemetry';
import { SilentVideo } from '@/components/ui/SilentVideo';

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
  gold: '#BFFF00', // neo-lime
  platinum: '#E5E4E2',
} as const;

/** Auto-dismiss timeout for toast (Bronze/Silver) */
const TOAST_DISMISS_MS = 3000;

// ==============================================
// COMPONENT
// ==============================================

const AchievementUnlockModal = memo<AchievementUnlockModalProps>(({ unlock, onClose }) => {
  const { t } = useLanguage();
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  // Determine display mode based on tier
  const isToast = unlock?.tier === 'bronze' || unlock?.tier === 'silver';
  const isFullModal = unlock?.tier === 'gold' || unlock?.tier === 'platinum';

  useFocusTrap(modalRef, !!isFullModal && !!unlock, onClose);

  // F1: announce achievement unlock once per appearance so we can attribute
  // unlocks to the upstream feature that triggered them (practice / classroom
  // game / duel) via PostHog session funneling.
  useEffect(() => {
    if (!unlock) return;
    trackEduAchievementUnlock({
      achievementId: unlock.achievementKey,
      tier: unlock.tier,
    });
  }, [unlock]);

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

  const { tier, icon, isNew } = unlock;

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

  // CSS entrances (animate-in) instead of framer-motion: a starved main thread —
  // e.g. while the large Hebrew bundle parses — would leave a framer-motion
  // `initial` opacity:0 pinned, so the user sees only the dark backdrop ("black
  // screen"). CSS runs off the main thread and always settles visible.
  return (
    <>
      {/* Toast Layout (Bronze/Silver) */}
      {isToast && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className={cn(
            'fixed top-4 ltr:right-4 rtl:left-4 z-60',
            'w-full max-w-sm mx-4 sm:mx-0',
            'bg-neo-navy border-3 border-neo-black',
            'rounded-neo shadow-hard',
            'p-4',
            'cursor-pointer',
            'animate-in fade-in-0 slide-in-from-top-2 duration-300'
          )}
          onClick={onClose}
        >
          {/* Toast Content */}
          <div className="flex items-center gap-3">
            {/* Badge Icon */}
            <div
              className={cn(
                'shrink-0 w-12 h-12',
                'flex items-center justify-center',
                'bg-neo-cyan/20 border-neo border-neo-cyan',
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
        </div>
      )}

      {/* Full Modal Layout (Gold/Platinum) */}
      {isFullModal && (
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
              'animate-in fade-in-0 zoom-in-95 duration-300'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration Mascot */}
            <div className="mb-4 animate-in zoom-in-50 duration-300">
              <SilentVideo
                src="/mascot/celebration.webp"
                width={80}
                height={80}
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
                'mb-4',
                'animate-in fade-in-0 duration-300'
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
              <p className="text-neo-white font-bold text-lg mb-2">{badgeText}</p>
              <div
                className={cn(
                  'inline-flex items-center justify-center',
                  'w-20 h-20 md:w-24 md:h-24',
                  'border-4 rounded-full',
                  'animate-in zoom-in-50 duration-300'
                )}
                style={{
                  backgroundColor: `${TIER_COLORS[tier]}20`,
                  borderColor: TIER_COLORS[tier],
                }}
              >
                <span className="text-4xl md:text-5xl">{icon}</span>
              </div>
            </div>

            {/* Tier Badge */}
            <div
              className={cn(
                'mb-6 py-2 px-4 rounded-neo',
                'border-neo',
                'animate-in fade-in-0 duration-300'
              )}
              style={{
                backgroundColor: `${TIER_COLORS[tier]}20`,
                borderColor: TIER_COLORS[tier],
              }}
            >
              <p className="font-bold text-sm uppercase tracking-wide" style={{ color: TIER_COLORS[tier] }}>
                {tierName}
              </p>
            </div>

            {/* Continue Button */}
            <button
              type="button"
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
                'animate-in fade-in-0 duration-300'
              )}
            >
              {t('education.achievements.continue')}
            </button>
          </div>
        </div>
      )}
    </>
  );
});

AchievementUnlockModal.displayName = 'AchievementUnlockModal';

export { AchievementUnlockModal };
export default AchievementUnlockModal;
