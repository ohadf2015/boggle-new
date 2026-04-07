/**
 * Tile Warning Overlay
 *
 * Renders a pulsing red glow overlay on a tile being targeted by a boss attack.
 * Intensity increases as progress approaches 100%.
 *
 * Accessibility:
 * - Respects prefers-reduced-motion for users with motion sensitivity
 * - Falls back to static border indicator in reduced motion mode
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <TileWarningOverlay progress={0.5} isActive={true} />
 *   <TileContent />
 * </div>
 * ```
 */

'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

// ==============================================
// TYPES
// ==============================================

export interface TileWarningOverlayProps {
  /** Progress of telegraph (0-1) */
  progress: number;
  /** Whether the warning is active */
  isActive: boolean;
  /** Optional class name for styling */
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * TileWarningOverlay - Visual warning indicator for targeted tiles
 *
 * Displays a pulsing red glow that intensifies as the attack countdown progresses.
 * The effect scales with progress:
 * - Opacity: 30% -> 80%
 * - Scale: 100% -> 115%
 * - Glow: 10px -> 30px
 */
export function TileWarningOverlay({
  progress,
  isActive,
  className = '',
}: TileWarningOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!isActive) {
    return null;
  }

  // Intensity increases with progress
  const opacity = 0.3 + progress * 0.5; // 0.3 -> 0.8
  const scale = 1 + progress * 0.15; // 1 -> 1.15
  const glowIntensity = 10 + progress * 20; // 10px -> 30px

  // Reduced motion: use static styles instead of animations
  if (prefersReducedMotion) {
    return (
      <div
        className={`absolute inset-0 pointer-events-none z-10 ${className}`}
        style={{
          borderRadius: 'inherit',
          boxShadow: 'inset 0 0 0 3px rgba(239, 68, 68, 0.8)',
          opacity,
        }}
        data-testid="tile-warning-overlay"
      >
        {/* Static border indicator for reduced motion */}
        <div
          className="absolute inset-0 border-3 border-red-500"
          style={{ borderRadius: 'inherit' }}
        />
      </div>
    );
  }

  return (
    <AdaptiveMotion.div
      className={`absolute inset-0 pointer-events-none z-10 ${className}`}
      initial={{ opacity: 0, scale: 1 }}
      animate={{ opacity: 1, scale }}
      exit={{ opacity: 0, scale: 1 }}
      transition={{
        repeat: Infinity,
        repeatType: 'reverse',
        duration: 0.3,
      }}
      data-testid="tile-warning-overlay"
      style={{
        borderRadius: 'inherit',
        boxShadow: `inset 0 0 ${glowIntensity}px rgba(239, 68, 68, ${opacity})`,
      }}
    >
      {/* Pulsing inner effect */}
      <AdaptiveMotion.div
        className="absolute inset-0 bg-red-500/20"
        style={{ borderRadius: 'inherit' }}
        animate={{
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.5,
          ease: 'easeInOut',
        }}
      />
    </AdaptiveMotion.div>
  );
}
