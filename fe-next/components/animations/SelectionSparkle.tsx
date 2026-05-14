'use client';

import React, { useEffect, useState, useCallback, memo, useRef, useReducer } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  distance: number;
  color: string;
  delay: number;
}

interface SelectionSparkleProps {
  /** Trigger position for sparkle effect */
  position: { x: number; y: number } | null;
  /** Trigger key - change this to trigger new sparkle */
  triggerKey: number | string;
  /** Sparkle color scheme */
  colorScheme?: 'default' | 'valid' | 'invalid' | 'gold';
  /** Number of particles */
  particleCount?: number;
  /** Spread radius of particles */
  spreadRadius?: number;
  /** Particle size range */
  sizeRange?: [number, number];
  /** Animation duration in ms */
  duration?: number;
  /** Use neo-brutalist square particles */
  useSquareParticles?: boolean;
  /** Additional className */
  className?: string;
}

const COLOR_SCHEMES = {
  default: ['#FFE135', '#FF6B35', '#00FFFF'],
  valid: ['#BFFF00', '#00FFFF', '#34D399'],
  invalid: ['#FF1493', '#EF4444', '#F97316'],
  gold: ['#FFD700', '#FBBF24', '#F59E0B'],
};

/**
 * SelectionSparkle - Burst of particles when selecting a letter
 *
 * Creates a satisfying visual feedback when letters are selected.
 * Uses neo-brutalist square particles for brand consistency.
 *
 * @example
 * ```tsx
 * const [sparkleKey, setSparkleKey] = useState(0);
 * const [sparklePos, setSparklePos] = useState<{x: number, y: number} | null>(null);
 *
 * const handleLetterSelect = (x: number, y: number) => {
 *   setSparklePos({ x, y });
 *   setSparkleKey(Date.now());
 * };
 *
 * <SelectionSparkle
 *   position={sparklePos}
 *   triggerKey={sparkleKey}
 *   colorScheme="default"
 *   useSquareParticles
 * />
 * ```
 */
// Default size range - defined outside component to prevent reference changes
const DEFAULT_SIZE_RANGE: [number, number] = [3, 6];

export const SelectionSparkle = memo(function SelectionSparkle({
  position,
  triggerKey,
  colorScheme = 'default',
  particleCount = 8,
  spreadRadius = 40,
  sizeRange = DEFAULT_SIZE_RANGE,
  duration = 400,
  useSquareParticles = true,
  className,
}: SelectionSparkleProps) {
  const { isLowEnd, prefersReducedMotion, maxParticles, enableComplexAnimations } =
    useDevicePerformance();
  // Batch particles + isActive — they always change together on trigger start/end
  type SparkleState = { particles: SparkleParticle[]; isActive: boolean };
  type SparkleAction = { type: 'start'; particles: SparkleParticle[] } | { type: 'end' };
  const [sparkleState, dispatchSparkle] = useReducer(
    (state: SparkleState, action: SparkleAction): SparkleState => {
      switch (action.type) {
        case 'start': return { particles: action.particles, isActive: true };
        case 'end': return { particles: [], isActive: false };
        default: return state;
      }
    },
    { particles: [], isActive: false }
  );
  const { particles, isActive } = sparkleState;

  // Use ref for position to avoid dependency array issues
  // Position changes should NOT trigger the effect - only triggerKey should
  const positionRef = useRef(position);
  positionRef.current = position;

  const colors = COLOR_SCHEMES[colorScheme];

  // Generate particles - use stable reference by reading from ref
  const generateParticles = useCallback(
    (pos: { x: number; y: number }): SparkleParticle[] => {
      const count = Math.min(particleCount, isLowEnd ? 4 : maxParticles);
      return Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        x: pos.x,
        y: pos.y,
        size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        angle: (360 / count) * i + (Math.random() - 0.5) * 30,
        distance: spreadRadius * (0.5 + Math.random() * 0.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.05,
      }));
    },
    [particleCount, isLowEnd, maxParticles, sizeRange, spreadRadius, colors]
  );

  // Trigger effect ONLY when triggerKey changes
  // Position is read from ref to avoid stale closure while keeping effect stable
  useEffect(() => {
    const currentPosition = positionRef.current;
    if (currentPosition && enableComplexAnimations) {
      // dispatch batches particles + isActive in one update
      dispatchSparkle({ type: 'start', particles: generateParticles(currentPosition) });

      const timer = setTimeout(() => {
        dispatchSparkle({ type: 'end' });
      }, duration + 100);

      return () => clearTimeout(timer);
    }
    return undefined;
    // NOTE: position is intentionally excluded - triggerKey is the trigger mechanism
  }, [triggerKey, generateParticles, duration, enableComplexAnimations]);

  // Skip for reduced motion or disabled animations
  if (prefersReducedMotion || !enableComplexAnimations || !isActive) {
    return null;
  }

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-[100]', className)}>
      <AnimatePresence>
        {particles.map((particle) => {
          const radians = (particle.angle * Math.PI) / 180;
          const endX = Math.cos(radians) * particle.distance;
          const endY = Math.sin(radians) * particle.distance;

          return (
            <m.div
              key={particle.id}
              className="absolute"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                x: endX,
                y: endY,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                rotate: useSquareParticles ? [0, 180] : 0,
              }}
              transition={{
                duration: duration / 1000,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            >
              {useSquareParticles ? (
                // Neo-brutalist square particle
                <div
                  className="w-full h-full border border-neo-black"
                  style={{
                    backgroundColor: particle.color,
                    boxShadow: `1px 1px 0 black`,
                  }}
                />
              ) : (
                // Round particle
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    backgroundColor: particle.color,
                    boxShadow: `0 0 4px ${particle.color}`,
                  }}
                />
              )}
            </m.div>
          );
        })}
      </AnimatePresence>

      {/* Central flash */}
      {position && !isLowEnd && (
        <m.div
          key={`flash-${triggerKey}`}
          className="absolute rounded-full"
          style={{
            left: position.x,
            top: position.y,
            width: 20,
            height: 20,
            marginLeft: -10,
            marginTop: -10,
            backgroundColor: colors[0],
          }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}
    </div>
  );
});

/**
 * LetterSelectFeedback - Wrapper component that adds selection feedback to a letter
 *
 * @example
 * ```tsx
 * <LetterSelectFeedback onSelect={() => handleSelect(letter)}>
 *   <LetterTile letter={letter} />
 * </LetterSelectFeedback>
 * ```
 */
export function LetterSelectFeedback({
  children,
  onSelect,
  disabled = false,
  colorScheme = 'default',
  className,
}: {
  children: React.ReactNode;
  onSelect?: (position: { x: number; y: number }) => void;
  disabled?: boolean;
  colorScheme?: 'default' | 'valid' | 'invalid' | 'gold';
  className?: string;
}) {
  const [sparklePos, setSparklePos] = useState<{ x: number; y: number } | null>(null);
  const [sparkleKey, setSparkleKey] = useState(0);
  const { enableComplexAnimations } = useDevicePerformance();

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const pos = { x: clientX, y: clientY };
    setSparklePos(pos);
    setSparkleKey(Date.now());
    onSelect?.(pos);
  };

  return (
    <div
      className={cn('relative', className)}
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {children}
      {enableComplexAnimations && (
        <SelectionSparkle
          position={sparklePos}
          triggerKey={sparkleKey}
          colorScheme={colorScheme}
        />
      )}
    </div>
  );
}

export default SelectionSparkle;
