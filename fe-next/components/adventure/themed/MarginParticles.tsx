/**
 * MarginParticles Component
 *
 * SVG-based ambient particles constrained to screen MARGINS only.
 * Each world gets recognizable thematic shapes (leaves, snowflakes, crystals, etc.)
 * Never renders over the grid area — particles stay in the edges.
 *
 * Uses CSS animations (no JS animation frames) for zero main-thread cost.
 * Respects reduced motion preferences.
 * Max 6 particles visible at once for minimal cognitive load.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// ==============================================
// TYPES
// ==============================================

interface MarginParticlesProps {
  worldId: number;
  className?: string;
}

interface MarginParticle {
  id: number;
  edgePos: number;
  edge: 'top' | 'bottom' | 'left' | 'right';
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
  /** Rotation seed for visual variety */
  rotation: number;
}

// ==============================================
// WORLD PARTICLE CONFIG
// ==============================================

type ParticleShape = 'leaf' | 'droplet' | 'crystal' | 'shell' | 'ember'
  | 'spiral' | 'snowflake' | 'fourstar' | 'cloud' | 'flame';

interface WorldMarginConfig {
  shape: ParticleShape;
  colors: string[];
  count: number;
  sizeRange: [number, number];
  animation: 'drift-up' | 'drift-down' | 'drift-horizontal' | 'float';
}

const WORLD_MARGIN_CONFIGS: Record<number, WorldMarginConfig> = {
  1:  { shape: 'leaf',      colors: ['#90EE90', '#7CCD7C'], count: 5, sizeRange: [14, 22], animation: 'drift-up' },
  2:  { shape: 'droplet',   colors: ['#00DCFF', '#64DCFF'], count: 5, sizeRange: [10, 18], animation: 'drift-down' },
  3:  { shape: 'crystal',   colors: ['#A050FF', '#FF64C8'], count: 4, sizeRange: [14, 22], animation: 'float' },
  4:  { shape: 'shell',     colors: ['#FFC864', '#FFA050'], count: 5, sizeRange: [12, 20], animation: 'drift-horizontal' },
  5:  { shape: 'ember',     colors: ['#FF6432', '#FF5028'], count: 4, sizeRange: [8, 14],  animation: 'drift-up' },
  6:  { shape: 'spiral',    colors: ['#FF64B4', '#C864FF'], count: 4, sizeRange: [14, 20], animation: 'float' },
  7:  { shape: 'snowflake', colors: ['#C8E6FF', '#8CC8FF'], count: 5, sizeRange: [14, 22], animation: 'drift-down' },
  8:  { shape: 'fourstar',  colors: ['#8C78FF', '#C8A0FF'], count: 6, sizeRange: [10, 18], animation: 'float' },
  9:  { shape: 'cloud',     colors: ['#64FFC8', '#32C8B4'], count: 4, sizeRange: [18, 28], animation: 'drift-horizontal' },
  10: { shape: 'flame',     colors: ['#FFC832', '#FF961E'], count: 5, sizeRange: [12, 20], animation: 'drift-up' },
};

// ==============================================
// SVG PARTICLE SHAPES
// ==============================================

