'use client';

import React, { useEffect, useState, memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface RingInstance {
  id: number;
  color: string;
  thickness: number;
  delay: number;
}

interface ComboPulseRingProps {
  /** Trigger key - change this to trigger a new pulse */
  triggerKey: number | string;
  /** Position of the ring center */
  position: { x: number; y: number };
  /** Ring color (default: neo-yellow) */
  color?: string;
  /** Number of concentric rings */
  ringCount?: number;
  /** Maximum spread radius */
  maxRadius?: number;
  /** Animation duration in ms */
  duration?: number;
  /** Starting ring size */
  initialSize?: number;
  /** Ring thickness */
  thickness?: number;
  /** Intensity level affects color and ring count */
  intensity?: 'low' | 'medium' | 'high' | 'max';
  /** Additional className */
  className?: string;
}

const INTENSITY_CONFIG = {
  low: { colors: ['#00FFFF'], ringCount: 1, maxRadius: 60 },
  medium: { colors: ['#FFE135', '#00FFFF'], ringCount: 2, maxRadius: 80 },
  high: { colors: ['#FF6B35', '#FFE135', '#00FFFF'], ringCount: 3, maxRadius: 100 },
  max: { colors: ['#FF1493', '#FF6B35', '#FFE135'], ringCount: 4, maxRadius: 120 },
};

/**
 * ComboPulseRing - Expanding ring effect for combo feedback
 *
 * Creates an expanding concentric ring effect that radiates
 * outward from the center point. Used for combo increment feedback.
 *
 * @example
 * ```tsx
 * const [pulseKey, setPulseKey] = useState(0);
 *
 * const handleComboIncrease = () => {
 *   setPulseKey(Date.now());
 * };
 *
 * <ComboPulseRing
 *   triggerKey={pulseKey}
 *   position={{ x: centerX, y: centerY }}
 *   intensity="high"
 * />
 * ```
 */
export const ComboPulseRing = memo(function ComboPulseRing({
  triggerKey,
  position,
  color,
  ringCount,
  maxRadius,
  duration = 600,
  initialSize = 20,
  thickness = 3,
  intensity = 'medium',
  className,
}: ComboPulseRingProps) {
  const { isLowEnd, prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const [rings, setRings] = useState<RingInstance[]>([]);

  const config = INTENSITY_CONFIG[intensity];
  const actualRingCount = ringCount ?? config.ringCount;
  const actualMaxRadius = maxRadius ?? config.maxRadius;
  const colors = useMemo(() => color ? [color] : config.colors, [color, config.colors]);

  // Generate rings on trigger
  useEffect(() => {
    if (!enableComplexAnimations || prefersReducedMotion) return;

    const count = isLowEnd ? Math.min(actualRingCount, 2) : actualRingCount;
    const newRings: RingInstance[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      color: colors[i % colors.length],
      thickness: thickness - i * 0.5,
      delay: i * 0.08,
    }));

    setRings(newRings);

    const timer = setTimeout(() => {
      setRings([]);
    }, duration + 200);

    return () => clearTimeout(timer);
  }, [
    triggerKey,
    actualRingCount,
    colors,
    thickness,
    duration,
    isLowEnd,
    enableComplexAnimations,
    prefersReducedMotion,
  ]);

  if (prefersReducedMotion || rings.length === 0) return null;

  return (
    <div
      className={cn('fixed pointer-events-none z-[80]', className)}
      style={{ left: position.x, top: position.y }}
    >
      <AnimatePresence>
        {rings.map((ring) => (
          <m.div
            key={ring.id}
            className="absolute rounded-full"
            style={{
              width: initialSize,
              height: initialSize,
              marginLeft: -initialSize / 2,
              marginTop: -initialSize / 2,
              border: `${ring.thickness}px solid ${ring.color}`,
              boxShadow: !isLowEnd ? `0 0 8px ${ring.color.startsWith('#') ? `${ring.color}60` : ring.color}` : undefined,
            }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{
              scale: actualMaxRadius / (initialSize / 2),
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: duration / 1000,
              delay: ring.delay,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

/**
 * ScreenEdgeGlow - Vignette glow effect at screen edges for high combos
 *
 * Creates a subtle color glow around the edges of the screen
 * that intensifies with combo level.
 *
 * @example
 * ```tsx
 * <ScreenEdgeGlow
 *   intensity={comboIntensity}
 *   color="#FF6B35"
 * />
 * ```
 */
export function ScreenEdgeGlow({
  intensity = 0,
  color = '#FF6B35',
  className,
}: {
  intensity: number; // 0-1
  color?: string;
  className?: string;
}) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();

  if (prefersReducedMotion || !enableGlowEffects || intensity <= 0 || isLowEnd) {
    return null;
  }

  const opacity = Math.min(intensity * 0.3, 0.4);

  return (
    <m.div
      className={cn(
        'fixed inset-0 pointer-events-none z-[70]',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 0.3 }}
      style={{
        background: `
          radial-gradient(ellipse at top, transparent 50%, ${color.startsWith('#') ? `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : color} 100%),
          radial-gradient(ellipse at bottom, transparent 50%, ${color.startsWith('#') ? `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : color} 100%),
          radial-gradient(ellipse at left, transparent 60%, ${color.startsWith('#') ? `${color}${Math.round(opacity * 0.5 * 255).toString(16).padStart(2, '0')}` : color} 100%),
          radial-gradient(ellipse at right, transparent 60%, ${color.startsWith('#') ? `${color}${Math.round(opacity * 0.5 * 255).toString(16).padStart(2, '0')}` : color} 100%)
        `,
      }}
    >
      {/* Pulse animation for high intensity */}
      {intensity > 0.5 && (
        <m.div
          className="absolute inset-0"
          animate={{
            opacity: [0, 0.2, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`,
          }}
        />
      )}
    </m.div>
  );
}

export default ComboPulseRing;
