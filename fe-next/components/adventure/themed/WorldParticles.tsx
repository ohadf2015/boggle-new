/**
 * WorldParticles Component
 *
 * Renders world-specific particle effects (butterflies, droplets, crystals).
 * Adapts particle count to device capabilities and respects reduced motion preferences.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import './WorldParticles.css';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import type { ParticleConfig } from '@/lib/adventure/themes/types';

// ==============================================
// TYPES
// ==============================================

interface WorldParticlesProps {
  /** Particle configuration from world theme */
  particles: ParticleConfig;
  /** Additional CSS classes */
  className?: string;
}

interface ParticleData {
  id: number;
  size: number;
  color: string;
  startX: number;
  startY: number;
  duration: number;
  delay: number;
}

// ==============================================
// SEEDED RANDOM (Deterministic)
// ==============================================

/**
 * Simple seeded PRNG for deterministic "random" values
 * Uses mulberry32 algorithm for fast, predictable results
 */
function seededRandom(seed: number): () => number {
  let t = seed + 0x6D2B79F5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==============================================
// PARTICLE SHAPES
// ==============================================

interface ParticleShapeProps {
  particle: ParticleData;
  color: string;
  size: number;
}

/**
 * Butterfly particle - two elliptical wings
 */
const ButterflyParticle = memo<ParticleShapeProps>(({ particle, color, size }) => {
  const wingSize = size / 2;

  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="overflow-visible">
      {/* Left wing */}
      <ellipse
        cx="7"
        cy="10"
        rx="6"
        ry="8"
        fill={color}
        opacity="0.8"
        className="origin-right"
        style={{
          animation: 'flutter 0.8s ease-in-out infinite alternate',
        }}
      />
      {/* Right wing */}
      <ellipse
        cx="13"
        cy="10"
        rx="6"
        ry="8"
        fill={color}
        opacity="0.8"
        className="origin-left"
        style={{
          animation: 'flutter 0.8s ease-in-out infinite alternate-reverse',
        }}
      />
      {/* Body */}
      <rect
        x="9"
        y="6"
        width="2"
        height="8"
        rx="1"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
});

ButterflyParticle.displayName = 'ButterflyParticle';

/**
 * Water droplet particle - teardrop shape
 */
const DropletParticle = memo<ParticleShapeProps>(({ particle, color, size }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="overflow-visible">
      <path
        d="M10 2 C10 2, 4 8, 4 12 C4 15.5, 6.5 18, 10 18 C13.5 18, 16 15.5, 16 12 C16 8, 10 2, 10 2 Z"
        fill={color}
        opacity="0.7"
      />
      {/* Highlight */}
      <ellipse
        cx="8"
        cy="10"
        rx="2"
        ry="3"
        fill="white"
        opacity="0.3"
      />
    </svg>
  );
});

DropletParticle.displayName = 'DropletParticle';

/**
 * Crystal particle - diamond with glow
 */
const CrystalParticle = memo<ParticleShapeProps>(({ particle, color, size }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className="overflow-visible">
      {/* Glow effect */}
      <defs>
        <filter id={`wp-glow-${particle.id}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Diamond shape */}
      <path
        d="M10 2 L16 10 L10 18 L4 10 Z"
        fill={color}
        opacity="0.8"
        filter={`url(#wp-glow-${particle.id})`}
      />
      {/* Inner facets */}
      <path
        d="M10 2 L10 10 L16 10 Z"
        fill="white"
        opacity="0.2"
      />
    </svg>
  );
});

CrystalParticle.displayName = 'CrystalParticle';

// ==============================================
// ANIMATION VARIANTS
// ==============================================

/**
 * Get animation variant based on particle type
 */
function getAnimationVariant(type: ParticleConfig['type']) {
  switch (type) {
    case 'butterflies':
      return {
        className: 'animate-particle-flutter',
        keyframes: 'flutter',
      };
    case 'droplets':
      return {
        className: 'animate-particle-fall-splash',
        keyframes: 'fall-splash',
      };
    case 'crystals':
      return {
        className: 'animate-particle-sparkle-drift',
        keyframes: 'sparkle-drift',
      };
    default:
      return {
        className: '',
        keyframes: 'none',
      };
  }
}

/**
 * Render particle shape based on type
 */
function renderParticleShape(
  type: ParticleConfig['type'],
  particle: ParticleData,
  color: string,
  size: number
) {
  switch (type) {
    case 'butterflies':
      return <ButterflyParticle particle={particle} color={color} size={size} />;
    case 'droplets':
      return <DropletParticle particle={particle} color={color} size={size} />;
    case 'crystals':
      return <CrystalParticle particle={particle} color={color} size={size} />;
    default:
      // Fallback to simple circle
      return (
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
          }}
        />
      );
  }
}

// ==============================================
// MAIN COMPONENT
// ==============================================

const WorldParticles = memo<WorldParticlesProps>(({ particles, className }) => {
  const { maxParticles, prefersReducedMotion } = useDevicePerformance();

  // Adaptive particle count - use min of configured count and device capability
  const adaptiveCount = Math.min(particles.count, maxParticles, 10); // Hard cap at 10 for sparseness

  // Generate particles with deterministic positions using seeded random
  const particleElements = useMemo(() => {
    return Array.from({ length: adaptiveCount }, (_, i) => {
      // Create seeded random for each particle based on index
      const random = seededRandom(i * 12345 + 67890);

      const size = particles.sizeRange[0] +
        random() * (particles.sizeRange[1] - particles.sizeRange[0]);
      const colorIndex = Math.floor(random() * particles.colors.length);
      const startX = random() * 100;
      const startY = random() * 100;
      const duration = (3 + random() * 4) / particles.speed;

      return {
        id: i,
        size,
        color: particles.colors[colorIndex],
        startX,
        startY,
        duration,
        delay: random() * duration,
      };
    });
  }, [adaptiveCount, particles.colors, particles.sizeRange, particles.speed]);

  const animation = getAnimationVariant(particles.type);

  // Don't render particles if reduced motion is preferred
  if (prefersReducedMotion) {
    return null;
  }

  // Don't render if no particles configured
  if (particles.type === 'none' || particles.count === 0) {
    return null;
  }

  return (
      <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
        {particleElements.map((particle) => (
          <AdaptiveMotion.div
            key={particle.id}
            className={cn('absolute', animation.className)}
            style={{
              left: `${particle.startX}%`,
              top: `${particle.startY}%`,
              '--duration': `${particle.duration}s`,
              '--drift-x': `${(particle.id % 3 - 1) * 50}px`,
              '--drift-y': `${(particle.id % 5 - 2) * 30}px`,
              animationDelay: `${particle.delay}s`,
            } as React.CSSProperties}
            // DEBT-01: Faster particle fade-in for quicker entry feel
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: particle.delay * 0.5 }}
          >
            {renderParticleShape(particles.type, particle, particle.color, particle.size)}
          </AdaptiveMotion.div>
        ))}
      </div>
  );
});

WorldParticles.displayName = 'WorldParticles';

export default WorldParticles;
