'use client';

import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/utils/accessibility';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface CoinParticle {
  id: number;
  delay: number;
  offsetX: number;
  offsetY: number;
}

interface FloatingCoinAnimationProps {
  /** Number of coins to display (triggers animation when changes to > 0) */
  coinAmount: number | null;
  /** Position to start from (default: center of viewport) */
  startPosition?: { x: number; y: number };
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Custom class for positioning */
  className?: string;
}

/**
 * FloatingCoinAnimation - Animated coins flying from source to top-right corner
 * Used for combo milestone rewards to show coins being earned
 */
const FloatingCoinAnimation = memo<FloatingCoinAnimationProps>(({
  coinAmount,
  startPosition,
  onAnimationComplete,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const [showAnimation, setShowAnimation] = useState(false);
  const [displayAmount, setDisplayAmount] = useState<number | null>(null);
  const [particles, setParticles] = useState<CoinParticle[]>([]);

  // Find coin counter element and compute target position for fly-to animation
  const targetPosition = useMemo(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const startX = typeof startPosition?.x === 'number' ? startPosition.x : window.innerWidth / 2;
    const startY = typeof startPosition?.y === 'number' ? startPosition.y : window.innerHeight * 0.35;

    // Try to find the coin counter badge via data attribute
    const coinTarget = document.querySelector('[data-coin-target]');
    if (coinTarget) {
      const rect = coinTarget.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - startX,
        y: rect.top + rect.height / 2 - startY,
      };
    }

    // Fallback: top-left area where coin badge typically is
    return {
      x: 60 - startX,
      y: 100 - startY,
    };
  }, [startPosition]);

  // Skip complex animation on low-end devices
  const skipComplexAnimation = isLowEnd || !enableComplexAnimations;

  // Generate coin particles based on amount (max 8 for performance)
  const generateParticles = useCallback((amount: number): CoinParticle[] => {
    const count = Math.min(Math.max(3, Math.ceil(amount / 3)), 8);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: i * 0.08,
      offsetX: (Math.random() - 0.5) * 40,
      offsetY: (Math.random() - 0.5) * 30,
    }));
  }, []);

  // Pulse the coin counter badge when coins land
  const pulseCoinTarget = useCallback(() => {
    const coinTarget = document.querySelector('[data-coin-target]');
    if (coinTarget instanceof HTMLElement) {
      coinTarget.style.transition = 'transform 0.15s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      coinTarget.style.transform = 'scale(1.2) rotate(-1deg)';
      coinTarget.style.boxShadow = '0 0 12px rgba(251, 191, 36, 0.6), 4px 4px 0px black';
      setTimeout(() => {
        coinTarget.style.transform = '';
        coinTarget.style.boxShadow = '';
        setTimeout(() => {
          coinTarget.style.transition = '';
        }, 150);
      }, 300);
    }
  }, []);

  // Trigger animation when coinAmount changes to a positive value
  useEffect(() => {
    if (coinAmount !== null && coinAmount > 0) {
      setDisplayAmount(coinAmount);
      setParticles(generateParticles(coinAmount));
      setShowAnimation(true);

      // Pulse the coin counter when coins land (timed with particle arrival)
      const pulseTimer = setTimeout(pulseCoinTarget, 900);

      // Auto-dismiss after animation completes
      const timer = setTimeout(() => {
        setShowAnimation(false);
        onAnimationComplete?.();
      }, 1500);

      return () => {
        clearTimeout(timer);
        clearTimeout(pulseTimer);
      };
    }
    return undefined;
  }, [coinAmount, generateParticles, onAnimationComplete, pulseCoinTarget]);

  if (!showAnimation || displayAmount === null || displayAmount <= 0) {
    return null;
  }

  // For reduced motion or low-end devices, show a simple fade animation
  if (prefersReducedMotion || skipComplexAnimation) {
    return (
      <m.div
        className={`fixed z-[100] pointer-events-none ${className || ''}`}
        style={{
          left: startPosition?.x ?? '50%',
          top: startPosition?.y ?? '40%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1, y: -20 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-linear-to-r from-yellow-400 to-orange-400 text-white font-bold shadow-lg">
          <span>💰</span>
          <span>+{displayAmount}</span>
        </div>
      </m.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <div
        className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden ${className || ''}`}
      >
        {/* Central coin burst with amount */}
        <m.div
          className="absolute flex items-center gap-1.5"
          style={{
            left: startPosition?.x ?? '50%',
            top: startPosition?.y ?? '35%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.3, 1],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.2,
            times: [0, 0.2, 0.5, 1],
            ease: 'easeOut',
          }}
        >
          <m.div
            className="px-4 py-2 rounded-full bg-linear-to-r from-yellow-400 via-amber-400 to-orange-400 text-white font-black text-xl shadow-xl border-2 border-yellow-200"
            style={{
              filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))',
            }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(251, 191, 36, 0.4)',
                '0 0 0 15px rgba(251, 191, 36, 0)',
              ],
            }}
            transition={{
              duration: 0.6,
              repeat: 1,
            }}
          >
            <span className="flex items-center gap-2">
              <m.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5 }}
              >
                💰
              </m.span>
              <span>+{displayAmount}</span>
            </span>
          </m.div>
        </m.div>

        {/* Flying coin particles - using pre-computed positions to avoid calc() jank */}
        {particles.map((particle) => (
          <m.div
            key={`coin-${particle.id}`}
            className="absolute w-6 h-6 text-2xl will-change-transform"
            style={{
              left: startPosition?.x ?? '50%',
              top: startPosition?.y ?? '35%',
            }}
            initial={{
              x: particle.offsetX,
              y: particle.offsetY,
              scale: 0,
              opacity: 0,
            }}
            animate={{
              x: [
                particle.offsetX,
                particle.offsetX + (particle.id % 2 === 0 ? 30 : -30),
                targetPosition.x,
              ],
              y: [
                particle.offsetY,
                particle.offsetY - 50,
                targetPosition.y,
              ],
              scale: [0, 1.2, 1, 0.6],
              opacity: [0, 1, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.0, // Slightly faster for snappier feel
              delay: particle.delay,
              ease: [0.25, 0.1, 0.25, 1],
              times: [0, 0.15, 0.85, 1],
            }}
          >
            🪙
          </m.div>
        ))}

        {/* Sparkle effects */}
        {[...Array(6)].map((_, i) => (
          <m.div
            key={`sparkle-${i}`}
            className="absolute w-2 h-2 rounded-full bg-yellow-300"
            style={{
              left: startPosition?.x ?? '50%',
              top: startPosition?.y ?? '35%',
              filter: 'blur(1px)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos((i * 60) * (Math.PI / 180)) * 60,
              y: Math.sin((i * 60) * (Math.PI / 180)) * 60,
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              delay: 0.1 + i * 0.05,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>
    </AnimatePresence>
  );
});

FloatingCoinAnimation.displayName = 'FloatingCoinAnimation';

export default FloatingCoinAnimation;
