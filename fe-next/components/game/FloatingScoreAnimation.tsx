'use client';

import React, { useEffect, useState, useMemo, useRef, memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useReducedMotion } from '@/utils/accessibility';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface FloatingScoreAnimationProps {
  /** Score to display (triggers animation when changes to > 0) */
  score: number | null;
  /** Changes on every accepted word so equal scores still pop separately */
  popKey?: number;
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

interface Pop {
  id: number;
  score: number;
  isFireRound: boolean;
}

const POP_LIFE_MS = 600;
const POP_SHADOW = '2px 2px 0 rgb(var(--neo-black))';

/**
 * FloatingScoreAnimation - Animated score flying from word area to score display
 * Each pop has its own id so same-score words and rapid words never merge or queue.
 */
const FloatingScoreAnimation = memo<FloatingScoreAnimationProps>(({
  score,
  popKey,
  startPosition,
  endPosition,
  onAnimationComplete,
  className,
  isFireRound = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const [pops, setPops] = useState<Pop[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const onCompleteRef = useRef(onAnimationComplete);
  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  });

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

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

  // A new pop on every score or popKey change (popKey separates equal scores)
  useEffect(() => {
    if (score === null || score <= 0) return;
    const id = nextIdRef.current++;
    setPops((prev) => [...prev, { id, score, isFireRound }]);
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      setPops((prev) => prev.filter((p) => p.id !== id));
      onCompleteRef.current?.();
    }, POP_LIFE_MS);
    timersRef.current.add(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isFireRound is read at trigger time only
  }, [score, popKey]);

  if (pops.length === 0) return null;

  const pillColor = (fire: boolean) =>
    fire ? 'bg-neo-orange text-neo-black' : 'bg-neo-lime text-neo-black';
  const left = startPosition?.x ?? '50%';

  // For reduced motion or low-end devices, show a simple fade animation
  if (prefersReducedMotion || skipComplexAnimation) {
    return (
      <>
        {pops.map((pop) => (
          <AdaptiveMotion.div
            key={pop.id}
            className={`fixed z-[100] pointer-events-none ${className || ''}`}
            style={{
              left,
              top: startPosition?.y ?? '40%',
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold shadow-hard border-3 border-neo-black ${pillColor(pop.isFireRound)}`}
            >
              <span>+{pop.score}</span>
              {pop.isFireRound && <span>🔥</span>}
            </div>
          </AdaptiveMotion.div>
        ))}
      </>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden ${className || ''}`}>
      {pops.map((pop) => (
        <AdaptiveMotion.div
          key={pop.id}
          className="absolute flex items-center gap-1.5"
          style={{
            left,
            top: startPosition?.y ?? '35%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1.3, 1, 0.8],
            opacity: [0, 1, 1, 0],
            x: [0, 0, targetOffset.x * 0.3, targetOffset.x],
            y: [0, -15, targetOffset.y * 0.5, targetOffset.y],
          }}
          transition={{
            duration: POP_LIFE_MS / 1000,
            times: [0, 0.2, 0.6, 1],
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <div
            className={`px-4 py-2 rounded-full font-black text-xl shadow-hard border-3 border-neo-black ${pillColor(pop.isFireRound)}`}
            style={{ textShadow: POP_SHADOW }}
          >
            <span className="flex items-center gap-2">
              <span>+{pop.score}</span>
              {pop.isFireRound && <span>🔥</span>}
            </span>
          </div>
        </AdaptiveMotion.div>
      ))}
    </div>
  );
});

FloatingScoreAnimation.displayName = 'FloatingScoreAnimation';

export default FloatingScoreAnimation;
