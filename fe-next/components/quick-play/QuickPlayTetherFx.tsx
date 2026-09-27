'use client';

/**
 * Lightning tether from hub knob to the hovered/selected mode node during
 * drag. Replaces the old straight rotated bar — jagged bolt, glow, per-mode
 * color, subtle crackle while held. Hidden once the strike fires (see
 * QuickPlayStrikeFx for the post-release effect).
 */
import { useMemo } from 'react';
import { lightningPolyline } from './lightningPath';
import { nodeOffset } from './wheelGeometry';
import type { QuickMode } from './types';
import { NODE_COLORS } from './modeColors';

const MODE_SEED: Record<QuickMode, number> = {
  classic: 5,
  blast: 15,
  'word-hunt': 25,
  'wheel-rush': 35,
};

interface QuickPlayTetherFxProps {
  mode: QuickMode;
  size: number;
  ringRadius: number;
  scale: number;
  reduceMotion: boolean;
}

export function QuickPlayTetherFx({ mode, size, ringRadius, scale, reduceMotion }: QuickPlayTetherFxProps) {
  const half = size / 2;
  const hex = NODE_COLORS[mode].hex;
  const points = useMemo(() => {
    const { x, y } = nodeOffset(mode, ringRadius);
    return lightningPolyline(
      { x: half, y: half },
      { x: half + x, y: half + y },
      { segments: 6, jitter: Math.max(4, 8 * scale), seed: MODE_SEED[mode] }
    );
  }, [mode, ringRadius, scale, half]);

  return (
    <svg
      aria-hidden
      data-testid="quick-wheel-tether"
      className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <defs>
        <filter id={`quick-tether-glow-${mode}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Outer bloom */}
      <polyline
        points={points}
        fill="none"
        stroke={hex}
        strokeWidth={Math.max(8, 10 * scale)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
        filter={`url(#quick-tether-glow-${mode})`}
      />
      {/* Colored core, crackling while held */}
      <polyline
        points={points}
        fill="none"
        stroke={hex}
        strokeWidth={Math.max(3, 4 * scale)}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={reduceMotion ? undefined : 'quick-tether-arc'}
        filter={`url(#quick-tether-glow-${mode})`}
      />
      <style>{`
        @keyframes quick-tether-arc-kf {
          0%, 100% { opacity: 0.85; }
          45% { opacity: 1; }
          55% { opacity: 0.55; }
        }
        .quick-tether-arc { animation: quick-tether-arc-kf 260ms steps(2) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .quick-tether-arc { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}
