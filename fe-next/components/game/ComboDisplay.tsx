'use client';

import React, { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getComboColors } from '../grid/comboColors';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import FloatingCoinAnimation from './FloatingCoinAnimation';

interface ComboDisplayProps {
  comboLevel: number;
  compact?: boolean;
  className?: string;
  /** Whether combo timer is in danger zone (<30% remaining) */
  isDanger?: boolean;
  /** Time remaining as percentage (0-100) */
  timeRemaining?: number | null;
  /** Coin reward amount to animate (triggers animation when > 0) */
  coinReward?: number | null;
  /** Callback when coin animation completes */
  onCoinAnimationComplete?: () => void;
  /** Force high contrast mode for light backgrounds (e.g., landscape panels) */
  highContrast?: boolean;
}

// Sparkle particle component - memoized and optimized for smooth animation
const Sparkle = memo<{
  index: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
}>(({ angle, distance, color, size, delay }) => (
  <motion.div
    className="absolute pointer-events-none will-change-transform"
    style={{
      width: size,
      height: size,
      left: '50%',
      top: '50%',
      marginLeft: -size / 2,
      marginTop: -size / 2,
    }}
    animate={{
      // Simplified 4-step animation for smoother performance
      scale: [0, 1, 0.8, 0],
      opacity: [0, 1, 0.5, 0],
      x: [0, Math.cos(angle) * distance, Math.cos(angle) * distance * 1.1, 0],
      y: [0, Math.sin(angle) * distance, Math.sin(angle) * distance * 1.1, 0],
    }}
    transition={{
      duration: 1.5,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
      repeatDelay: 0.5, // Add pause between cycles
    }}
  >
    <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-lg">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  </motion.div>
));

Sparkle.displayName = 'Sparkle';

/**
 * ComboDisplay - Text-based combo indicator with emoji
 * Shows current combo level as "🔥 x3 Combo" with gradient text and glow effects
 * Memoized to prevent unnecessary re-renders
 */
