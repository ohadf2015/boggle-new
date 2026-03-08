/**
 * AchievementToast Component
 *
 * Non-intrusive toast notification for achievements during gameplay.
 * Displays at top of screen without blocking the game grid.
 * Follows Neo-Brutalist design with tier-based styling.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { TIER_COLORS, TIER_ICONS, calculateTier, type TierName } from '@/utils/achievementTiers';
import type { AdventureAchievementDef } from '@/utils/adventureAchievementUtils';

// ==============================================
// TYPES
// ==============================================

export interface AchievementToastPayload {
  achievement: AdventureAchievementDef;
  count: number;
  isNew: boolean;
}

interface AchievementToastOptions {
  duration?: number;
  position?: 'top-center' | 'top-right' | 'top-left';
}

// ==============================================
// CONSTANTS
// ==============================================

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION = 'top-center';

// ==============================================
// TOAST CONTENT COMPONENT
// ==============================================

interface AchievementToastContentProps {
  payload: AchievementToastPayload;
  isVisible: boolean;
}

function AchievementToastContent({ payload, isVisible }: AchievementToastContentProps) {
  const { t, dir } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const hasPlayedRef = useRef(false);

  const { achievement, count, isNew } = payload;
  const tier = calculateTier(count);
  const tierColors = tier ? TIER_COLORS[tier] : TIER_COLORS.BRONZE;
  const tierIcon = tier ? TIER_ICONS[tier] : TIER_ICONS.BRONZE;

  // Play sound and confetti on mount (only once)
  useEffect(() => {
    if (isVisible && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      playAchievementSound();
      fireConfetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.2, x: 0.5 },
        colors: ['#BFFF00', '#00FFFF', '#FFE135', '#FF6B35', '#FF1493'],
      });
    }
  }, [isVisible, playAchievementSound]);

  const titleText = isNew
    ? t('achievements.unlocked')
    : t('achievements.upgraded');

  const achievementName = t(achievement.nameKey) || achievement.id;

  const isRtl = dir === 'rtl';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'flex items-center gap-3 px-4 py-3',
            'rounded-neo border-3 border-neo-black',
            'shadow-hard bg-neo-navy'
          )}
          style={{
            borderColor: tierColors.border,
            boxShadow: isRtl
              ? `-4px 4px 0px ${tierColors.border}`
              : `4px 4px 0px ${tierColors.border}`,
            minWidth: '280px',
            maxWidth: '400px',
            pointerEvents: 'auto',
          }}
          data-testid="achievement-toast"
        >
          {/* Achievement Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            className={cn(
              'w-12 h-12 flex items-center justify-center',
              'rounded-full border-2 border-neo-black'
            )}
            style={{ backgroundColor: tierColors.bg }}
          >
            <span className="text-2xl">{achievement.icon}</span>
          </motion.div>

          {/* Text Content */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Title */}
            <motion.span
              initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xs font-bold uppercase tracking-wide text-neo-white/70"
            >
              {titleText}
            </motion.span>

            {/* Achievement Name */}
            <motion.span
              initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="font-black text-lg truncate"
              style={{ color: tierColors.text === '#000000' ? '#BFFF00' : tierColors.text }}
            >
              {achievementName}
            </motion.span>
          </div>

          {/* Tier Badge */}
          {tier && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 15 }}
              className={cn(
                'px-2 py-1 rounded border-2 border-neo-black',
                'flex items-center gap-1'
              )}
              style={{ backgroundColor: tierColors.bg }}
            >
              <span className="text-lg">{tierIcon}</span>
              <span
                className="text-xs font-black uppercase"
                style={{ color: tierColors.text }}
              >
                {tier}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==============================================
// TOAST TRIGGER FUNCTION
// ==============================================

/**
 * Show an achievement toast notification
 * Non-intrusive, appears at top of screen without blocking gameplay
 */
export function showAchievementToast(
  payload: AchievementToastPayload,
  options: AchievementToastOptions = {}
): string {
  const { duration = DEFAULT_DURATION, position = DEFAULT_POSITION } = options;

  return toast.custom(
    (t) => <AchievementToastContent payload={payload} isVisible={t.visible} />,
    {
      id: `achievement-${payload.achievement.id}-${Date.now()}`,
      duration,
      position,
    }
  );
}

/**
 * Dismiss a specific achievement toast by ID
 */
export function dismissAchievementToast(toastId: string): void {
  toast.dismiss(toastId);
}

/**
 * Dismiss all achievement toasts
 */
export function dismissAllAchievementToasts(): void {
  toast.dismiss();
}

// Export the content component as the default
export default AchievementToastContent;
