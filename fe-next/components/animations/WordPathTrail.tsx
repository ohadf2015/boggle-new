'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface PathPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface WordPathTrailProps {
  /** Array of points representing the path */
  points: PathPoint[];
  /** Whether the current path forms a valid word */
  isValid?: boolean;
  /** Whether the word was just submitted */
  wasSubmitted?: boolean;
  /** Trail color (default: follows validity) */
  color?: string;
  /** Trail thickness */
  thickness?: number;
  /** Show energy particles along the trail */
  showParticles?: boolean;
  /** Show glow effect */
  showGlow?: boolean;
  /** Trail fade duration in ms */
  fadeDuration?: number;
  /** Container bounds for clipping */
  containerBounds?: DOMRect;
  /** Additional className */
  className?: string;
}

/**
 * WordPathTrail - Animated trail effect following word selection path
 *
 * Creates a glowing energy trail as the player drags across letters.
 * Changes appearance based on word validity.
 *
 * Features:
 * - Smooth SVG path animation
 * - Energy particles along the trail
 * - Glow effect (high-end devices)
 * - Validity-based color changes
 * - Flash effect on word submission
 *
 * @example
 * ```tsx
 * const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
 *
 * <WordPathTrail
 *   points={pathPoints}
 *   isValid={isWordValid}
 *   wasSubmitted={justSubmitted}
 *   showParticles
 *   showGlow
 * />
 * ```
 */
export function WordPathTrail({
  points,
  isValid = false,
  wasSubmitted = false,
  color,
  thickness = 6,
  showParticles = true,
  showGlow = true,
  fadeDuration = 300,
  containerBounds,
  className,
}: WordPathTrailProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects, enableComplexAnimations } =
    useDevicePerformance();
  const [isSubmitFlashing, setIsSubmitFlashing] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);

  // Determine trail color based on validity
  const trailColor = useMemo(() => {
    if (color) return color;
    if (wasSubmitted && isValid) return '#BFFF00'; // neo-lime for success
    if (isValid) return '#00FFFF'; // neo-cyan for valid
    return '#BFFF00'; // neo-lime default
  }, [color, isValid, wasSubmitted]);

  // Handle submit flash
  useEffect(() => {
    if (wasSubmitted && isValid) {
      setIsSubmitFlashing(true);
      const timer = setTimeout(() => setIsSubmitFlashing(false), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [wasSubmitted, isValid]);

  // Generate SVG path string from points
  const pathString = useMemo(() => {
    if (points.length < 2) return '';

    const [first, ...rest] = points;
    let path = `M ${first.x} ${first.y}`;

    // Use quadratic curves for smoother path
    for (let i = 0; i < rest.length; i++) {
      const current = rest[i];
      const prev = i === 0 ? first : rest[i - 1];

      // Control point for smoothing
      const cpX = (prev.x + current.x) / 2;
      const cpY = (prev.y + current.y) / 2;

      if (i === 0) {
        path += ` L ${current.x} ${current.y}`;
      } else {
        path += ` Q ${prev.x} ${prev.y} ${cpX} ${cpY}`;
      }
    }

    return path;
  }, [points]);

  // Skip rendering for empty paths or reduced motion
  if (points.length < 2) return null;

  if (prefersReducedMotion) {
    // Simple line for reduced motion
    return (
      <svg
        className={cn('absolute inset-0 pointer-events-none z-50', className)}
        style={{
          width: containerBounds?.width ?? '100%',
          height: containerBounds?.height ?? '100%',
        }}
      >
        <path
          d={pathString}
          fill="none"
          stroke={trailColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      </svg>
    );
  }

  const shouldShowGlow = showGlow && enableGlowEffects && !isLowEnd;
  const shouldShowParticles = showParticles && enableComplexAnimations && !isLowEnd;

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none z-50 overflow-hidden', className)}
      style={{
        width: containerBounds?.width ?? '100%',
        height: containerBounds?.height ?? '100%',
      }}
    >
      <svg className="absolute inset-0 w-full h-full">
        {/* Glow filter */}
        {shouldShowGlow && (
          <defs>
            <filter id="trail-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor={trailColor} floodOpacity="0.7" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        )}

        {/* Main trail path */}
        <m.path
          ref={pathRef}
          d={pathString}
          fill="none"
          stroke={trailColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={shouldShowGlow ? 'url(#trail-glow)' : undefined}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: 1,
            opacity: isSubmitFlashing ? [1, 0.5, 1] : 0.9,
            strokeWidth: isSubmitFlashing ? [thickness, thickness * 2, thickness] : thickness,
          }}
          transition={{
            pathLength: { duration: 0.15, ease: 'easeOut' },
            opacity: isSubmitFlashing ? { duration: 0.4 } : { duration: 0.1 },
            strokeWidth: isSubmitFlashing ? { duration: 0.4 } : { duration: 0.1 },
          }}
        />

        {/* Secondary trail for depth */}
        {!isLowEnd && (
          <m.path
            d={pathString}
            fill="none"
            stroke="white"
            strokeWidth={thickness / 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          />
        )}
      </svg>

      {/* Energy particles along path */}
      {shouldShowParticles && points.length > 1 && (
        <AnimatePresence>
          {points.slice(-3).map((point, index) => (
            <m.div
              key={`particle-${point.timestamp}-${index}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: point.x,
                top: point.y,
                backgroundColor: trailColor,
                boxShadow: `0 0 8px ${trailColor}`,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Submit flash effect */}
      <AnimatePresence>
        {isSubmitFlashing && shouldShowGlow && (
          <m.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: `radial-gradient(circle at center, ${trailColor}40 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default WordPathTrail;
