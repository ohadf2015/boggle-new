/**
 * ScorePopup - Floating score animation with arc trajectory
 *
 * Displays score earned from word finds with satisfying arc animation.
 * Follows neo-brutalist design with hard shadows and bold colors.
 *
 * Features:
 * - Arc trajectory using quadratic bezier (parabola)
 * - Scale up on spawn, fade out at end
 * - Combo multiplier display (e.g., "×1.5")
 * - Reduced motion: instant fade instead of arc
 * - Neo-brutalist styling (bold font, hard shadows)
 *
 * Usage:
 * <ScorePopup
 *   score={100}
 *   position={{ x: 200, y: 300 }}
 *   targetPosition={{ x: 50, y: 50 }}
 *   comboMultiplier={1.5}
 *   onComplete={() => console.log('Animation done')}
 * />
 */

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export interface ScorePopupProps {
  /** Score value to display */
  score: number;
  /** Starting position (pixels from top-left) */
  position: { x: number; y: number };
  /** Target position for arc destination (defaults to 50px above start) */
  targetPosition?: { x: number; y: number };
  /** Combo multiplier to show (e.g., 1.5 for "×1.5") */
  comboMultiplier?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * ScorePopup component
 *
 * Renders floating score with arc animation.
 * Automatically calls onComplete after animation finishes.
 */
export function ScorePopup({
  score,
  position,
  targetPosition,
  comboMultiplier,
  onComplete,
}: ScorePopupProps) {
  const { prefersReducedMotion } = useDevicePerformance();

  // Calculate default target if not provided (50px above, same x)
  const target = targetPosition || {
    x: position.x,
    y: position.y - 50,
  };

  // Call onComplete when animation finishes
  useEffect(() => {
    const duration = prefersReducedMotion ? 300 : 800;
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, onComplete]);

  // Reduced motion variant - simple fade
  if (prefersReducedMotion) {
    return (
      <motion.div
        className="fixed z-50 pointer-events-none"
        style={{
          left: position.x,
          top: position.y,
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-neo-yellow text-neo-black font-neo-display font-black text-2xl px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard whitespace-nowrap">
          +{score}
          {comboMultiplier && (
            <span className="ml-2 text-lg opacity-80">×{comboMultiplier}</span>
          )}
        </div>
      </motion.div>
    );
  }

  // Full animation variant - arc trajectory
  // Calculate arc midpoint (rise 50px, curve toward target)
  const arcMidX = position.x + (target.x - position.x) * 0.5;
  const arcMidY = Math.min(position.y, target.y) - 50;

  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
      }}
      initial={{
        x: 0,
        y: 0,
        scale: 0.8,
        opacity: 0,
      }}
      animate={{
        x: [0, arcMidX - position.x, target.x - position.x],
        y: [0, arcMidY - position.y, target.y - position.y],
        scale: [0.8, 1.2, 1],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 0.8,
        times: [0, 0.3, 1],
        ease: 'easeOut',
      }}
    >
      <div className="bg-neo-yellow text-neo-black font-neo-display font-black text-2xl px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard whitespace-nowrap">
        +{score}
        {comboMultiplier && (
          <span className="ml-2 text-lg opacity-80">×{comboMultiplier}</span>
        )}
      </div>
    </motion.div>
  );
}
