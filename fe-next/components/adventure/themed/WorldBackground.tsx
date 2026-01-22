/**
 * WorldBackground Component
 *
 * Renders a multi-layered parallax background based on the current world theme.
 * Includes texture overlays and particle effects for immersive visuals.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAdventureTheme } from '@/contexts/AdventureThemeContext';
import type { ParallaxLayer, TextureConfig, ParticleConfig } from '@/lib/adventure/themes/types';

// ==============================================
// TYPES
// ==============================================

interface WorldBackgroundProps {
  /** Additional CSS classes */
  className?: string;
  /** Children to render on top of background */
  children?: React.ReactNode;
}

// ==============================================
// SUB-COMPONENTS
// ==============================================

interface ParallaxLayerComponentProps {
  layer: ParallaxLayer;
  index: number;
}

const ParallaxLayerComponent = memo<ParallaxLayerComponentProps>(({ layer, index }) => {
  const isGradient = layer.source.startsWith('bg-');

  return (
    <motion.div
      key={layer.id}
      className={cn(
        layer.className,
        isGradient && layer.source
      )}
      style={{
        opacity: layer.opacity,
        zIndex: index,
        ...(isGradient ? {} : {
          backgroundImage: `url(${layer.source})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: layer.opacity }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    />
  );
});

ParallaxLayerComponent.displayName = 'ParallaxLayerComponent';

interface TextureOverlayProps {
  texture: TextureConfig;
}

const TextureOverlay = memo<TextureOverlayProps>(({ texture }) => {
  if (texture.type === 'none') return null;

  // Map texture types to CSS classes (fallback to halftone pattern)
  const textureClassMap: Record<TextureConfig['type'], string> = {
    grain: 'bg-[url("/images/textures/grain.png")]',
    stone: 'bg-[url("/images/textures/stone.png")]',
    halftone: 'texture-halftone',
    wood: 'bg-[url("/images/textures/wood.png")]',
    ice: 'bg-[url("/images/textures/ice.png")]',
    metal: 'bg-[url("/images/textures/metal.png")]',
    none: '',
  };
  const textureClass = textureClassMap[texture.type];

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        textureClass
      )}
      style={{
        opacity: texture.opacity,
        mixBlendMode: texture.blendMode,
        backgroundRepeat: 'repeat',
      }}
    />
  );
});

TextureOverlay.displayName = 'TextureOverlay';

interface ParticleSystemProps {
  particles: ParticleConfig;
}

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

const ParticleSystem = memo<ParticleSystemProps>(({ particles }) => {
  // Generate particles with deterministic positions using seeded random
  const particleElements = useMemo(() => {
    return Array.from({ length: particles.count }, (_, i) => {
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
  }, [particles.count, particles.colors, particles.sizeRange, particles.speed]);

  const getAnimationClass = (type: ParticleConfig['type']) => {
    switch (type) {
      case 'leaves':
        return 'animate-particle-fall';
      case 'bubbles':
        return 'animate-particle-rise';
      case 'sparkles':
        return 'animate-particle-sparkle';
      default:
        return '';
    }
  };

  const getParticleShape = (type: ParticleConfig['type']) => {
    switch (type) {
      case 'leaves':
        return 'rounded-[30%_70%_70%_30%_/_30%_30%_70%_70%]'; // Leaf shape
      case 'bubbles':
        return 'rounded-full';
      case 'sparkles':
        return 'rotate-45';
      default:
        return 'rounded-full';
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particleElements.map((particle) => (
        <motion.div
          key={particle.id}
          className={cn(
            'absolute',
            getParticleShape(particles.type),
            getAnimationClass(particles.type)
          )}
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            left: `${particle.startX}%`,
            top: `${particle.startY}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: particle.delay }}
        />
      ))}
    </div>
  );
});

ParticleSystem.displayName = 'ParticleSystem';

// ==============================================
// MAIN COMPONENT
// ==============================================

const WorldBackground = memo<WorldBackgroundProps>(({ className, children }) => {
  const { theme, isTransitioning } = useAdventureTheme();
  const { background, containerClass } = theme;

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        containerClass,
        isTransitioning && 'opacity-80 transition-opacity duration-300',
        className
      )}
    >
      {/* Base color layer */}
      <div
        className={cn(
          'absolute inset-0',
          background.baseColor
        )}
      />

      {/* Parallax layers */}
      {background.layers.map((layer, index) => (
        <ParallaxLayerComponent
          key={layer.id}
          layer={layer}
          index={index + 1}
        />
      ))}

      {/* Texture overlay */}
      <TextureOverlay texture={background.texture} />

      {/* Particle system */}
      <ParticleSystem particles={background.particles} />

      {/* Content layer */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
});

WorldBackground.displayName = 'WorldBackground';

export default WorldBackground;
