'use client';

import React, { useEffect, useState, useRef, useCallback, forwardRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface CoinCounterAnimatedProps {
  /** Current coin value */
  value: number;
  /** Previous value (for calculating change) */
  previousValue?: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show animation on mount */
  animateOnMount?: boolean;
  /** Duration of count animation in ms */
  countDuration?: number;
  /** Show impact pulse when coins are added */
  showImpact?: boolean;
  /** Show +X indicator when coins added */
  showAddedIndicator?: boolean;
  /** Callback when count animation completes */
  onCountComplete?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * CoinCounterAnimated - Animated coin balance display with rolling numbers
 *
 * Features:
 * - Rolling number animation when value changes
 * - Impact pulse effect when coins are added
 * - "+X" indicator floating up when coins added
 * - Shimmer shine effect
 * - Performance-optimized for all devices
 *
 * Add `data-coin-counter="true"` attribute so GlobalCoinEarnFx can target it.
 */
export const CoinCounterAnimated = forwardRef<HTMLDivElement, CoinCounterAnimatedProps>(
  function CoinCounterAnimated(
    {
      value,
      previousValue,
      size = 'md',
      animateOnMount = true,
      countDuration = 800,
      showImpact = true,
      showAddedIndicator = true,
      onCountComplete,
      className,
    },
    ref
  ) {
    const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
    const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
    const [isAnimating, setIsAnimating] = useState(false);
    const [addedAmount, setAddedAmount] = useState<number | null>(null);
    const [showPulse, setShowPulse] = useState(false);
    const prevValueRef = useRef(previousValue ?? value);
    const animationRef = useRef<number | null>(null);

    // Animate count when value changes
    const animateCount = useCallback(
      (from: number, to: number) => {
        if (prefersReducedMotion || from === to) {
          setDisplayValue(to);
          onCountComplete?.();
          return;
        }

        const startTime = performance.now();
        const diff = to - from;

        // Calculate added amount for indicator
        if (diff > 0 && showAddedIndicator) {
          setAddedAmount(diff);
          setTimeout(() => setAddedAmount(null), 1500);
        }

        // Show pulse effect
        if (showImpact && diff > 0) {
          setShowPulse(true);
          setTimeout(() => setShowPulse(false), 400);
        }

        setIsAnimating(true);

        const tick = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / countDuration, 1);

          // Ease-out for satisfying feel
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          const currentValue = Math.round(from + diff * easeProgress);

          setDisplayValue(currentValue);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(tick);
          } else {
            setDisplayValue(to);
            setIsAnimating(false);
            onCountComplete?.();
          }
        };

        animationRef.current = requestAnimationFrame(tick);
      },
      [countDuration, prefersReducedMotion, showAddedIndicator, showImpact, onCountComplete]
    );

    // Watch for value changes
    useEffect(() => {
      if (value !== prevValueRef.current) {
        animateCount(prevValueRef.current, value);
        prevValueRef.current = value;
      }
    }, [value, animateCount]);

    // Cleanup animation on unmount
    useEffect(() => {
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    // Size configurations
    const sizeConfig = {
      xs: {
        container: 'px-1.5 py-0.5 text-xs gap-1',
        icon: 'w-3 h-3',
      },
      sm: {
        container: 'px-2.5 py-1 text-sm gap-1.5',
        icon: 'w-4 h-4',
      },
      md: {
        container: 'px-3.5 py-2 text-base gap-2',
        icon: 'w-5 h-5',
      },
      lg: {
        container: 'px-5 py-3 text-lg gap-2.5',
        icon: 'w-6 h-6',
      },
    };

    return (
      <div ref={ref} className={cn('relative inline-block', className)}>
        {/* Impact pulse ring */}
        <AnimatePresence>
          {showPulse && enableGlowEffects && !isLowEnd && (
            <m.div
              className="absolute inset-0 rounded-neo-lg border-2 border-neo-lime"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Main coin badge */}
        <m.div
          className={cn(
            'relative inline-flex items-center font-bold rounded-neo-lg overflow-hidden',
            'border-3 border-neo-black shadow-hard',
            'bg-linear-to-br from-amber-300 via-yellow-400 to-amber-500',
            sizeConfig[size].container
          )}
          animate={
            showPulse
              ? {
                  scale: [1, 1.05, 1],
                  boxShadow: enableGlowEffects
                    ? [
                        '4px 4px 0 black',
                        '4px 4px 0 black, 0 0 20px rgba(255,225,53,0.5)',
                        '4px 4px 0 black',
                      ]
                    : undefined,
                }
              : undefined
          }
          transition={{ duration: 0.3 }}
          role="status"
          aria-label={`Coin balance: ${value.toLocaleString()}`}
        >
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />

          {/* Inner glow */}
          <div className="absolute inset-0 rounded-neo-lg opacity-30 pointer-events-none bg-linear-to-t from-transparent via-white/20 to-white/40" />

          {/* Coin icon with wobble */}
          <m.div
            animate={
              isAnimating
                ? { rotate: [0, -10, 10, -5, 5, 0] }
                : { rotate: [0, -5, 5, 0] }
            }
            transition={
              isAnimating
                ? { duration: 0.3, repeat: Math.floor(countDuration / 300) }
                : { duration: 2, repeat: Infinity, repeatDelay: 3 }
            }
            className="relative z-10"
          >
            <Coins
              className={cn(sizeConfig[size].icon, 'text-amber-700 drop-shadow-xs')}
              strokeWidth={2.5}
            />
          </m.div>

          {/* Animated counter */}
          <span
            className={cn(
              'relative z-10 font-black tracking-tight tabular-nums',
              'text-amber-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]'
            )}
          >
            {displayValue.toLocaleString()}
          </span>

          {/* Bottom highlight */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-linear-to-r from-amber-600/50 via-amber-500/30 to-amber-600/50" />
        </m.div>

        {/* Added amount indicator */}
        <AnimatePresence>
          {addedAmount !== null && addedAmount > 0 && (
            <m.div
              className="absolute -top-2 left-1/2 pointer-events-none"
              initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.8 }}
              animate={{ opacity: 1, y: -30, scale: 1 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <span className="font-black text-neo-lime text-sm whitespace-nowrap drop-shadow-[0_2px_0_black]">
                +{addedAmount}
              </span>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

// Add shimmer keyframes
if (typeof document !== 'undefined') {
  const styleId = 'coin-counter-animated-shimmer';
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

export default CoinCounterAnimated;
