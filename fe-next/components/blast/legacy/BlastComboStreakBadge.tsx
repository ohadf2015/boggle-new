'use client';

import { memo } from 'react';
import { CIRCLE_RADIUS, CIRCLE_CIRCUMFERENCE, type ComboStreakState } from './hooks/useBlastComboStreak';


interface BlastComboStreakBadgeProps {
  streak: ComboStreakState;
  /** Ref forwarded to the SVG circle — useBlastComboStreak drives strokeDashoffset via RAF */
  arcRef: React.RefObject<SVGCircleElement | null>;
}

const SIZE = (CIRCLE_RADIUS + 4) * 2; // 4px padding for stroke width

/** Streak colour ramps — matches neo-brutalist palette */
function getStreakColor(level: number): string {
  if (level >= 8) return '#FF1493'; // neo-pink — legendary
  if (level >= 5) return '#FFD700'; // gold — epic
  if (level >= 3) return '#BFFF00'; // neo-lime — great
  return '#00FFFF';                 // neo-cyan — active
}

/**
 * BlastComboStreakBadge — circular countdown arc showing combo streak level.
 *
 * The arc's strokeDashoffset is mutated directly via arcRef at 60fps by useBlastComboStreak,
 * so this component re-renders only when level/isActive changes (~once per word).
 */
export const BlastComboStreakBadge = memo(function BlastComboStreakBadge({
  streak,
  arcRef,
}: BlastComboStreakBadgeProps) {
  if (!streak.isActive) return null;

  const color = getStreakColor(streak.level);

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: SIZE, height: SIZE }}
      aria-label={`Combo streak level ${streak.level}`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={3}
        />
        {/* Countdown arc — driven by useBlastComboStreak via arcRef */}
        <circle
          ref={arcRef}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={CIRCLE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={0}
          style={{
            filter: `drop-shadow(0 0 4px ${color})`,
            transition: 'stroke 200ms ease',
          }}
        />
      </svg>
      {/* Level number */}
      <span
        className="relative z-10 text-xs font-black tabular-nums leading-none"
        style={{ color, textShadow: `0 0 6px ${color}` }}
      >
        x{streak.level}
      </span>
    </div>
  );
});

export default BlastComboStreakBadge;
