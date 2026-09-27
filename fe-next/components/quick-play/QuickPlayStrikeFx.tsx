'use client';

/**
 * Electric strike + shockwave overlay for Quick Play mode select.
 * Pure presentational — parent owns strikeMode timing.
 */
import { useMemo } from 'react';
import { lightningPolyline } from './lightningPath';
import { nodeOffset } from './wheelGeometry';
import type { QuickMode } from './types';
import { NODE_COLORS } from './modeColors';

const MODE_SEED: Record<QuickMode, number> = {
  classic: 11,
  blast: 22,
  'word-hunt': 33,
  'wheel-rush': 44,
};

interface QuickPlayStrikeFxProps {
  mode: QuickMode;
  size: number;
  ringRadius: number;
  scale: number;
  knobSize: number;
  reduceMotion: boolean;
}

export function QuickPlayStrikeFx({
  mode,
  size,
  ringRadius,
  scale,
  knobSize,
  reduceMotion,
}: QuickPlayStrikeFxProps) {
  const half = size / 2;
  const hex = NODE_COLORS[mode].hex;
  const boltPoints = useMemo(() => {
    const { x, y } = nodeOffset(mode, ringRadius);
    return lightningPolyline(
      { x: half, y: half },
      { x: half + x, y: half + y },
      {
        segments: 8,
        jitter: Math.max(6, 12 * scale),
        seed: MODE_SEED[mode],
      }
    );
  }, [mode, ringRadius, scale, half]);

  return (
    <>
      <div
        aria-hidden
        data-testid="quick-wheel-shockwave"
        className="pointer-events-none absolute inset-0 z-[5]"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border-2"
            style={{
              width: knobSize * 0.4,
              height: knobSize * 0.4,
              marginLeft: -(knobSize * 0.2),
              marginTop: -(knobSize * 0.2),
              borderColor: hex,
              boxShadow: `0 0 12px ${hex}, inset 0 0 8px ${hex}`,
              animation: reduceMotion
                ? undefined
                : `quick-shockwave 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 0.1}s both`,
              opacity: reduceMotion ? 0.35 : undefined,
              transform: reduceMotion ? `scale(${1.6 + i * 0.5})` : undefined,
            }}
          />
        ))}
      </div>

      <svg
        aria-hidden
        data-testid="quick-wheel-lightning"
        className="pointer-events-none absolute inset-0 z-[6] overflow-visible"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <filter id={`quick-bolt-glow-${mode}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Outer bloom */}
        <polyline
          points={boltPoints}
          fill="none"
          stroke={hex}
          strokeWidth={Math.max(14, 18 * scale)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.45}
          filter={`url(#quick-bolt-glow-${mode})`}
        />
        {/* Colored core */}
        <polyline
          points={boltPoints}
          fill="none"
          stroke={hex}
          strokeWidth={Math.max(5, 7 * scale)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={reduceMotion ? undefined : 'quick-bolt-draw'}
          filter={`url(#quick-bolt-glow-${mode})`}
        />
        {/* Hot white core */}
        <polyline
          points={boltPoints}
          fill="none"
          stroke="#ffffff"
          strokeWidth={Math.max(2, 2.6 * scale)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={reduceMotion ? undefined : 'quick-bolt-draw'}
        />
      </svg>

      {/* Keyframes once per mount — plain style tag (no styled-jsx) for vitest + Next. */}
      <style>{`
        @keyframes quick-shockwave {
          0% { transform: scale(0.4); opacity: 0.95; }
          100% { transform: scale(4.2); opacity: 0; }
        }
        @keyframes quick-bolt-draw-kf {
          from { stroke-dashoffset: 320; opacity: 0.2; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        .quick-bolt-draw {
          stroke-dasharray: 320;
          stroke-dashoffset: 320;
          animation: quick-bolt-draw-kf 0.35s ease-out forwards;
        }
        /* .quick-node-zap / .quick-knob-pulse used to be redefined here, and
           because this tag mounts only during a strike it silently overrode
           the globals.css versions — two definitions, and the weaker one won
           exactly when it mattered. They now live once, in globals.css,
           alongside the wheel's other three beats. */
        @media (prefers-reduced-motion: reduce) {
          .quick-bolt-draw { animation: none !important; }
        }
      `}</style>
    </>
  );
}
