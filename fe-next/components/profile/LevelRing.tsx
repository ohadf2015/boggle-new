'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Level-progress ring that orbits the avatar.
 *
 * Renders as a concentric SVG ring sitting just OUTSIDE the avatar box, so it
 * never fights an equipped cosmetic frame (which lives inside the avatar). The
 * arc length encodes % progress to the next level; it draws on at mount.
 */

export type RingColor = 'cyan' | 'lime' | 'pink' | 'purple' | 'yellow';

const RING_HEX: Record<RingColor, string> = {
  cyan: '#00FFFF',
  lime: '#BFFF00',
  pink: '#FF1493',
  purple: '#8B5CF6',
  yellow: '#FFE135',
};

/** SVG viewBox radius — leaves headroom for the stroke width. */
const VIEW_RADIUS = 46;

/**
 * Pure geometry: turn a 0–100 percentage into a stroke dash offset for a
 * circle of the given radius. Clamped so out-of-range XP never breaks the arc.
 */
export function computeRingDash(
  percent: number,
  radius: number = VIEW_RADIUS,
): { circumference: number; offset: number } {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  return { circumference, offset };
}

interface LevelRingProps {
  /** 0–100 progress to next level. */
  percent: number;
  /** Pixel size of the inner avatar slot. */
  size: number;
  children: React.ReactNode;
  color?: RingColor;
  /** Overrides `color` with an arbitrary hex (e.g. the player's chosen accent). */
  colorHex?: string | null;
  isMaxLevel?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function LevelRing({
  percent,
  size,
  children,
  color = 'cyan',
  colorHex,
  isMaxLevel = false,
  ariaLabel,
  className,
}: LevelRingProps): React.ReactNode {
  const reduced = useReducedMotion();
  const stroke = isMaxLevel ? RING_HEX.yellow : (colorHex || RING_HEX[color]);
  const { circumference, offset } = computeRingDash(isMaxLevel ? 100 : percent);

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* Ring sits 5px outside the avatar on every edge — concentric, never
          overlapping an equipped frame. */}
      <svg
        viewBox="0 0 100 100"
        className="absolute pointer-events-none -inset-[6px] w-[calc(100%+12px)] h-[calc(100%+12px)] -rotate-90 rtl:rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={VIEW_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={5}
        />
        {/* Progress arc */}
        <m.circle
          cx="50"
          cy="50"
          r={VIEW_RADIUS}
          fill="none"
          stroke={stroke}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            filter: isMaxLevel
              ? `drop-shadow(0 0 4px ${stroke})`
              : undefined,
          }}
        />
      </svg>

      {/* Avatar slot */}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

export default LevelRing;
