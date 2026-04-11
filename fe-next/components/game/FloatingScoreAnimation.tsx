'use client';

import React, { useEffect, useState, useMemo, memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useReducedMotion } from '@/utils/accessibility';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Pre-allocated index arrays — prevents [...Array(N)] allocation on every render
const SPARKLE_INDICES = [0, 1, 2, 3, 4, 5] as const;
const TRAIL_INDICES = [0, 1, 2] as const;

interface FloatingScoreAnimationProps {
  /** Score to display (triggers animation when changes to > 0) */
  score: number | null;
  /** Position to start from (default: center of viewport) */
  startPosition?: { x: number; y: number };
  /** Position to end at (default: top-right for score display) */
  endPosition?: { x: number; y: number };
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Custom class for positioning */
  className?: string;
  /** Whether this is a fire round bonus */
  isFireRound?: boolean;
}

/**
 * FloatingScoreAnimation - Animated score flying from word area to score display
 * Used to show points being earned with satisfying visual feedback
 */
const FloatingScoreAnimation = memo<FloatingScoreAnimationProps>(({
  score,
  startPosition,
  endPosition,
  onAnimationComplete,
  className,
  isFireRound = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const [showAnimation, setShowAnimation] = useState(false);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  // Pre-compute target position to avoid calc() in animation (causes jank)
  const targetOffset = useMemo(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const startX = typeof startPosition?.x === 'number' ? startPosition.x : window.innerWidth / 2;
    const startY = typeof startPosition?.y === 'number' ? startPosition.y : window.innerHeight * 0.35;

    // Target: top-right corner where score display is (or custom end position)
    const targetX = endPosition?.x ?? (window.innerWidth - 100);
    const targetY = endPosition?.y ?? 80;

    return {
      x: targetX - startX,
      y: targetY - startY,
    };
  }, [startPosition, endPosition]);

  // Skip complex animation on low-end devices
  const skipComplexAnimation = isLowEnd || !enableComplexAnimations;

  // Trigger animation when score changes to a positive value
  useEffect(() => {
    if (score !== null && score > 0) {
      setDisplayScore(score);
      setAnimationKey((prev) => prev + 1);
      setShowAnimation(true);

      // Auto-dismiss after animation completes
      const timer = setTimeout(() => {
        setShowAnimation(false);
        onAnimationComplete?.();
      }, 1200);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [score, onAnimationComplete]);

  if (!showAnimation || displayScore === null || displayScore <= 0) {
    return null;
  }

  // For reduced motion or low-end devices, show a simple fade animation
  if (prefersReducedMotion || skipComplexAnimation) {
    return (
      <AdaptiveMotion.div
        key={animationKey}
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
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold shadow-lg ${
            isFireRound
              ? 'bg-linear-to-r from-orange-500 to-red-500 text-white'
              : 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black'
          }`}
        >
          <span>+{displayScore}</span>
          {isFireRound && <span>🔥</span>}
        </div>
      </AdaptiveMotion.div>
    );
  }

  return (
    <AdaptiveAnimatePresence mode="wait">
      <div
        key={animationKey}
        className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden ${className || ''}`}
      >
        {/* Main floating score */}
        <AdaptiveMotion.div
          className="absolute flex items-center gap-1.5"
          style={{
            left: startPosition?.x ?? '50%',
            top: startPosition?.y ?? '35%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{
            scale: 0,
            opacity: 0,
            x: 0,
            y: 0,
          }}
          animate={{
            scale: [0, 1.4, 1, 0.8],
            opacity: [0, 1, 1, 0],
            x: [0, 0, targetOffset.x * 0.3, targetOffset.x],
            y: [0, -15, targetOffset.y * 0.5, targetOffset.y],
          }}
          transition={{
            duration: 1.0,
            times: [0, 0.2, 0.6, 1],
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <AdaptiveMotion.div
            className={`px-4 py-2 rounded-full font-black text-xl shadow-xl border-3 border-neo-black ${
              isFireRound
                ? 'bg-linear-to-r from-orange-400 via-red-400 to-orange-400 text-white'
                : 'bg-linear-to-r from-neo-lime via-neo-cyan to-neo-lime text-neo-black'
            }`}
            style={{
              filter: isFireRound
                ? 'drop-shadow(0 0 12px rgba(251, 146, 60, 0.6))'
                : 'drop-shadow(0 0 12px rgba(191, 255, 0, 0.6))',
            }}
            animate={{
              boxShadow: isFireRound
                ? [
                    '0 0 0 0 rgba(251, 146, 60, 0.4)',
                    '0 0 0 12px rgba(251, 146, 60, 0)',
                  ]
                : [
                    '0 0 0 0 rgba(191, 255, 0, 0.4)',
                    '0 0 0 12px rgba(191, 255, 0, 0)',
                  ],
            }}
            transition={{
              duration: 0.5,
            }}
          >
            <span className="flex items-center gap-2">
              <AdaptiveMotion.span
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.3 }}
              >
                +{displayScore}
              </AdaptiveMotion.span>
              {isFireRound && (
                <AdaptiveMotion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ type: 'tween', duration: 0.3, repeat: 2 }}
                >
                  🔥
                </AdaptiveMotion.span>
              )}
            </span>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>

        {/* Sparkle burst at start position — static array to avoid allocation per render */}
        {SPARKLE_INDICES.map((i) => (
          <AdaptiveMotion.div
            key={`sparkle-${i}`}
            className={`absolute w-2 h-2 rounded-full ${
              isFireRound ? 'bg-orange-400' : 'bg-neo-lime'
            }`}
            style={{
              left: startPosition?.x ?? '50%',
              top: startPosition?.y ?? '35%',
              filter: 'blur(1px)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos((i * 60) * (Math.PI / 180)) * 50,
              y: Math.sin((i * 60) * (Math.PI / 180)) * 50,
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.5,
              delay: 0.1 + i * 0.03,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Plus particles trailing behind — static array to avoid allocation per render */}
        {TRAIL_INDICES.map((i) => (
          <AdaptiveMotion.div
            key={`trail-${i}`}
            className={`absolute text-lg font-bold ${
              isFireRound ? 'text-orange-400' : 'text-neo-lime'
            }`}
            style={{
              left: startPosition?.x ?? '50%',
              top: startPosition?.y ?? '35%',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              x: [0, targetOffset.x * (0.2 + i * 0.2)],
              y: [0, targetOffset.y * (0.2 + i * 0.2)],
              scale: [0, 1, 0],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 0.6,
              delay: 0.2 + i * 0.1,
              ease: 'easeOut',
            }}
          >
            +
          </AdaptiveMotion.div>
        ))}
      </div>
    </AdaptiveAnimatePresence>
  );
});

FloatingScoreAnimation.displayName = 'FloatingScoreAnimation';

export default FloatingScoreAnimation;
