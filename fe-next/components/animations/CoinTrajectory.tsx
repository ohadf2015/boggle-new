'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface CoinParticle {
  id: number;
  startX: number;
  startY: number;
  delay: number;
  size: number;
  rotation: number;
}

interface CoinTrajectoryProps {
  /** Number of coins to animate */
  coinCount: number;
  /** Starting position { x, y } in viewport coordinates */
  startPosition: { x: number; y: number };
  /** Target element ref or { x, y } position to fly to */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Fallback target position if ref not available */
  targetPosition?: { x: number; y: number };
  /** Callback when a single coin reaches the target */
  onCoinArrival?: (index: number) => void;
  /** Callback when all coins have arrived */
  onAllCoinsArrived?: () => void;
  /** Animation duration per coin in ms */
  duration?: number;
  /** Stagger delay between coins in ms */
  staggerDelay?: number;
  /** Show trail effect behind coins */
  showTrail?: boolean;
  /** Coin visual style */
  coinStyle?: 'emoji' | 'icon' | 'neo';
  /** Additional className for container */
  className?: string;
}

/**
 * CoinTrajectory - Animates coins flying from source to target with satisfying arc
 *
 * Features:
 * - Curved trajectory with magnetic pull toward target
 * - Rotation and scale animations
 * - Optional golden trail effect
 * - Performance-adaptive particle count
 * - Staggered arrival for rolling counter effect
 *
 * @example
 * ```tsx
 * const coinDisplayRef = useRef<HTMLDivElement>(null);
 *
 * <CoinTrajectory
 *   coinCount={5}
 *   startPosition={{ x: 200, y: 400 }}
 *   targetRef={coinDisplayRef}
 *   onCoinArrival={(i) => incrementCoinBy(1)}
 *   onAllCoinsArrived={() => console.log('Done!')}
 *   showTrail
 * />
 * ```
 */
