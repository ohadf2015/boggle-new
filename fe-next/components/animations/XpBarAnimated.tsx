'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface XpBarAnimatedProps {
  /** Current XP value */
  currentXp: number;
  /** XP needed for next level */
  maxXp: number;
  /** Current level */
  level: number;
  /** Previous XP (for animation) */
  previousXp?: number;
  /** XP just gained (for +XP indicator) */
  xpGained?: number;
  /** Show level badge */
  showLevel?: boolean;
  /** Show XP text */
  showXpText?: boolean;
  /** Callback when level up occurs */
  onLevelUp?: (newLevel: number) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color scheme */
  colorScheme?: 'default' | 'gold' | 'purple';
  /** Additional className */
  className?: string;
}

const COLOR_SCHEMES = {
  default: {
    bar: 'from-neo-cyan via-neo-lime to-emerald-400',
    glow: '#00FFFF',
    text: 'text-neo-cyan',
  },
  gold: {
    bar: 'from-amber-400 via-yellow-400 to-amber-500',
    glow: '#FFD700',
    text: 'text-neo-lime',
  },
  purple: {
    bar: 'from-purple-500 via-fuchsia-500 to-pink-500',
    glow: '#9333ea',
    text: 'text-purple-400',
  },
};

/**
 * XpBarAnimated - Animated XP progress bar with liquid fill effect
 *
 * Features:
 * - Smooth fill animation when XP changes
 * - Shimmer effect on the fill
 * - +XP indicator when XP is gained
 * - Level badge with pulse on level up
 * - Milestone markers
 *
 * @example
 * ```tsx
 * <XpBarAnimated
 *   currentXp={750}
 *   maxXp={1000}
 *   level={5}
 *   previousXp={700}
 *   xpGained={50}
 *   showLevel
 *   showXpText
 *   onLevelUp={(level) => celebrate(level)}
 * />
 * ```
 */
export function XpBarAnimated({
  currentXp,
  maxXp,
  level,
  previousXp,
  xpGained,
  showLevel = true,
  showXpText = true,
  onLevelUp,
  size = 'md',
  colorScheme = 'default',
  className,
}: XpBarAnimatedProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const [displayXp, setDisplayXp] = useState(previousXp ?? currentXp);
  const [showXpGain, setShowXpGain] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const prevLevelRef = useRef(level);
  const animationRef = useRef<number | null>(null);
  const displayXpRef = useRef(displayXp);

  const colors = COLOR_SCHEMES[colorScheme];
  const percentage = Math.min((displayXp / maxXp) * 100, 100);

  // Size configurations
  const sizeConfig = {
    sm: { height: 'h-3', levelBadge: 'w-8 h-8 text-sm', text: 'text-xs' },
    md: { height: 'h-4', levelBadge: 'w-10 h-10 text-base', text: 'text-sm' },
    lg: { height: 'h-6', levelBadge: 'w-12 h-12 text-lg', text: 'text-base' },
  };

  // Animate XP change
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayXp(currentXp);
      displayXpRef.current = currentXp;
      return;
    }

    const startXp = displayXpRef.current;
    const diff = currentXp - startXp;
    if (diff === 0) return;

    const duration = Math.min(Math.abs(diff) * 2, 1000);
    const startTime = performance.now();

    // Show +XP indicator
    if (xpGained && xpGained > 0) {
      setShowXpGain(true);
      setTimeout(() => setShowXpGain(false), 2000);
    }

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const newValue = Math.round(startXp + diff * easeProgress);
      setDisplayXp(newValue);
      displayXpRef.current = newValue;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentXp, prefersReducedMotion, xpGained]);

  // Detect level up
  useEffect(() => {
    if (level > prevLevelRef.current) {
      setIsLevelingUp(true);
      onLevelUp?.(level);
      setTimeout(() => setIsLevelingUp(false), 1000);
    }
    prevLevelRef.current = level;
  }, [level, onLevelUp]);

  // Milestone markers at 25%, 50%, 75%
  const milestones = [25, 50, 75];

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-3">
        {/* Level badge */}
        {showLevel && (
          <m.div
            className={cn(
              'flex items-center justify-center rounded-neo border-3 border-neo-black shadow-hard',
              'bg-linear-to-br from-neo-lime to-amber-500 font-black text-neo-black',
              sizeConfig[size].levelBadge
            )}
            animate={
              isLevelingUp
                ? {
                    scale: [1, 1.3, 1],
                    rotate: [0, -5, 5, 0],
                  }
                : undefined
            }
            transition={{ duration: 0.5 }}
            style={{
              boxShadow: isLevelingUp && enableGlowEffects
                ? `4px 4px 0 black, 0 0 20px ${colors.glow}80`
                : '4px 4px 0 black',
            }}
          >
            {level}
          </m.div>
        )}

        {/* XP Bar container */}
        <div className="flex-1">
          <div
            className={cn(
              'relative rounded-neo border-3 border-neo-black overflow-hidden bg-neo-navy',
              sizeConfig[size].height
            )}
          >
            {/* Fill bar */}
            <m.div
              className={cn(
                'absolute inset-y-0 left-0 rounded-r-sm bg-linear-to-r',
                colors.bar
              )}
              initial={{ width: `${(previousXp ?? currentXp) / maxXp * 100}%` }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeOut' }}
              style={{
                boxShadow: enableGlowEffects && !isLowEnd
                  ? `0 0 10px ${colors.glow}60`
                  : undefined,
              }}
            >
              {/* Shimmer effect */}
              {!prefersReducedMotion && !isLowEnd && (
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s linear infinite',
                  }}
                />
              )}

              {/* Liquid bubbles effect */}
              {!isLowEnd && percentage > 10 && (
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <m.div
                      key={`bubble-${i}`}
                      className="absolute w-1 h-1 rounded-full bg-white/40"
                      style={{
                        left: `${20 + i * 30}%`,
                        bottom: 2,
                      }}
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.4, 0.8, 0.4],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              )}
            </m.div>

            {/* Milestone markers */}
            {milestones.map((milestone) => (
              <div
                key={milestone}
                className="absolute top-0 bottom-0 w-0.5 bg-white/20"
                style={{ left: `${milestone}%` }}
              />
            ))}
          </div>

          {/* XP text */}
          {showXpText && (
            <div className={cn('flex justify-between mt-1', sizeConfig[size].text)}>
              <span className="text-neo-white font-medium">
                {displayXp.toLocaleString()} / {maxXp.toLocaleString()} XP
              </span>
              <span className={cn('font-bold', colors.text)}>
                {Math.round(percentage)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* +XP indicator */}
      <AnimatePresence>
        {showXpGain && xpGained && xpGained > 0 && (
          <m.div
            className="absolute -top-2 right-0 pointer-events-none"
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 1 }}
          >
            <span
              className={cn(
                'font-black whitespace-nowrap',
                sizeConfig[size].text,
                colors.text
              )}
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
              +{xpGained} XP
            </span>
          </m.div>
        )}
      </AnimatePresence>

      {/* Level up flash */}
      <AnimatePresence>
        {isLevelingUp && enableGlowEffects && (
          <m.div
            className="absolute inset-0 rounded-neo pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: `radial-gradient(circle, ${colors.glow}40 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Add shimmer keyframes
if (typeof document !== 'undefined') {
  const styleId = 'xp-bar-shimmer';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default XpBarAnimated;
