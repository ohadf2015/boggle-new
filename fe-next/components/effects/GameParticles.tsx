'use client';

/**
 * GameParticles — configurable particle effects for game events.
 *
 * Uses tsParticles with preset configurations for different game moments.
 * Respects device performance — skips particles on low-end devices.
 *
 * @example
 * ```tsx
 * <GameParticles preset="wordFound" trigger={wordFoundCount} />
 * <GameParticles preset="victory" trigger={showVictory} />
 * ```
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Particles from '@tsparticles/react';
import { type Container } from '@tsparticles/engine';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { PARTICLE_PRESETS, type ParticlePresetName } from './particlePresets';

interface GameParticlesProps {
  /** Which preset to use */
  preset: ParticlePresetName;
  /** Change this value to re-trigger the effect (number or boolean) */
  trigger: number | boolean;
  /** Container className for positioning */
  className?: string;
  /** Override position (percentage 0-100) */
  position?: { x: number; y: number };
  /** Scale particle count (0.5 = half, 2 = double) */
  intensityScale?: number;
  /** Callback when particle effect completes */
  onComplete?: () => void;
}

export const GameParticles = memo(function GameParticles({
  preset,
  trigger,
  className,
  position,
  intensityScale = 1,
  onComplete,
}: GameParticlesProps) {
  const { isLowEnd, prefersReducedMotion, enableComplexAnimations, maxParticles } = useDevicePerformance();
  const [active, setActive] = useState(false);
  const containerRef = useRef<Container | null>(null);
  const prevTriggerRef = useRef(trigger);

  // Re-trigger on trigger change
  useEffect(() => {
    if (trigger === prevTriggerRef.current) return;
    prevTriggerRef.current = trigger;

    if (!trigger) {
      setActive(false);
      return;
    }

    setActive(true);

    // Auto-deactivate after effect duration
    const timer = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [trigger, onComplete]);

  const particlesLoaded = useCallback(async (container?: Container) => {
    if (container) {
      containerRef.current = container;
    }
  }, []);

  // Skip on low-end devices
  if (isLowEnd || prefersReducedMotion || !enableComplexAnimations || !active) {
    return null;
  }

  const options = { ...PARTICLE_PRESETS[preset] };

  // Apply position override
  if (position && options.emitters) {
    const emitters = Array.isArray(options.emitters) ? options.emitters : [options.emitters];
    emitters.forEach((e: { position?: { x: number; y: number } }) => {
      if (e.position) {
        e.position.x = position.x;
        e.position.y = position.y;
      }
    });
  }

  // Scale particle count based on device capability and intensity
  const scale = Math.min(intensityScale, maxParticles / 30);
  if (options.particles?.number && typeof options.particles.number.value === 'number') {
    options.particles.number.value = Math.round(options.particles.number.value * scale);
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none z-50 overflow-hidden', className)}>
      <Particles
        id={`game-particles-${preset}-${String(trigger)}`}
        options={options}
        particlesLoaded={particlesLoaded}
      />
    </div>
  );
});

export default GameParticles;