export function CoinTrajectory({
  coinCount,
  startPosition,
  targetRef,
  targetPosition: fallbackTarget,
  onCoinArrival,
  onAllCoinsArrived,
  duration = 800,
  staggerDelay = 80,
  showTrail = true,
  coinStyle = 'emoji',
  className,
}: CoinTrajectoryProps) {
  const { isLowEnd, prefersReducedMotion, maxParticles, enableGlowEffects } = useDevicePerformance();
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const [arrivedCount, setArrivedCount] = useState(0);
  const [targetPos, setTargetPos] = useState(fallbackTarget ?? { x: 0, y: 0 });

  // Limit particle count based on device capability
  const actualCoinCount = Math.min(coinCount, isLowEnd ? 4 : maxParticles);

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
      // Default: top-right corner (common coin display location)
      setTargetPos({
        x: typeof window !== 'undefined' ? window.innerWidth - 60 : 0,
        y: 40,
      });
    }
  }, [targetRef, fallbackTarget]);

  // Generate particles
  useEffect(() => {
    if (coinCount <= 0) return;

    const newParticles: CoinParticle[] = Array.from({ length: actualCoinCount }, (_, i) => ({
      id: Date.now() + i,
      startX: startPosition.x + (Math.random() - 0.5) * 30,
      startY: startPosition.y + (Math.random() - 0.5) * 20,
      delay: i * staggerDelay,
      size: 24 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));

    setParticles(newParticles);
    setArrivedCount(0);
  }, [coinCount, startPosition.x, startPosition.y, staggerDelay, actualCoinCount]);

  // Handle coin arrival
  const handleCoinArrival = useCallback((index: number) => {
    onCoinArrival?.(index);
    setArrivedCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= actualCoinCount) {
        setTimeout(() => onAllCoinsArrived?.(), 100);
      }
      return newCount;
    });
  }, [onCoinArrival, onAllCoinsArrived, actualCoinCount]);

  // Handle reduced motion - call callbacks immediately without animation
  useEffect(() => {
    if (prefersReducedMotion && coinCount > 0) {
      for (let i = 0; i < actualCoinCount; i++) {
        onCoinArrival?.(i);
      }
      onAllCoinsArrived?.();
    }
  }, [prefersReducedMotion, coinCount, actualCoinCount, onCoinArrival, onAllCoinsArrived]);

  // Skip rendering for reduced motion
  if (prefersReducedMotion) {
    return null;
  }

  // Calculate trajectory control points for curved path
  const getTrajectory = (particle: CoinParticle) => {
    const dx = targetPos.x - particle.startX;
    const dy = targetPos.y - particle.startY;

    // Arc control point - creates a nice curve
    // Use particle's rotation as deterministic offset instead of Math.random()
    const arcHeight = Math.min(Math.abs(dy) * 0.5, 100);
    const offsetFactor = ((particle.rotation / 360) - 0.5) * 40;
    const controlX = particle.startX + dx * 0.5 + offsetFactor;
    const controlY = Math.min(particle.startY, targetPos.y) - arcHeight;

    return { controlX, controlY };
  };

  // Coin rendering based on style
  const renderCoin = (size: number) => {
    switch (coinStyle) {
      case 'neo':
        return (
          <div
            className="rounded-full bg-linear-to-br from-amber-300 via-yellow-400 to-amber-500 border-2 border-amber-700 shadow-hard"
            style={{ width: size, height: size }}
          >
            <div className="w-full h-full flex items-center justify-center text-amber-800 font-black text-xs">
              $
            </div>
          </div>
        );
      case 'icon':
        return (
          <div
            className="rounded-full bg-linear-to-br from-yellow-400 to-amber-500"
            style={{ width: size, height: size }}
          />
        );
      case 'emoji':
      default:
        return <span style={{ fontSize: size }}>🪙</span>;
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 pointer-events-none z-60 overflow-hidden',
        className
      )}
    >
      <AnimatePresence>
        {particles.map((particle, index) => {
          const { controlX, controlY } = getTrajectory(particle);

          return (
            <m.div
              key={particle.id}
              className="absolute will-change-transform"
              style={{
                left: particle.startX,
                top: particle.startY,
                x: -particle.size / 2,
                y: -particle.size / 2,
              }}
              initial={{
                scale: 0,
                opacity: 0,
                rotate: particle.rotation,
              }}
              animate={{
                // Custom keyframes for curved trajectory
                x: [
                  0,
                  controlX - particle.startX - particle.size / 2,
                  targetPos.x - particle.startX - particle.size / 2,
                ],
                y: [
                  0,
                  controlY - particle.startY - particle.size / 2,
                  targetPos.y - particle.startY - particle.size / 2,
                ],
                scale: [0, 1.2, 1, 0.5],
                opacity: [0, 1, 1, 0.8],
                rotate: [particle.rotation, particle.rotation + 180, particle.rotation + 360],
              }}
              transition={{
                duration: duration / 1000,
                delay: particle.delay / 1000,
                ease: [0.25, 0.1, 0.25, 1],
                times: [0, 0.3, 0.85, 1],
              }}
              onAnimationComplete={() => handleCoinArrival(index)}
            >
              {/* Trail effect */}
              {showTrail && enableGlowEffects && !isLowEnd && (
                <m.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,225,53,0.4) 0%, transparent 70%)',
                    filter: 'blur(4px)',
                    transform: 'scale(1.5)',
                  }}
                  animate={{
                    opacity: [0, 0.6, 0.3, 0],
                  }}
                  transition={{
                    duration: duration / 1000,
                    delay: particle.delay / 1000,
                  }}
                />
              )}
              {renderCoin(particle.size)}
            </m.div>
          );
        })}
      </AnimatePresence>

      {/* Impact effect at target */}
      {arrivedCount > 0 && enableGlowEffects && !isLowEnd && (
        <m.div
          className="absolute pointer-events-none"
          style={{
            left: targetPos.x,
            top: targetPos.y,
            transform: 'translate(-50%, -50%)',
          }}
          key={`impact-${arrivedCount}`}
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="w-8 h-8 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,225,53,0.6) 0%, transparent 70%)',
            }}
          />
        </m.div>
      )}
    </div>
  );
}

export default CoinTrajectory;
