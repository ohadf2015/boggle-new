/**
 * WorldBackground Component
 *
 * Renders a layered background based on the current world theme.
 * Includes texture overlays and particle effects for immersive visuals.
 */

'use client';

import React, { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useAdventureTheme } from '@/contexts/AdventureThemeContext';
import WorldParticles from './WorldParticles';
import type { ParallaxLayer, TextureConfig } from '@/lib/adventure/themes/types';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

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

interface BackgroundLayerProps {
  layer: ParallaxLayer;
  index: number;
}

const BackgroundLayer = memo<BackgroundLayerProps>(({ layer, index }) => {
  const isGradient = layer.source.startsWith('bg-');

  return (
    <AdaptiveMotion.div
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
      transition={{ duration: 0.3, delay: index * (OPTIMIZED_TIMING.parallel.parallaxLayerStaggerMs / 1000) }}
    />
  );
});

BackgroundLayer.displayName = 'BackgroundLayer';

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
}) => {
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

      {/* Background layers */}
      {background.layers.map((layer, index) => (
        <BackgroundLayer
          key={layer.id}
          layer={layer}
          index={index + 1}
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
