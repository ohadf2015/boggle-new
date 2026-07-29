'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
  bonus?: string;
}

interface ScorePopupFlyProps {
  /** Score popup data */
  popup: ScorePopup | null;
  /** Target element ref for the score counter */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Fallback target position */
  targetPosition?: { x: number; y: number };
  /** Whether the popup should fly to target (vs just fade) */
  flyToTarget?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Animation duration in ms */
  duration?: number;
  /** Show the word that was found */
  showWord?: boolean;
  /** Size of the popup */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * ScorePopupFly - Animated score popup that flies to the score counter
 *
 * Shows the points earned with an optional word display,
 * then animates toward the score display area.
 *
 * Features:
 * - Scale-in entrance animation
 * - Arc trajectory to target
 * - Bonus indicator support
 * - Word display option
 * - Performance-adaptive
 *
 * @example
 * ```tsx
 * const [scorePopup, setScorePopup] = useState<ScorePopup | null>(null);
 *
 * // When word is found:
 * setScorePopup({
 *   id: Date.now(),
 *   value: 15,
 *   x: wordCenterX,
 *   y: wordCenterY,
 *   word: 'HELLO',
 *   bonus: '2x',
 * });
 *
 * <ScorePopupFly
 *   popup={scorePopup}
 *   targetRef={scoreDisplayRef}
 *   flyToTarget
 *   showWord
 *   onComplete={() => setScorePopup(null)}
 * />
 * ```
 */
export function ScorePopupFly({
  popup,
  targetRef,
  targetPosition: fallbackTarget,
  flyToTarget = true,
  onComplete,
  duration = 1000,
  showWord = false,
  size = 'md',
  className,
}: ScorePopupFlyProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate target position from ref
  useEffect(() => {
    if (targetRef?.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setTargetPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    } else if (fallbackTarget) {
      setTargetPos(fallbackTarget);
    } else {
      // Default: top-center score area
      setTargetPos({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
        y: 60,
      });
    }
  }, [targetRef, fallbackTarget]);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'px-2 py-1 text-sm',
      word: 'text-xs',
      bonus: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5 text-lg',
      word: 'text-sm',
      bonus: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2 text-2xl',
      word: 'text-base',
      bonus: 'text-base',
    },
  };

  // Skip for reduced motion
  if (prefersReducedMotion && popup) {
    return (
      <div
        className={cn('fixed pointer-events-none z-150', className)}
        style={{ left: popup.x, top: popup.y, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className={cn(
            'rounded-neo border-3 border-neo-black shadow-hard bg-neo-lime',
            sizeConfig[size].container
          )}
        >
          <span className="font-black text-neo-black">+{popup.value}</span>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={onComplete}>
      {popup && targetPos && (
        <m.div
          key={popup.id}
          className={cn('fixed pointer-events-none z-150', className)}
          data-testid="score-popup-fly"
          style={{ left: popup.x, top: popup.y }}
          initial={{
            x: '-50%',
            y: '-50%',
            scale: 0,
            opacity: 0,
          }}
          animate={
            flyToTarget
              ? {
                  x: ['-50%', '-50%', `${targetPos.x - popup.x - 20}px`],
                  y: ['-50%', '-70%', `${targetPos.y - popup.y}px`],
                  scale: [0, 1.3, 1, 0.6],
                  opacity: [0, 1, 1, 0],
                }
              : {
                  x: '-50%',
                  y: ['-50%', '-100%'],
                  scale: [0, 1.2, 1],
                  opacity: [0, 1, 1, 0],
                }
          }
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{
            duration: duration / 1000,
            times: flyToTarget ? [0, 0.2, 0.7, 1] : [0, 0.3, 0.5, 1],
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            {/* Word display */}
            {showWord && popup.word && (
              <m.div
                className={cn(
                  'font-bold text-neo-white uppercase tracking-wide',
                  sizeConfig[size].word
                )}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                {popup.word}
              </m.div>
            )}

            {/* Score badge */}
            <m.div
              className={cn(
                'rounded-neo border-3 border-neo-black shadow-hard',
                'bg-linear-to-r from-neo-lime to-emerald-400',
                sizeConfig[size].container
              )}
              animate={
                enableGlowEffects && !isLowEnd
                  ? {
                      boxShadow: [
                        '4px 4px 0 black',
                        '4px 4px 0 black, 0 0 20px rgba(191,255,0,0.6)',
                        '4px 4px 0 black',
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 0.4 }}
            >
              <span className="font-black text-neo-black flex items-center gap-1">
                +{popup.value}
                {popup.bonus && (
                  <span
                    className={cn(
                      'text-neo-orange font-black',
                      sizeConfig[size].bonus
                    )}
                  >
                    {popup.bonus}
                  </span>
                )}
              </span>
            </m.div>
          </div>

          {/* Sparkle particles */}
          {enableGlowEffects && !isLowEnd && (
            <>
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <m.div
                  key={`sparkle-${i}`}
                  className="absolute w-1.5 h-1.5 bg-neo-lime rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    marginLeft: -3,
                    marginTop: -3,
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((angle * Math.PI) / 180) * 30,
                    y: Math.sin((angle * Math.PI) / 180) * 30,
                    scale: [0, 1, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1 + i * 0.02,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default ScorePopupFly;
