/**
 * LevelEntryOverlay Component
 *
 * Displays dramatic level title burst animation on level entry.
 * Shows "Level X" with scale burst, glow effect, then fades out.
 */

'use client';

import React, { memo, useEffect, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';
import { SMOOTH } from '@/lib/adventure/springPhysics';

// ==============================================
// TYPES
// ==============================================

interface LevelEntryOverlayProps {
  /** Level number to display */
  levelNumber: number;
  /** World number for theming */
  worldNumber: number;
  /** Whether to show the overlay */
  isVisible: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const WORLD_THEMES: Record<number, { textColor: string; glowColor: string; gradient: string }> = {
  1: {
    textColor: 'text-neo-lime',
    glowColor: 'rgba(191, 255, 0, 0.6)',
    gradient: 'from-neo-lime to-emerald-400',
  },
  2: {
    textColor: 'text-neo-cyan',
    glowColor: 'rgba(0, 255, 255, 0.6)',
    gradient: 'from-neo-cyan to-blue-400',
  },
  3: {
    textColor: 'text-neo-purple',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    gradient: 'from-neo-purple to-violet-400',
  },
  4: {
    textColor: 'text-orange-400',
    glowColor: 'rgba(251, 146, 60, 0.6)',
    gradient: 'from-orange-400 to-amber-400',
  },
  5: {
    textColor: 'text-neo-red',
    glowColor: 'rgba(255, 51, 102, 0.6)',
    gradient: 'from-neo-red to-rose-400',
  },
  6: {
    textColor: 'text-neo-pink',
    glowColor: 'rgba(255, 20, 147, 0.6)',
    gradient: 'from-neo-pink to-fuchsia-400',
  },
  7: {
    textColor: 'text-cyan-300',
    glowColor: 'rgba(103, 232, 249, 0.6)',
    gradient: 'from-cyan-300 to-teal-400',
  },
  8: {
    textColor: 'text-purple-300',
    glowColor: 'rgba(196, 181, 253, 0.6)',
    gradient: 'from-purple-300 to-indigo-400',
  },
  9: {
    textColor: 'text-cyan-400',
    glowColor: 'rgba(34, 211, 238, 0.6)',
    gradient: 'from-cyan-400 to-sky-400',
  },
  10: {
    textColor: 'text-yellow-300',
    glowColor: 'rgba(253, 224, 71, 0.6)',
    gradient: 'from-yellow-300 to-amber-300',
  },
};

const DEFAULT_THEME = WORLD_THEMES[1];

// DEBT-01: Animation duration in ms (optimized for faster entry)
const BURST_DURATION = OPTIMIZED_TIMING.title.burstMs;
const HOLD_DURATION = OPTIMIZED_TIMING.title.holdMs;
const FADE_DURATION = OPTIMIZED_TIMING.title.fadeMs;
// Total duration computed per-render (world intros get extra hold time)

// ==============================================
// COMPONENT
// ==============================================

const LevelEntryOverlay = memo<LevelEntryOverlayProps>(
  ({ levelNumber, worldNumber, isVisible, onComplete, className }) => {
    const { t } = useLanguage();
    const { prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
    const [phase, setPhase] = useState<'burst' | 'hold' | 'fade' | 'done'>('burst');

    const theme = WORLD_THEMES[worldNumber] || DEFAULT_THEME;

    // Extend hold time on world intros (level 1, W2+) so players can read the mechanic hint
    const isWorldIntro = levelNumber === 1 && worldNumber >= 2;
    const holdMs = isWorldIntro ? HOLD_DURATION + 800 : HOLD_DURATION;
    const totalMs = BURST_DURATION + holdMs + FADE_DURATION;

    // Handle animation phases
    useEffect(() => {
      if (!isVisible) {
        setPhase('burst');
        return;
      }

      // For reduced motion, skip to done immediately
      if (prefersReducedMotion) {
        setPhase('done');
        onComplete?.();
        return;
      }

      // Progress through animation phases
      const burstTimer = setTimeout(() => setPhase('hold'), BURST_DURATION);
      const holdTimer = setTimeout(() => setPhase('fade'), BURST_DURATION + holdMs);
      const doneTimer = setTimeout(() => {
        setPhase('done');
        onComplete?.();
      }, totalMs);

      return () => {
        clearTimeout(burstTimer);
        clearTimeout(holdTimer);
        clearTimeout(doneTimer);
      };
    }, [isVisible, prefersReducedMotion, onComplete, holdMs, totalMs]);

    // Don't render if not visible or animation complete
    if (!isVisible || phase === 'done') {
      return null;
    }

    // Reduced motion fallback - brief text display
    if (prefersReducedMotion) {
      return (
        <div
          data-testid="level-entry-overlay"
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'bg-neo-navy/80',
            className
          )}
        >
          <div className={cn('text-4xl font-black', theme.textColor)}>
            {t('adventure.level')} {levelNumber}
          </div>
        </div>
      );
    }

    return (
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          key="level-entry-overlay"
          data-testid="level-entry-overlay"
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'pointer-events-none',
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'fade' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_DURATION / 1000 }}
        >
          {/* Background dim */}
          <AdaptiveMotion.div
            className="absolute inset-0 bg-neo-navy/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fade' ? 0 : 0.6 }}
            transition={{ duration: 0.3 }}
          />

          {/* Title container */}
          <AdaptiveMotion.div
            className="relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: phase === 'burst' ? [0, 1.5, 1.1] : 1.1,
              opacity: phase === 'fade' ? 0 : 1,
            }}
            transition={{
              scale: {
                // Using keyframes transition for 3-value animation (spring only supports 2 keyframes)
                type: 'keyframes',
                ease: [0.22, 1, 0.36, 1], // Custom easing for bounce-like feel
                duration: BURST_DURATION / 1000,
              },
              opacity: { duration: FADE_DURATION / 1000 },
            }}
          >
            {/* Glow effect */}
            {enableGlowEffects && (
              <AdaptiveMotion.div
                className="absolute inset-0 blur-2xl rounded-full"
                style={{
                  background: `radial-gradient(circle, ${theme.glowColor} 0%, transparent 70%)`,
                  transform: 'scale(2)',
                }}
                animate={{
                  opacity: phase === 'hold' ? [0.8, 1, 0.8] : phase === 'fade' ? 0 : 0.8,
                  scale: phase === 'hold' ? [1.8, 2.2, 1.8] : 2,
                }}
                transition={{
                  opacity: { duration: 0.6, repeat: Infinity, repeatType: 'reverse' },
                  scale: { duration: 0.6, repeat: Infinity, repeatType: 'reverse' },
                }}
              />
            )}

            {/* Level text */}
            <div className="relative z-10 flex flex-col items-center">
              <AdaptiveMotion.span
                className={cn(
                  'text-lg font-bold uppercase tracking-widest',
                  'text-neo-white'
                )}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                {t('adventure.level')}
              </AdaptiveMotion.span>

              <AdaptiveMotion.span
                className={cn(
                  'text-7xl md:text-8xl font-black',
                  'bg-linear-to-r bg-clip-text text-transparent',
                  theme.gradient
                )}
                style={{
                  textShadow: enableGlowEffects
                    ? `0 0 30px ${theme.glowColor}, 0 0 60px ${theme.glowColor}`
                    : undefined,
                }}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                  delay: 0.05,
                }}
              >
                {levelNumber}
              </AdaptiveMotion.span>

              {/* World mechanic intro on first level of W2+ */}
              {levelNumber === 1 && worldNumber >= 2 && (
                <AdaptiveMotion.div
                  className="mt-4 px-4 py-2 rounded-neo border-neo bg-neo-navy/80"
                  initial={{ y: 16, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ ...SMOOTH, delay: 0.3 }}
                >
                  <p className={cn('text-sm font-bold text-center max-w-[260px] leading-snug', theme.textColor)}>
                    {t(`adventure.worlds.mechanicHint${worldNumber}`)}
                  </p>
                </AdaptiveMotion.div>
              )}
            </div>

            {/* Burst particles */}
            {enableGlowEffects && phase === 'burst' && (
              <>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <AdaptiveMotion.div
                    key={`particle-${i}`}
                    className={cn(
                      'absolute w-3 h-3 rounded-full',
                      'bg-linear-to-r',
                      theme.gradient
                    )}
                    style={{
                      left: '50%',
                      top: '50%',
                      marginLeft: -6,
                      marginTop: -6,
                    }}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                      x: Math.cos((angle * Math.PI) / 180) * 100,
                      y: Math.sin((angle * Math.PI) / 180) * 100,
                      scale: 0,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.02,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </>
            )}
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    );
  }
);

LevelEntryOverlay.displayName = 'LevelEntryOverlay';

export default LevelEntryOverlay;
