'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Floating cloud component - pure CSS, no image load */
export function Cloud({
  className,
  size = 'md',
  speed = 1,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  speed?: number;
}): React.JSX.Element {
  const sizes = { sm: 'w-16 h-10', md: 'w-24 h-14', lg: 'w-32 h-20' };

  return (
    <div
      className={cn('world-map-cloud world-map-cloud-shape', sizes[size], className)}
      style={{
        '--cloud-drift': `${20 * speed}px`,
        '--cloud-duration': `${15 / speed}s`,
      } as React.CSSProperties}
    />
  );
}

/**
 * Orbiting letter that flies around a world - CSS animation for performance.
 * Pre-calculated circular path eliminates per-frame trig calculations.
 */
export function OrbitingLetter({
  letter,
  radius,
  duration,
  delay,
  clockwise = true,
  color = 'text-neo-white',
}: {
  letter: string;
  radius: number;
  duration: number;
  delay: number;
  clockwise?: boolean;
  color?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'world-map-orbit-letter text-lg sm:text-xl',
        clockwise ? 'world-map-orbit-letter--clockwise' : 'world-map-orbit-letter--counter-clockwise',
        color
      )}
      style={{
        '--orbit-radius': `${radius}px`,
        '--orbit-duration': `${duration}s`,
        '--orbit-delay': `${delay}s`,
      } as React.CSSProperties}
    >
      {letter}
    </div>
  );
}

/** Color token to Tailwind text class mapping */
const COLOR_CLASSES: Record<string, string> = {
  'neo-lime': 'text-neo-lime',
  'neo-cyan': 'text-neo-cyan',
  'neo-purple': 'text-neo-purple',
  'neo-orange': 'text-neo-orange',
  'neo-red': 'text-neo-red',
  'neo-pink': 'text-neo-pink',
  'neo-yellow': 'text-neo-yellow',
};

/** Letters that orbit around a world node - uses localized world name */
export function WorldOrbitingLetters({
  worldId,
  worldName,
  isUnlocked,
  colorPrimary,
}: {
  worldId: number;
  worldName: string;
  isUnlocked: boolean;
  colorPrimary: string;
}): React.JSX.Element | null {
  const worldLetters = useMemo(() => {
    const chars = worldName
      .split('')
      .filter(char => /\p{L}/u.test(char))
      .map(char => char.toUpperCase());

    const uniqueChars = [...new Set(chars)];
    // Cap at 2 letters per world — 4 orbiting CSS animations per world × 10 worlds
    // was 40 simultaneous animations causing jank. 2 per world = 20 max, much smoother.
    const count = Math.min(2, uniqueChars.length);
    return uniqueChars.slice(0, count);
  }, [worldName]);

  if (!isUnlocked || worldLetters.length === 0) return null;

  return (
    <>
      {worldLetters.map((letter, i) => (
        <OrbitingLetter
          key={`${worldId}-${letter}-${i}`}
          letter={letter}
          radius={52 + i * 10}
          duration={8 + i * 3}
          delay={i * 2.5}
          clockwise={i % 2 === 0}
          color={COLOR_CLASSES[colorPrimary] || 'text-neo-white'}
        />
      ))}
    </>
  );
}

/** Dynamic SVG trail connector between worlds.
 *  The moving dot uses CSS offset-path instead of SMIL animateMotion —
 *  CSS animations are compositor-promoted while SMIL runs on the main thread. */
export function TrailPath({
  isUnlocked,
  fromLeft,
}: {
  isUnlocked: boolean;
  fromLeft: boolean;
}): React.JSX.Element {
  const leftX = 38;
  const rightX = 62;

  const path = fromLeft
    ? `M ${leftX} -5 C ${leftX} 25, ${rightX} 35, ${rightX} 65`
    : `M ${rightX} -5 C ${rightX} 25, ${leftX} 35, ${leftX} 65`;

  return (
    <div className="relative h-20 sm:h-24 w-full -my-2 lg:max-w-4xl lg:mx-auto overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {isUnlocked && (
          <path
            d={path}
            fill="none"
            stroke="#FFE135"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.15}
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={isUnlocked ? '#FFE135' : 'rgba(255,255,255,0.12)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={isUnlocked ? '0' : '10 8'}
          opacity={isUnlocked ? 0.7 : 1}
        />
      </svg>
      {/* CSS offset-path dot — compositor-accelerated, replaces SMIL animateMotion */}
      {isUnlocked && (
        <div
          className="world-map-trail-dot"
          style={{ '--trail-path': `path('${path}')` } as React.CSSProperties}
        />
      )}
    </div>
  );
}