const ComboDisplay = memo<ComboDisplayProps>(({
  comboLevel,
  compact = false,
  className,
  isDanger = false,
  timeRemaining,
  coinReward = null,
  onCoinAnimationComplete,
  highContrast = false,
}) => {
  const comboColors = getComboColors(comboLevel);
  const { isLowEnd, enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const isHighCombo = comboLevel >= 5;
  const isVeryHighCombo = comboLevel >= 7;
  const isInsaneCombo = comboLevel >= 10;
  const isMediumCombo = comboLevel >= 3;
  const isRainbow = comboColors.isRainbow;

  // Skip sparkle effects on low-end devices for better performance
  const skipSparkles = isLowEnd || !enableComplexAnimations || prefersReducedMotion;

  // Memoize sparkle data for performance - reduced distance in compact mode to prevent overflow
  const sparkleData = useMemo(() => {
    if (comboLevel < 3 || skipSparkles) return [];
    const count = isHighCombo ? 4 : 3; // Reduced count for better performance
    return [...Array(count)].map((_, i) => ({
      angle: (i * (360 / count)) * (Math.PI / 180),
      distance: compact ? 15 : 30, // Slightly reduced for smoother animation
      delay: i * 0.25,
    }));
  }, [comboLevel, isHighCombo, compact, skipSparkles]);

  const sparkleColors = isRainbow
    ? ['#FF3366', '#FFE135', '#00FFFF', '#FF1493', '#BFFF00']
    : ['#FFD700', '#FF6B35', '#FF3366', '#FFE135'];

  // Hide combo display only when level is 0 (show from first combo word)
  if (comboLevel < 1) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center relative overflow-visible',
        compact ? 'min-w-[70px] max-w-[90px]' : 'min-w-[130px]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`combo-${comboLevel}`}
          initial={{ scale: 0, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="relative"
        >
          {/* Sparkle particles for combos >= 3 */}
          {isMediumCombo && sparkleData.map((data, i) => (
            <Sparkle
              key={`sparkle-${i}`}
              index={i}
              angle={data.angle}
              distance={data.distance}
              color={sparkleColors[i % sparkleColors.length]}
              size={compact ? 6 : 8}
              delay={data.delay}
            />
          ))}

          {/* Main combo text - clean text-based display without badge */}
          <motion.div
            animate={
              isDanger
                ? {
                    // Subtle danger pulse - gentle opacity fluctuation
                    opacity: [1, 0.85, 1],
                    scale: [1, 1.02, 1],
                  }
                : isHighCombo
                ? {
                    scale: [1, 1.05, 1],
                  }
                : undefined
            }
            transition={
              isDanger
                ? {
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
                : isHighCombo
                ? {
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
                : undefined
            }
            className={cn(
              'relative',
              compact ? 'text-lg' : 'text-xl'
            )}
          >
            {/* Content - text with emoji */}
            <div
              className={cn(
                'flex items-center gap-1 relative z-10 font-black',
                // Text color with gradient effect
                'text-transparent bg-clip-text',
                isRainbow
                  ? ''
                  : 'bg-gradient-to-r from-orange-400 via-red-400 to-pink-400'
              )}
              style={{
                // Enhanced text shadow for visibility
                WebkitTextStroke: highContrast ? '1px rgba(0,0,0,0.3)' : undefined,
                ...(isRainbow && {
                  background: 'linear-gradient(90deg, #dc2626, #ea580c, #ca8a04, #16a34a, #0891b2, #2563eb, #7c3aed, #db2777, #dc2626)',
                  backgroundSize: '300% 100%',
                  animation: 'rainbow-shift 1.5s linear infinite',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }),
              }}
            >
              {/* Fire emoji - simplified animation for performance */}
              <motion.span
                className="text-[1.1em]"
                style={{
                  // Reset text styles for emoji to show properly
                  WebkitTextFillColor: 'initial',
                  filter: isRainbow
                    ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))'
                    : isDanger
                    ? 'drop-shadow(0 0 6px rgba(251, 146, 60, 0.7))'
                    : `drop-shadow(0 0 ${isHighCombo ? '8px' : '4px'} rgba(251, 146, 60, 0.5))`,
                }}
                animate={
                  skipSparkles
                    ? undefined // No animation on low-end devices
                    : {
                        scale: [1, isMediumCombo ? 1.15 : 1.05, 1],
                        rotate: [0, isMediumCombo ? 5 : 2, 0, isMediumCombo ? -5 : -2, 0],
                      }
                }
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatDelay: 0.3, // Small pause for less CPU usage
                }}
              >
                {isRainbow ? '🌈' : '🔥'}
              </motion.span>

              {/* Combo count */}
              <motion.span
                key={`level-${comboLevel}`}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="tabular-nums"
                style={{
                  textShadow: highContrast
                    ? '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.7)'
                    : '1px 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(251, 146, 60, 0.4)',
                }}
              >
                x{comboLevel}
              </motion.span>

              {/* COMBO word - always visible now */}
              <span
                style={{
                  textShadow: highContrast
                    ? '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.7)'
                    : '1px 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(251, 146, 60, 0.4)',
                }}
              >
                Combo
              </span>
            </div>

            {/* Glow effect behind text - replaces badge background */}
            {!skipSparkles && (
              <motion.div
                className="absolute inset-0 pointer-events-none -z-10"
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  background: isRainbow
                    ? 'linear-gradient(90deg, #dc2626, #ea580c, #ca8a04, #16a34a, #0891b2)'
                    : 'linear-gradient(90deg, #f97316, #ef4444, #ec4899)',
                  filter: 'blur(12px)',
                  transform: 'scale(1.5)',
                  borderRadius: '50%',
                }}
              />
            )}
          </motion.div>

          {/* Status text below for high combos */}
          {isVeryHighCombo && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap',
                'text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded',
                isInsaneCombo
                  ? 'bg-gradient-to-r from-pink-500 to-cyan-500 text-white'
                  : 'bg-neo-black text-white'
              )}
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {isInsaneCombo ? 'LEGENDARY!' : 'ON FIRE!'}
            </motion.div>
          )}

          {/* Burst effect on combo increase */}
          <motion.div
            key={`burst-${comboLevel}`}
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              border: `2px solid ${isRainbow ? '#fff' : '#FF6B35'}`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Coin reward animation */}
      <FloatingCoinAnimation
        coinAmount={coinReward}
        onAnimationComplete={onCoinAnimationComplete}
      />
    </div>
  );
});

ComboDisplay.displayName = 'ComboDisplay';

export default ComboDisplay;
