/**
 * AchievementToast Component
 *
 * Narrow capsule notification for achievements during gameplay. Dim, focused,
 * celebratory — pulsing tier-glow ring + shine sweep + sparkles. Designed to
 * draw the eye for ~half a second then recede so play continues uninterrupted.
 */

'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { TIER_COLORS, calculateTier, getTierToastStyle } from '@/utils/achievementTiers';
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

// Sparkle slots radiating around the icon. Rarer tiers light up more of them.
// Order is intentional: most visible angles first so low counts still look balanced.
const SPARKLE_OFFSETS: Array<{ x: number; y: number; delay: number; size: number }> = [
  { x: -16, y: -14, delay: 0.05, size: 10 },
  { x: 16, y: -10, delay: 0.18, size: 9 },
  { x: -12, y: 14, delay: 0.28, size: 8 },
  { x: 14, y: 14, delay: 0.36, size: 8 },
  { x: 0, y: -20, delay: 0.42, size: 7 },
  { x: 0, y: 20, delay: 0.5, size: 7 },
];

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
  const tierStyle = getTierToastStyle(tier);
  const tierConfettiPalette: Record<string, string[]> = {
    BRONZE: ['#CD7F32', '#FFE135', '#8B4513', '#FFFFFF'],
    SILVER: ['#C0C0C0', '#00FFFF', '#FFFFFF', '#BFFF00'],
    GOLD: ['#FFD700', '#FFE135', '#FF6B35', '#FFFFFF', '#BFFF00'],
    PLATINUM: ['#E5E4E2', '#9370DB', '#FF1493', '#00FFFF', '#FFE135', '#BFFF00'],
  };

  // Play sound and confetti on mount (only once). Rarer tiers get more particles.
  useEffect(() => {
    if (isVisible && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      playAchievementSound();
      fireConfetti({
        particleCount: tierStyle.confettiCount,
        spread: tierStyle.confettiSpread,
        startVelocity: 32,
        origin: { y: 0.18, x: 0.5 },
        colors: tier
          ? tierConfettiPalette[tier]
          : ['#BFFF00', '#00FFFF', '#FFE135', '#FF6B35', '#FF1493'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, playAchievementSound]);

  const titleText = isNew
    ? t('achievements.unlocked')
    : t('achievements.upgraded');

  const achievementName = t(achievement.nameKey) || achievement.id;

  const isRtl = dir === 'rtl';
  const accent = tierColors.border;
  const glow = tierColors.glow;
  const useLimeName = tierColors.text === '#000000';
  const sparkles = SPARKLE_OFFSETS.slice(0, tierStyle.sparkleCount);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          initial={{ y: -28, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 460, damping: 22, mass: 0.6 }}
          className={cn(
            'relative flex items-center gap-2.5 px-3.5 py-2',
            'rounded-full border-2 bg-neo-navy/95 overflow-hidden'
          )}
          style={{
            borderColor: accent,
            boxShadow: isRtl
              ? `-3px 3px 0px ${accent}`
              : `3px 3px 0px ${accent}`,
            minWidth: '220px',
            maxWidth: '300px',
            pointerEvents: 'auto',
          }}
          data-testid="achievement-toast"
        >
          {/* Shine sweep — rarer tiers run twice */}
          <m.div
            aria-hidden
            initial={{ x: isRtl ? 240 : -240, opacity: 0 }}
            animate={{ x: isRtl ? -240 : 240, opacity: [0, 0.85, 0] }}
            transition={{
              delay: 0.12,
              duration: 0.9,
              ease: 'easeOut',
              repeat: tierStyle.shineRepeat - 1,
              repeatDelay: 0.6,
            }}
            className="pointer-events-none absolute inset-y-0 w-24"
            style={{
              background: `linear-gradient(${isRtl ? '-75deg' : '75deg'}, transparent, ${glow}, transparent)`,
              mixBlendMode: 'screen',
            }}
            data-testid="achievement-toast-shine"
          />

          {/* Icon + glow ring + sparkles */}
          <div className="relative flex-shrink-0">
            <m.div
              animate={{
                boxShadow: [
                  `0 0 0 0 ${glow}`,
                  `0 0 0 ${tierStyle.pulseRadius}px transparent`,
                  `0 0 0 0 ${glow}`,
                ],
              }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full"
              aria-hidden
              data-testid="achievement-toast-pulse-ring"
            />
            <m.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 360, damping: 12 }}
              className={cn(
                'relative w-9 h-9 flex items-center justify-center',
                'rounded-full border-2 border-neo-black'
              )}
              style={{ backgroundColor: tierColors.bg }}
            >
              <m.span
                className="text-lg leading-none"
                animate={{ y: [0, -1.5, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {achievement.icon}
              </m.span>
            </m.div>
            {sparkles.map((s, i) => (
              <m.span
                key={i}
                aria-hidden
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
                transition={{ delay: s.delay, duration: 0.9, ease: 'easeOut' }}
                className="absolute pointer-events-none select-none"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(${s.x}px, ${s.y}px)`,
                  fontSize: `${s.size}px`,
                  color: accent,
                  textShadow: `0 0 6px ${glow}`,
                  lineHeight: 1,
                }}
              >
                ✦
              </m.span>
            ))}
          </div>

          {/* Text content */}
          <div className="relative flex flex-col flex-1 min-w-0 leading-tight">
            <m.span
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ delay: 0.12 }}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neo-white"
            >
              <span>{titleText}</span>
              {tier && tierStyle.showRarityBadge && (
                <m.span
                  initial={{ scale: 0, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.22, type: 'spring', stiffness: 500, damping: 14 }}
                  className="px-1.5 py-px rounded-sm font-black tracking-wider"
                  style={{
                    backgroundColor: tierColors.bg,
                    color: tierColors.text,
                    boxShadow: `0 0 6px ${glow}`,
                  }}
                  data-testid="achievement-toast-rarity"
                >
                  {tier}
                </m.span>
              )}
            </m.span>
            <m.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="font-black text-sm truncate"
              style={{ color: useLimeName ? 'var(--neo-lime)' : tierColors.text }}
            >
              {achievementName}
            </m.span>
          </div>
        </m.div>
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