/** All shapes render inside a 20x20 viewBox, scaled by size prop */
function ParticleShape({ shape, color, size, opacity, rotation }: {
  shape: ParticleShape; color: string; size: number; opacity: number; rotation: number;
}) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    style: { opacity, transform: `rotate(${rotation}deg)` } as React.CSSProperties,
  };

  switch (shape) {
    // Meadows — a gentle leaf with stem and vein
    case 'leaf':
      return (
        <svg {...svgProps}>
          <path d="M10 2 Q16 6 16 12 Q14 18 10 18 Q6 18 4 12 Q4 6 10 2Z" fill={color} opacity="0.6" />
          <path d="M10 4 L10 16" stroke={color} strokeWidth="0.8" opacity="0.8" />
          <path d="M10 8 L7 6M10 11 L13 9M10 14 L7 12" stroke={color} strokeWidth="0.5" opacity="0.5" />
        </svg>
      );

    // Springs — teardrop water droplet with highlight
    case 'droplet':
      return (
        <svg {...svgProps}>
          <path d="M10 3 C10 3 5 9 5 12.5 C5 15.5 7.2 17 10 17 C12.8 17 15 15.5 15 12.5 C15 9 10 3 10 3Z" fill={color} opacity="0.5" />
          <ellipse cx="8" cy="11" rx="1.5" ry="2.5" fill="white" opacity="0.3" />
        </svg>
      );

    // Caverns — faceted gem with inner shine
    case 'crystal':
      return (
        <svg {...svgProps}>
          <path d="M10 2 L16 8 L14 18 L6 18 L4 8 Z" fill={color} opacity="0.5" />
          <path d="M10 2 L12 8 L10 18" stroke="white" strokeWidth="0.5" opacity="0.2" />
          <path d="M10 2 L8 8 L10 18" stroke="white" strokeWidth="0.5" opacity="0.15" />
          <path d="M4 8 L16 8" stroke="white" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );

    // Archipelago — spiral seashell
    case 'shell':
      return (
        <svg {...svgProps}>
          <path d="M10 4 C14 4 16 7 16 10 C16 14 13 16 10 16 C7 16 5 14 5 11 C5 8 7 7 9 7 C11 7 12 8 12 10 C12 12 11 13 10 13" stroke={color} strokeWidth="1.5" opacity="0.5" fill="none" />
          <circle cx="10" cy="10" r="1" fill={color} opacity="0.4" />
        </svg>
      );

    // Canyon — glowing ember dot with radial glow
    case 'ember':
      return (
        <svg {...svgProps}>
          <circle cx="10" cy="10" r="6" fill={color} opacity="0.12" />
          <circle cx="10" cy="10" r="3.5" fill={color} opacity="0.25" />
          <circle cx="10" cy="10" r="2" fill={color} opacity="0.5" />
          <circle cx="10" cy="10" r="1" fill="white" opacity="0.3" />
        </svg>
      );

    // Labyrinth — magical spiral/rune
    case 'spiral':
      return (
        <svg {...svgProps}>
          <path d="M10 4 C14 4 16 6 16 10 C16 14 14 16 10 16 C6 16 4 14 4 10 C4 7 6 6 8 6 C11 6 12 7 12 10 C12 12 10 13 9 12" stroke={color} strokeWidth="1.2" opacity="0.45" fill="none" strokeLinecap="round" />
          <circle cx="10" cy="10" r="1.5" fill={color} opacity="0.3" />
        </svg>
      );

    // Palace — 6-pointed snowflake
    case 'snowflake':
      return (
        <svg {...svgProps}>
          {/* 3 crossing lines */}
          <line x1="10" y1="2" x2="10" y2="18" stroke={color} strokeWidth="1" opacity="0.45" />
          <line x1="3.1" y1="6" x2="16.9" y2="14" stroke={color} strokeWidth="1" opacity="0.45" />
          <line x1="3.1" y1="14" x2="16.9" y2="6" stroke={color} strokeWidth="1" opacity="0.45" />
          {/* Branch tips */}
          <line x1="10" y1="2" x2="8.5" y2="4" stroke={color} strokeWidth="0.7" opacity="0.35" />
          <line x1="10" y1="2" x2="11.5" y2="4" stroke={color} strokeWidth="0.7" opacity="0.35" />
          <line x1="10" y1="18" x2="8.5" y2="16" stroke={color} strokeWidth="0.7" opacity="0.35" />
          <line x1="10" y1="18" x2="11.5" y2="16" stroke={color} strokeWidth="0.7" opacity="0.35" />
          {/* Center dot */}
          <circle cx="10" cy="10" r="1.2" fill={color} opacity="0.4" />
        </svg>
      );

    // Nebula — 4-pointed star with glow
    case 'fourstar':
      return (
        <svg {...svgProps}>
          <path d="M10 2 L11.5 8 L18 10 L11.5 12 L10 18 L8.5 12 L2 10 L8.5 8 Z" fill={color} opacity="0.4" />
          <path d="M10 5 L10.8 8.5 L14 10 L10.8 11.5 L10 15 L9.2 11.5 L6 10 L9.2 8.5 Z" fill="white" opacity="0.15" />
        </svg>
      );

    // Peaks — soft cloud wisp
    case 'cloud':
      return (
        <svg {...svgProps}>
          <ellipse cx="10" cy="12" rx="8" ry="4" fill={color} opacity="0.15" />
          <ellipse cx="7" cy="10" rx="5" ry="3.5" fill={color} opacity="0.12" />
          <ellipse cx="13" cy="10" rx="5" ry="3" fill={color} opacity="0.1" />
        </svg>
      );

    // Throne — candle flame with inner glow
    case 'flame':
      return (
        <svg {...svgProps}>
          <path d="M10 3 C10 3 14 8 14 12 C14 15 12 17 10 17 C8 17 6 15 6 12 C6 8 10 3 10 3Z" fill={color} opacity="0.4" />
          <path d="M10 7 C10 7 12 10 12 12.5 C12 14 11 15 10 15 C9 15 8 14 8 12.5 C8 10 10 7 10 7Z" fill="white" opacity="0.15" />
          <ellipse cx="10" cy="13" rx="1.5" ry="2" fill="white" opacity="0.1" />
        </svg>
      );

    default:
      return (
        <svg {...svgProps}>
          <circle cx="10" cy="10" r="5" fill={color} opacity="0.3" />
        </svg>
      );
  }
}

