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
 * ComboDisplay - Notification-style combo indicator
 * Shows current combo level with gradient pill shape and fire effects
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

          {/* Main pill badge - notification style */}
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
              'rounded-full font-bold backdrop-blur-sm relative overflow-hidden',
              'border-2',
              // Rainbow mode uses black text for better contrast, others use white
              isRainbow ? 'text-neo-black' : 'text-white',
              // Subtle border color shift in danger state
              isDanger ? 'border-orange-400/70' : 'border-white/40',
              compact ? 'px-3 py-1.5 text-base' : 'px-4 py-2 text-lg',
              !isRainbow && 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500'
            )}
            style={{
              filter: isRainbow
                ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))'
                : isDanger
                ? 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.8))'
                : `drop-shadow(0 0 ${isHighCombo ? '10px' : '6px'} rgba(251, 146, 60, 0.6))`,
              ...(isRainbow && {
                background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                backgroundSize: '300% 100%',
                animation: 'rainbow-shift 1.5s linear infinite',
                textShadow: '1px 1px 0 rgba(255,255,255,0.8), -1px -1px 0 rgba(255,255,255,0.8), 1px -1px 0 rgba(255,255,255,0.8), -1px 1px 0 rgba(255,255,255,0.8)',
              }),
            }}
          >
            {/* Shimmer effect - skip on low-end devices */}
            {!skipSparkles && (
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                style={{ zIndex: 5 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    width: '200%',
                    marginLeft: '-100%',
                  }}
                  animate={{ marginLeft: ['-100%', '100%'] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    repeatDelay: 1.5, // Longer pause for less GPU work
                  }}
                />
              </motion.div>
            )}

            {/* Content */}
            <div className="flex items-center gap-1.5 relative z-10">
              {/* Fire emoji - simplified animation for performance */}
              <motion.span
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

              {/* COMBO word - only in non-compact mode */}
              {!compact && (
                <span className="font-black uppercase tracking-wide">
                  Combo
                </span>
              )}

              {/* Combo count */}
              <motion.span
                key={`level-${comboLevel}`}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-black"
              >
                x{comboLevel}
              </motion.span>
            </div>
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
