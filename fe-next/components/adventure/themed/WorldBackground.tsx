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
import { useParallax } from '@/hooks/useParallax';
import WorldParticles from './WorldParticles';
import type { ParallaxLayer, TextureConfig, ParticleConfig } from '@/lib/adventure/themes/types';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

// ==============================================
// TYPES
// ==============================================

interface WorldBackgroundProps {
  /** Additional CSS classes */
  className?: string;
  /** Children to render on top of background */
  children?: React.ReactNode;
  /** Parallax intensity multiplier (0 = disabled, 1 = normal, default: 0.8) */
  parallaxIntensity?: number;
  /** Enable ambient drift animation (default: true) */
  enableAmbient?: boolean;
}

// ==============================================
// SUB-COMPONENTS
// ==============================================

interface ParallaxLayerComponentProps {
  layer: ParallaxLayer;
  index: number;
  parallaxX: number;
  parallaxY: number;
}

const ParallaxLayerComponent = memo<ParallaxLayerComponentProps>(({ layer, index, parallaxX, parallaxY }) => {
  const isGradient = layer.source.startsWith('bg-');

  // Calculate transform based on layer depth and parallax offset
  const transformX = parallaxX * layer.depth;
  const transformY = parallaxY * layer.depth;

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
        transform: `translate(${transformX}px, ${transformY}px)`,
        transition: 'transform 0.3s ease-out',
        ...(isGradient ? {} : {
          backgroundImage: `url(${layer.source})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: layer.opacity }}
      // DEBT-01: Reduced stagger for faster parallel entry
      transition={{ duration: 0.3, delay: index * (OPTIMIZED_TIMING.parallel.parallaxLayerStaggerMs / 1000) }}
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

// ==============================================
// MAIN COMPONENT
// ==============================================

const WorldBackground = memo<WorldBackgroundProps>(({
  className,
  children,
  parallaxIntensity = 0.8,
  enableAmbient = true,
}) => {
  const { theme, isTransitioning } = useAdventureTheme();
  const { background, containerClass } = theme;

  // Use parallax hook for interactive motion
  // Intensity can be reduced/disabled for gameplay focus
  const { x: parallaxX, y: parallaxY } = useParallax({
    intensity: parallaxIntensity,
    enableGyroscope: parallaxIntensity > 0,
    enableGesture: parallaxIntensity > 0,
    enableAmbient: enableAmbient && parallaxIntensity > 0,
    ambientSpeed: 0.5,
  });

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
          parallaxX={parallaxX}
          parallaxY={parallaxY}
        />
      ))}

      {/* Texture overlay */}
      <TextureOverlay texture={background.texture} />

      {/* World-specific particles */}
      <WorldParticles particles={background.particles} />

      {/* Content layer */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
});

WorldBackground.displayName = 'WorldBackground';

export default WorldBackground;
