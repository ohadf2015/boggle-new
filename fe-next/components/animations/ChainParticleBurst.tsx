'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { getWorldParticleConfig } from '@/lib/adventure/worldThemes';
import { cn } from '@/lib/utils';

interface ChainParticle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  useEmoji: boolean | string;
  color: string;
}

interface ChainParticleBurstProps {
  /** Trigger the burst animation */
  trigger: boolean;
  /** Position of the burst center */
  position: { x: number; y: number };
  /** World number (1-10) for theming */
  world: number;
  /** Callback when burst animation completes */
  onComplete?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * ChainParticleBurst - World-themed particle burst for chain tile activation
 *
 * Creates a themed particle explosion when chain tiles link together:
 * - Particles themed to current world (snowflakes for ice, leaves for meadows)
 * - Device-aware particle counts (4 low-end, 12 mid-range, 20 high-end)
 * - Reduced motion fallback (static emoji badge)
 * - GPU-accelerated animations (transform, opacity only)
 *
 * @example
 * ```tsx
 * <ChainParticleBurst
 *   trigger={showBurst}
 *   position={{ x: 200, y: 300 }}
 *   world={7} // Mirror Palace (ice/snowflakes)
 *   onComplete={() => setShowBurst(false)}
 * />
 * ```
 */
export function ChainParticleBurst({
  trigger,
  position,
  world,
  onComplete,
  className,
}: ChainParticleBurstProps) {
  const { isLowEnd, prefersReducedMotion, enableGlowEffects, maxParticles } = useDevicePerformance();
  const [isActive, setIsActive] = useState(false);
  const [particles, setParticles] = useState<ChainParticle[]>([]);

  // Use ref for callback to avoid effect re-running
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Get world-specific configuration
  const config = getWorldParticleConfig(world);

  // Particle counts based on device capability
  const getParticleCount = useCallback(() => {
    if (isLowEnd) return 4;
    if (maxParticles <= 8) return 12; // mid-range
    return 20; // high-end
  }, [isLowEnd, maxParticles]);

  // Generate particles when triggered
  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);

      // Get config inside effect to avoid dependency issues
      const worldConfig = getWorldParticleConfig(world);
      const count = getParticleCount();
      const newParticles: ChainParticle[] = Array.from({ length: count }, (_, i) => {
        // Use emoji for every 3rd particle if the world theme has one defined
        const useEmojiForThis: boolean | string =
          i % 3 === 0 && typeof worldConfig.emoji === 'string'
            ? worldConfig.emoji
            : false;
        return {
          id: Date.now() + i,
          angle: (360 / count) * i + (Math.random() - 0.5) * 20,
          distance: worldConfig.distance.min + Math.random() * (worldConfig.distance.max - worldConfig.distance.min),
          size: worldConfig.size.min + Math.random() * (worldConfig.size.max - worldConfig.size.min),
          delay: Math.random() * 0.1,
          useEmoji: useEmojiForThis,
          color: i % 2 === 0 ? worldConfig.color : (worldConfig.secondaryColor || worldConfig.color),
        };
      });

      setParticles(newParticles);

      // Auto-cleanup after animation
      const timer = setTimeout(() => {
        setIsActive(false);
        setParticles([]);
        onCompleteRef.current?.();
      }, worldConfig.duration + 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, isActive, getParticleCount, world]);

  // Reduced motion fallback - static emoji badge
  if (prefersReducedMotion) {
    if (trigger && config.emoji) {
      return (
        <div
          className={cn('fixed pointer-events-none z-60', className)}
          style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="px-3 py-2 rounded-neo bg-neo-navy border-3 border-neo-white shadow-hard">
            <span className="text-2xl">{config.emoji}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  if (!isActive) return null;

  return (
    <div
      className={cn('fixed pointer-events-none z-60', className)}
      style={{ left: position.x, top: position.y }}
    >
      {/* Expanding ring effect */}
      {enableGlowEffects && !isLowEnd && (
        <>
          <m.div
            className="absolute rounded-full border-4"
            style={{
              left: '50%',
              top: '50%',
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
              borderColor: config.color,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: config.duration / 1000, ease: 'easeOut' }}
          />
          {config.secondaryColor && (
            <m.div
              className="absolute rounded-full border-2"
              style={{
                left: '50%',
                top: '50%',
                width: 20,
                height: 20,
                marginLeft: -10,
                marginTop: -10,
                borderColor: config.secondaryColor,
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: (config.duration - 100) / 1000, ease: 'easeOut', delay: 0.05 }}
            />
          )}
        </>
      )}

      {/* Central glow */}
      {enableGlowEffects && !isLowEnd && (
        <m.div
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
            background: `radial-gradient(circle, ${config.color}99 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: config.duration / 2000 }}
        />
      )}

      {/* Particle burst */}
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
                left: '50%',
                top: '50%',
                width: particle.size,
                height: particle.size,
                marginLeft: -particle.size / 2,
                marginTop: -particle.size / 2,
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: endX,
                y: endY,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: config.duration / 1000,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            >
              {particle.useEmoji ? (
                // Emoji particle
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ fontSize: particle.size }}
                >
                  {particle.useEmoji}
                </div>
              ) : (
                // Neo-brutalist square particle
                <div
                  className="w-full h-full border-2 border-neo-black shadow-[2px_2px_0_black]"
                  style={{
                    backgroundColor: particle.color,
                    transform: `rotate(${particle.angle}deg)`,
                  }}
                />
              )}
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ChainParticleBurst;