// ==============================================
// SEEDED RANDOM
// ==============================================

function seededRandom(seed: number): () => number {
  let t = seed + 0x6D2B79F5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==============================================
// COMPONENT
// ==============================================

const MarginParticles = memo<MarginParticlesProps>(({ worldId, className }) => {
  const { prefersReducedMotion } = useDevicePerformance();

  const config = WORLD_MARGIN_CONFIGS[worldId] || WORLD_MARGIN_CONFIGS[1];

  const particles = useMemo(() => {
    const edges: MarginParticle['edge'][] = ['top', 'bottom', 'left', 'right'];
    const random = seededRandom(worldId * 9999 + 42);
    const count = Math.min(config.count, 6);

    return Array.from({ length: count }, (_, i): MarginParticle => {
      const edge = edges[i % edges.length];
      const colorIdx = Math.floor(random() * config.colors.length);
      return {
        id: i,
        edgePos: 10 + random() * 80,
        edge,
        size: config.sizeRange[0] + random() * (config.sizeRange[1] - config.sizeRange[0]),
        duration: 6 + random() * 8,
        delay: random() * 6,
        opacity: 0.6 + random() * 0.3, // SVG shapes have their own internal opacity, so container can be higher
        color: config.colors[colorIdx],
        rotation: Math.floor(random() * 360),
      };
    });
  }, [worldId, config]);

  if (prefersReducedMotion) return null;

  function getPositionStyle(p: MarginParticle): React.CSSProperties {
    switch (p.edge) {
      case 'top':    return { top: '3%', left: `${p.edgePos}%` };
      case 'bottom': return { bottom: '3%', left: `${p.edgePos}%` };
      case 'left':   return { left: '2%', top: `${p.edgePos}%` };
      case 'right':  return { right: '2%', top: `${p.edgePos}%` };
    }
  }

  const animationName = `margin-${config.animation}`;

  return (
    <>
      <style jsx global>{`
        @keyframes margin-drift-up {
          0%, 100% { transform: translateY(0) scale(1); opacity: var(--p-opacity); }
          50% { transform: translateY(-24px) scale(1.08); opacity: calc(var(--p-opacity) * 1.2); }
        }
        @keyframes margin-drift-down {
          0%, 100% { transform: translateY(0) scale(1); opacity: var(--p-opacity); }
          50% { transform: translateY(18px) scale(1.05); opacity: calc(var(--p-opacity) * 1.15); }
        }
        @keyframes margin-drift-horizontal {
          0%, 100% { transform: translateX(0) scale(1); opacity: var(--p-opacity); }
          50% { transform: translateX(16px) scale(1.06); opacity: calc(var(--p-opacity) * 1.2); }
        }
        @keyframes margin-float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: var(--p-opacity); }
          33% { transform: translate(10px, -14px) scale(1.12); opacity: calc(var(--p-opacity) * 1.3); }
          66% { transform: translate(-8px, 6px) scale(0.94); opacity: calc(var(--p-opacity) * 0.85); }
        }
      `}</style>

      <div
        className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}
        aria-hidden="true"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              ...getPositionStyle(p),
              '--p-opacity': p.opacity,
              animation: `${animationName} ${p.duration}s ease-in-out ${p.delay}s infinite`,
              willChange: 'transform, opacity',
            } as React.CSSProperties}
          >
            <ParticleShape
              shape={config.shape}
              color={p.color}
              size={p.size}
              opacity={1} // container handles overall opacity via animation
              rotation={p.rotation}
            />
          </div>
        ))}
      </div>
    </>
  );
});

MarginParticles.displayName = 'MarginParticles';

export default MarginParticles;
