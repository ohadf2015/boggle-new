'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ParallaxLayerConfig } from './levelGridConfig';

/**
 * FloatingParticle - Floating particle with CSS animations
 * Uses CSS custom properties from :root (set by useParallax)
 */
export const FloatingParticle = memo(function FloatingParticle({
  emoji,
  left,
  top,
  size,
  duration,
  delay,
}: {
  emoji: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}) {
  return (
    <div
      className="level-grid-particle"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        fontSize: `${size}px`,
        '--particle-duration': `${duration}s`,
        '--particle-delay': `${delay}s`,
      } as React.CSSProperties}
    >
      {emoji}
    </div>
  );
});

/**
 * ParallaxImageLayer - Renders a single parallax background layer
 * Uses CSS transforms for GPU-accelerated movement
 */
export const ParallaxImageLayer = memo(function ParallaxImageLayer({
  src,
  depth,
  opacity,
  scale = 1.2,
  position = 'center',
  parallaxX,
  parallaxY,
}: ParallaxLayerConfig & {
  parallaxX: number;
  parallaxY: number;
}) {
  const positionClass = position === 'top'
    ? 'object-top'
    : position === 'bottom'
      ? 'object-bottom'
      : 'object-center';

  return (
    <div
      className="absolute inset-0 level-grid-parallax-layer"
      style={{
        transform: `translate(${parallaxX * depth}px, ${parallaxY * depth}px) scale(${scale})`,
        opacity,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        className={cn('object-cover', positionClass)}
      />
    </div>
  );
});

/**
 * ForegroundFrame - Creates depth framing effect around viewport edges
 */
export const ForegroundFrame = memo(function ForegroundFrame({
  glowColor,
  parallaxX,
  parallaxY,
}: {
  glowColor: string;
  parallaxX: number;
  parallaxY: number;
}) {
  return (
    <>
      <div
        className="level-grid-foreground-edge level-grid-foreground-edge--top"
        style={{
          transform: `translateY(${parallaxY * 0.6}px)`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
      />
      <div
        className="level-grid-foreground-edge level-grid-foreground-edge--bottom"
        style={{
          transform: `translateY(${-parallaxY * 0.6}px)`,
          backgroundColor: glowColor,
          opacity: 0.2,
        }}
      />
      <div
        className="level-grid-foreground-vignette"
        style={{
          transform: `translate(${parallaxX * 0.4}px, ${parallaxY * 0.4}px)`,
        }}
      />
    </>
  );
});

/**
 * DifficultyIndicator - Visual difficulty indicator using bars
 * Shows 1 bar for EASY, 2 for MEDIUM, 3 for HARD
 */
export const DifficultyIndicator = memo(function DifficultyIndicator({
  difficulty,
}: {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}) {
  const filledBars = difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 3;
  const colorClass =
    difficulty === 'EASY'
      ? 'bg-neo-lime'
      : difficulty === 'MEDIUM'
        ? 'bg-neo-orange'
        : 'bg-neo-red';
  const containerColorClass =
    difficulty === 'EASY'
      ? 'text-neo-lime'
      : difficulty === 'MEDIUM'
        ? 'text-neo-orange'
        : 'text-neo-red';

  return (
    <div
      data-testid="difficulty-indicator"
      aria-label={`Difficulty: ${difficulty.toLowerCase()}`}
      className={cn(
        'absolute top-2 right-2 rtl:right-auto rtl:left-2',
        'flex items-end gap-0.5 px-1.5 py-1 rounded-sm',
        'bg-neo-black/50 border border-neo-black/30',
        containerColorClass
      )}
    >
      {[1, 2, 3].map((barNum) => (
        <div
          key={barNum}
          data-filled={barNum <= filledBars ? 'true' : 'false'}
          className={cn(
            'w-1 rounded-sm transition-all',
            barNum === 1 && 'h-1.5',
            barNum === 2 && 'h-2.5',
            barNum === 3 && 'h-3.5',
            barNum <= filledBars ? colorClass : 'bg-neo-white/20'
          )}
        />
      ))}
    </div>
  );
});
