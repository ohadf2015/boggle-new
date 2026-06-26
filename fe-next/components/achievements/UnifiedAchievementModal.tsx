/**
 * UnifiedAchievementModal Component
 *
 * Consolidated achievement notification component for all game modes.
 * Replaces: AchievementPopup, education/AchievementUnlockModal, adventure/AchievementUnlockModal
 *
 * Features:
 * - Supports all achievement types (socket, education, adventure)
 * - Green (neo-lime) styling for consistency across modes
 * - Auto-dismiss after 3 seconds
 * - Tier-based visual styling with glow effects
 * - RTL-aware positioning
 */

'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { TIER_COLORS, TIER_ICONS, type TierName, calculateTier } from '@/utils/achievementTiers';
import type { AchievementPayload } from '@/shared/types/socket';
import type { UnlockPayload } from '@/hooks/useAchievementUnlock';
import type { AdventureAchievementDef } from '@/utils/adventureAchievementUtils';
import { SilentVideo } from '@/components/ui/SilentVideo';

// ==============================================
// TYPES
// ==============================================

/** Props for socket-based achievements (multiplayer) */
interface SocketAchievementProps {
  type: 'socket';
  achievement: AchievementPayload;
  onClose: () => void;
}

/** Props for education achievements */
interface EducationAchievementProps {
  type: 'education';
  unlock: UnlockPayload;
  onClose: () => void;
}

/** Props for adventure achievements */
interface AdventureAchievementProps {
  type: 'adventure';
  achievement: AdventureAchievementDef;
  count: number;
  isNew: boolean;
  onClose: () => void;
}

export type UnifiedAchievementModalProps =
  | SocketAchievementProps
  | EducationAchievementProps
  | AdventureAchievementProps;

// Internal normalized type
interface NormalizedAchievement {
  icon: string;
  name: string;
  description: string;
  tier: TierName | null;
  isNew: boolean;
  isUpgrade: boolean;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Auto-dismiss timeout */
const AUTO_DISMISS_MS = 3000;

// ==============================================
// COMPONENT
// ==============================================

export function UnifiedAchievementModal(props: UnifiedAchievementModalProps) {
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();

  // Normalize achievement data based on type
  const normalized = useMemo((): NormalizedAchievement | null => {
    switch (props.type) {
      case 'socket': {
        const { achievement } = props;
        if (!achievement) return null;
        return {
          icon: achievement.icon,
          name: t(`achievements.${achievement.key}.name`) || achievement.key,
          description: t(`achievements.${achievement.key}.description`),
          tier: (achievement.count ? calculateTier(achievement.count) : null) ?? 'BRONZE',
          isNew: true,
          isUpgrade: false,
        };
      }

      case 'education': {
        const { unlock } = props;
        if (!unlock) return null;
        // Convert lowercase tier to uppercase TierName
        const tierMap: Record<string, TierName> = {
          bronze: 'BRONZE',
          silver: 'SILVER',
          gold: 'GOLD',
          platinum: 'PLATINUM',
        };
        return {
          icon: unlock.icon,
          name: t(`education.achievements.${unlock.achievementKey}.name`) || unlock.achievementKey,
          description: t(`education.achievements.${unlock.achievementKey}.description`),
          tier: tierMap[unlock.tier] || 'BRONZE',
          isNew: unlock.isNew,
          isUpgrade: unlock.isUpgrade,
        };
      }

      case 'adventure': {
        const { achievement, count, isNew } = props;
        if (!achievement) return null;
        return {
          icon: achievement.icon,
          name: t(achievement.nameKey),
          description: t(achievement.descriptionKey),
          tier: calculateTier(count),
          isNew,
          isUpgrade: !isNew,
        };
      }

      default:
        return null;
    }
  }, [props, t]);

  // Get tier colors
  const tierColors = normalized?.tier ? TIER_COLORS[normalized.tier] : null;
  const tierIcon = normalized?.tier ? TIER_ICONS[normalized.tier] : null;

  // Stable identity for the current achievement so effects fire once per unlock,
  // not once per parent re-render. `props` itself is a new object every render,
  // which previously kept resetting the auto-dismiss timer indefinitely.
  const unlockId = normalized
    ? `${normalized.name}|${normalized.tier ?? ''}|${normalized.isNew ? 'new' : 'up'}`
    : null;

  // Latest-onClose ref so the timer always calls the freshest handler
  // without re-binding the effect.
  const onCloseRef = useRef(props.onClose);
  useEffect(() => {
    onCloseRef.current = props.onClose;
  });

  // Auto-close after timeout
  useEffect(() => {
    if (!unlockId) return;
    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [unlockId]);

  // Play sound and fire confetti once per unlock
  useEffect(() => {
    if (!unlockId) return;
    playAchievementSound();
    fireConfetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.3 },
      colors: ['#BFFF00', '#00FFFF', '#FFE135', '#FF6B35', '#FF1493'],
    });
  }, [unlockId, playAchievementSound]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  if (!normalized) return null;

