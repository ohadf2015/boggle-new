'use client';

import React, { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getComboColors } from '../grid/comboColors';

interface ComboDisplayProps {
  comboLevel: number;
  compact?: boolean;
  className?: string;
}

// Sparkle particle component - memoized to prevent unnecessary re-renders
const Sparkle = memo<{
  index: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
}>(({ angle, distance, color, size, delay }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      width: size,
      height: size,
      left: '50%',
      top: '50%',
      marginLeft: -size / 2,
      marginTop: -size / 2,
    }}
    animate={{
      scale: [0, 1.2, 0.8, 0, 0, 1.2, 0.8, 0],
      opacity: [0, 1, 0.6, 0, 0, 1, 0.6, 0],
      x: [0, Math.cos(angle) * distance, Math.cos(angle) * distance * 1.2, 0],
      y: [0, Math.sin(angle) * distance, Math.sin(angle) * distance * 1.2, 0],
      rotate: [0, 180, 360, 360],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
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
}) => {
  const comboColors = getComboColors(comboLevel);
  const isHighCombo = comboLevel >= 5;
  const isVeryHighCombo = comboLevel >= 7;
  const isInsaneCombo = comboLevel >= 10;
  const isMediumCombo = comboLevel >= 3;
  const isRainbow = comboColors.isRainbow;

  // Memoize sparkle data for performance - reduced distance in compact mode to prevent overflow
  const sparkleData = useMemo(() => {
    if (comboLevel < 3) return [];
    const count = isHighCombo ? 6 : 4;
    return [...Array(count)].map((_, i) => ({
      angle: (i * (360 / count)) * (Math.PI / 180),
      distance: compact ? 15 : 35, // Reduced from 25 to 15 in compact mode
      delay: i * 0.2,
    }));
  }, [comboLevel, isHighCombo, compact]);

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
            animate={isHighCombo ? {
              scale: [1, 1.05, 1],
            } : undefined}
            transition={isHighCombo ? {
              duration: 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            } : undefined}
            className={cn(
              'rounded-full font-bold text-white backdrop-blur-sm relative overflow-hidden',
              'border-2 border-white/40',
              compact ? 'px-3 py-1.5 text-base' : 'px-4 py-2 text-lg',
              !isRainbow && 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500'
            )}
            style={{
              filter: isRainbow
                ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))'
                : `drop-shadow(0 0 ${isHighCombo ? '10px' : '6px'} rgba(251, 146, 60, 0.6))`,
              ...(isRainbow && {
                background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                backgroundSize: '300% 100%',
                animation: 'rainbow-shift 1.5s linear infinite',
              }),
            }}
          >
            {/* Shimmer effect */}
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
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatDelay: 1,
                }}
              />
            </motion.div>

            {/* Content */}
            <div className="flex items-center gap-1.5 relative z-10">
              {/* Fire emoji */}
              <motion.span
                animate={{
                  scale: [1, isMediumCombo ? 1.2 : 1.05, 1],
                  rotate: [0, isMediumCombo ? 8 : 3, 0, isMediumCombo ? -8 : -3, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
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
    </div>
  );
});

ComboDisplay.displayName = 'ComboDisplay';

export default ComboDisplay;
