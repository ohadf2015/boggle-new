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
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
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

  // Clamp position to keep popup within visible viewport area.
  // Uses window dimensions with safe-area fallback so popups never render off-screen.
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 375;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 667;
  const POPUP_W = 120; // approximate rendered width
  const POPUP_H = 48;  // approximate rendered height
  const clampedX = Math.max(0, Math.min(position.x, viewportW - POPUP_W));
  const clampedY = Math.max(0, Math.min(position.y, viewportH - POPUP_H));
  const clampedPosition = { x: clampedX, y: clampedY };

  // Default target: arc upward and toward the score counter (top-left).
  // This creates a visual connection between action and reward (AAA game standard).
  const target = targetPosition || {
    x: clampedPosition.x - 30,
    y: Math.max(8, clampedPosition.y - 70),
  };

  // Call onComplete when animation finishes
  useEffect(() => {
    const duration = prefersReducedMotion ? 200 : 550;
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, onComplete]);

  // Reduced motion variant - simple fade
  if (prefersReducedMotion) {
    return (
      <AdaptiveMotion.div
        className="fixed z-50 pointer-events-none"
        data-testid="score-popup-fly"
        style={{
          left: clampedPosition.x,
          top: clampedPosition.y,
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-neo-yellow text-neo-black font-neo-display font-black text-2xl px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard whitespace-nowrap">
          +{score}
          {comboMultiplier && (
            <span className="ms-2 text-lg opacity-80">×{comboMultiplier}</span>
          )}
        </div>
      </AdaptiveMotion.div>
    );
  }

  // Full animation variant - arc trajectory
  // Calculate arc midpoint (rise 50px, curve toward target)
  const arcMidX = clampedPosition.x + (target.x - clampedPosition.x) * 0.5;
  const arcMidY = Math.min(clampedPosition.y, target.y) - 50;

  return (
    <AdaptiveMotion.div
      className="fixed z-50 pointer-events-none"
      data-testid="score-popup-fly"
      style={{
        left: clampedPosition.x,
        top: clampedPosition.y,
      }}
      initial={{
        x: 0,
        y: 0,
        scale: 0.5,
        opacity: 0,
      }}
      animate={{
        x: [0, arcMidX - clampedPosition.x, target.x - clampedPosition.x],
        y: [0, arcMidY - clampedPosition.y, target.y - clampedPosition.y],
        scale: [0.5, 1.15, 0.9],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 0.55,
        times: [0, 0.3, 1],
        ease: 'easeOut',
      }}
    >
      <div className="bg-neo-yellow text-neo-black font-neo-display font-black text-2xl px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard whitespace-nowrap">
        +{score}
        {comboMultiplier && (
          <span className="ms-2 text-lg opacity-80">×{comboMultiplier}</span>
        )}
      </div>
    </AdaptiveMotion.div>
  );
}