  // Get title text
  const titleText = normalized.isNew
    ? t('achievements.unlocked')
    : t('achievements.upgraded');

  // CSS entrances (animate-in) instead of framer-motion: a starved main thread —
  // e.g. while the large Hebrew bundle parses — would leave a framer-motion
  // `initial` opacity:0 pinned, so the user sees only the dark backdrop ("black
  // screen"). CSS runs off the main thread and always settles visible.
  return (
    <div
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-60',
        'flex items-center justify-center',
        'bg-neo-black/80 backdrop-blur-xs',
        'animate-in fade-in-0 duration-300'
      )}
      data-testid="unified-achievement-modal"
    >
      <div
        className={cn(
          'relative p-8 rounded-neo',
          'bg-neo-navy border-4',
          'shadow-hard-lg',
          'max-w-sm w-full mx-4',
          'animate-in fade-in-0 zoom-in-95 duration-300'
        )}
        style={{
          borderColor: tierColors?.border || '#BFFF00',
          boxShadow: tierColors
            ? `0 0 30px ${tierColors.glow}`
            : '0 0 30px rgba(191, 255, 0, 0.5)',
        }}
      >
        {/* Celebration mascot */}
        <div className="flex justify-center mb-2 animate-in zoom-in-50 duration-300">
          <SilentVideo
            src="/mascot/celebration.webp"
            width={64}
            height={64}
            className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            preload="metadata"
            aria-hidden="true"
          />
        </div>

        {/* Achievement Icon */}
        <div
          className={cn(
            'w-20 h-20 mx-auto mb-6',
            'flex items-center justify-center',
            'rounded-full border-4 border-neo-white',
            'animate-in zoom-in-50 duration-300'
          )}
          style={{
            backgroundColor: tierColors?.bg || '#333',
          }}
        >
          <span className="text-4xl">{normalized.icon}</span>
        </div>

        {/* Title */}
        <h2
          className={cn(
            'text-xl font-black text-center mb-2',
            'text-neo-white',
            'animate-in fade-in-0 duration-300'
          )}
        >
          {titleText}
        </h2>

        {/* Achievement Name */}
        <h3
          className={cn('text-2xl font-black text-center mb-2', 'animate-in fade-in-0 duration-300')}
          style={{ color: tierColors?.text || 'var(--neo-lime)' }}
        >
          {normalized.name}
        </h3>

        {/* Tier Badge */}
        {normalized.tier && (
          <div className="flex items-center justify-center gap-2 mb-4 animate-in fade-in-0 zoom-in-95 duration-300">
            <span className="text-2xl">{tierIcon}</span>
            <span
              className="text-lg font-bold uppercase"
              style={{ color: tierColors?.text }}
            >
              {normalized.tier}
            </span>
          </div>
        )}

        {/* Achievement Description */}
        <p className="text-center text-neo-white text-sm animate-in fade-in-0 duration-300">
          {normalized.description}
        </p>

        {/* Continue Button - Neo-Lime (Green) */}
        <button
          type="button"
          onClick={props.onClose}
          className={cn(
            'mt-6 w-full py-3',
            'bg-neo-lime text-neo-black',
            'font-black text-lg',
            'border-3 border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg',
            'hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-200',
            'animate-in fade-in-0 duration-300'
          )}
        >
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}

export default UnifiedAchievementModal;
