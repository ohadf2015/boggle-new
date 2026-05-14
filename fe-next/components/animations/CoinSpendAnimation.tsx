'use client';

/**
 * CoinSpendAnimation - Visual feedback when spending coins
 *
 * Shows a "drain" effect with coins flying outward and fading away.
 * Opposite visual to the earning burst (GlobalCoinEarnFx).
 *
 * @example
 * ```tsx
 * const [showSpend, setShowSpend] = useState(false);
 * const buttonRef = useRef<HTMLButtonElement>(null);
 *
 * <CoinSpendAnimation
 *   trigger={showSpend}
 *   position={getButtonPosition(buttonRef)}
 *   amount={60}
 *   onComplete={() => setShowSpend(false)}
 * />
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface CoinParticle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  rotation: number;
}

interface CoinSpendAnimationProps {
  /** Trigger the spend animation */
  trigger: boolean;
  /** Position of the animation center (viewport coordinates) */
  position: { x: number; y: number };
  /** Amount being spent (affects intensity) */
  amount?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Additional className */
  className?: string;
}

const SPEND_COLORS = [
  '#FF6B35', // neo-orange
  '#FF4444', // red
  '#FF8C00', // dark orange
  '#E25822', // flame
];

export function CoinSpendAnimation({
  trigger,
  position,
  amount = 60,
  onComplete,
  className,
}: CoinSpendAnimationProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects, maxParticles } = useDevicePerformance();
  const [isActive, setIsActive] = useState(false);
  const [particles, setParticles] = useState<CoinParticle[]>([]);

  // Calculate particle count based on amount and device capability
  const getParticleCount = useCallback(() => {
    // Scale particles with amount: 60 coins = 4, 250 = 6, 500 = 8
    const base = Math.min(Math.ceil(amount / 80) + 2, 8);
    return Math.min(base, isLowEnd ? 3 : maxParticles);
  }, [amount, isLowEnd, maxParticles]);

  // Generate particles when triggered
  useEffect(() => {
    if (trigger && !isActive) {
      // Skip animation for reduced motion
      if (prefersReducedMotion) {
        onComplete?.();
        return;
      }

      setIsActive(true);

      const count = getParticleCount();
      const newParticles: CoinParticle[] = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        angle: (360 / count) * i + (Math.random() - 0.5) * 30,
        distance: 60 + Math.random() * 40,
        size: 16 + Math.random() * 8,
        delay: Math.random() * 0.1,
        rotation: Math.random() > 0.5 ? 180 : -180,
      }));

      setParticles(newParticles);

      // Auto-cleanup after animation
      const timer = setTimeout(() => {
        setIsActive(false);
        setParticles([]);
        onComplete?.();
      }, 700);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, isActive, getParticleCount, prefersReducedMotion, onComplete]);

  // Skip rendering for reduced motion
  if (prefersReducedMotion || !isActive) {
    return null;
  }

  return (
    <div
      className={cn('fixed pointer-events-none z-60', className)}
      style={{ left: position.x, top: position.y }}
      aria-hidden="true"
    >
      {/* Shrinking ring effect (opposite of burst) */}
      {enableGlowEffects && !isLowEnd && (
        <m.div
          className="absolute rounded-full border-3 border-neo-orange"
          style={{
            left: '50%',
            top: '50%',
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
          }}
          initial={{ scale: 1.5, opacity: 0.8 }}
          animate={{ scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeIn' }}
        />
      )}

      {/* Amount badge with shake */}
      <m.div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{
          scale: [1, 1.1, 0.9, 0],
          opacity: [1, 1, 0.8, 0],
          rotate: [0, -5, 5, 0],
        }}
        transition={{
          duration: 0.5,
          times: [0, 0.2, 0.5, 1],
          ease: 'easeOut',
        }}
      >
        <div className="px-3 py-1.5 rounded-neo bg-linear-to-br from-red-400 via-orange-500 to-red-500 border-2 border-neo-black shadow-hard-sm whitespace-nowrap">
          <span className="font-black text-white text-lg flex items-center gap-1">
            <span>-{amount}</span>
            <span>🪙</span>
          </span>
        </div>
      </m.div>

      {/* Flying coin particles */}
      <AnimatePresence>
        {particles.map((particle) => {
          const radians = (particle.angle * Math.PI) / 180;
          const endX = Math.cos(radians) * particle.distance;
          const endY = Math.sin(radians) * particle.distance;

          return (
            <m.div
              key={particle.id}
              className="absolute text-xl"
              style={{
                left: '50%',
                top: '50%',
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
                fontSize: particle.size,
              }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
              animate={{
                x: endX,
                y: endY,
                scale: [1, 0.8, 0.3],
                opacity: [1, 0.7, 0],
                rotate: particle.rotation,
              }}
              transition={{
                duration: 0.5,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            >
              🪙
            </m.div>
          );
        })}
      </AnimatePresence>

      {/* Colored particle trails */}
      {!isLowEnd && (
        <AnimatePresence>
          {particles.slice(0, 4).map((particle, i) => {
            const radians = (particle.angle * Math.PI) / 180;
            const endX = Math.cos(radians) * (particle.distance * 0.7);
            const endY = Math.sin(radians) * (particle.distance * 0.7);

            return (
              <m.div
                key={`trail-${particle.id}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -4,
                  marginTop: -4,
                  backgroundColor: SPEND_COLORS[i % SPEND_COLORS.length],
                }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 0.8 }}
                animate={{
                  x: endX,
                  y: endY,
                  scale: [1, 0.5, 0],
                  opacity: [0.8, 0.4, 0],
                }}
                transition={{
                  duration: 0.4,
                  delay: particle.delay + 0.05,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

export default CoinSpendAnimation;
