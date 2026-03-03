/**
 * SegmentedHPBar Component
 *
 * Neo-brutalist RPG-style segmented health bar for boss battles.
 * Three phase-based segments (0-33%, 33-66%, 66-100%) with:
 *
 * Features:
 * - Chunked/segmented HP display (old-school RPG style)
 * - Color gradient per segment: red (danger) → lime (phase 2) → green (phase 1)
 * - Flash animation on hit
 * - Glow/pulse when HP is critically low (< 25%)
 * - Boss name above the bar with HP numbers
 * - Neo-brutalist: border-3, shadow-hard, rounded-neo
 * - Phase indicator badge
 * - ARIA progressbar for accessibility
 */

'use client';

import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import PhaseIndicator from './PhaseIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';

// ==============================================
// TYPES
// ==============================================

export interface SegmentedHPBarProps {
  /** Current HP value */
  currentHP: number;
  /** Maximum HP value */
  maxHP: number;
  /** Current boss phase */
  phase: 'phase1' | 'phase2' | 'enraged';
  /** Boss name translation key */
  bossName: string;
}

// ==============================================
// CONSTANTS
// ==============================================

/**
 * Phase threshold percentages
 */
const THRESHOLDS = {
  /** Below this % = enraged (segment 1 only) */
  ENRAGED: 33,
  /** Below this % = phase2 (segments 1-2) */
  PHASE2: 66,
  /** Full HP (segments 1-3) */
  FULL: 100,
};

/** HP fraction below which segment glows/pulses */
const LOW_HP_THRESHOLD = 0.25;

/**
 * Segment configuration — colors chosen to match phase/danger progression.
 * Segment 1 (0-33%): red (enraged danger zone)
 * Segment 2 (33-66%): lime (phase 2)
 * Segment 3 (66-100%): lime-500 (healthy phase 1)
 */
const SEGMENTS = [
  {
    id: 1 as const,
    minThreshold: 0,
    maxThreshold: THRESHOLDS.ENRAGED,
    color: 'bg-neo-red',
    label: 'Enraged zone',
  },
  {
    id: 2 as const,
    minThreshold: THRESHOLDS.ENRAGED,
    maxThreshold: THRESHOLDS.PHASE2,
    color: 'bg-neo-lime',
    label: 'Phase 2 zone',
  },
  {
    id: 3 as const,
    minThreshold: THRESHOLDS.PHASE2,
    maxThreshold: THRESHOLDS.FULL,
    color: 'bg-lime-500',
    label: 'Phase 1 zone',
  },
];

// ==============================================
// HELPERS
// ==============================================

function calculateHpPercentage(currentHP: number, maxHP: number): number {
  if (maxHP <= 0) return 0;
  const percentage = (currentHP / maxHP) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

function calculateSegmentFill(
  hpPercentage: number,
  minThreshold: number,
  maxThreshold: number
): number {
  if (hpPercentage <= minThreshold) {
    return 0;
  }
  if (hpPercentage >= maxThreshold) {
    return 100;
  }
  const segmentRange = maxThreshold - minThreshold;
  const hpWithinSegment = hpPercentage - minThreshold;
  return Math.round((hpWithinSegment / segmentRange) * 100);
}

// ==============================================
// SUBCOMPONENTS
// ==============================================

interface SegmentProps {
  id: 1 | 2 | 3;
  fill: number;
  color: string;
  label: string;
  isLowHP: boolean;
}

/**
 * Individual HP segment with animated fill and RPG-style chunked look.
 */
const Segment = memo<SegmentProps>(({ id, fill, color, label, isLowHP }) => {
  return (
    <div
      data-segment={id}
      data-fill={fill}
      className="relative flex-1 h-full bg-neo-navy-light overflow-hidden"
      aria-label={label}
    >
      <motion.div
        data-fill-bar
        className={`
          absolute inset-y-0 left-0 h-full
          ${color}
          transition-all duration-300 ease-out
          motion-reduce:transition-none
        `.trim().replace(/\s+/g, ' ')}
        initial={{ width: `${fill}%` }}
        animate={{
          width: `${fill}%`,
          // Pulse opacity when HP is critically low
          opacity: isLowHP && fill > 0 ? [1, 0.55, 1] : 1,
        }}
        transition={{
          width: { type: 'spring', stiffness: 200, damping: 20 },
          opacity: isLowHP && fill > 0
            ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0 },
        }}
      >
        {/* Shine overlay for visual depth */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-white/25 pointer-events-none" />
        {/* Chunked RPG-style inner dividers - subtle notches within segment */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(0,0,0,0.15) 11px, rgba(0,0,0,0.15) 12px)',
          }}
        />
      </motion.div>
    </div>
  );
});

Segment.displayName = 'Segment';

interface DividerProps {
  threshold: 33 | 66;
}

/**
 * Divider line between segments
 */
const Divider = memo<DividerProps>(({ threshold }) => {
  return (
    <div
      data-divider
      data-threshold={threshold}
      className="absolute top-0 bottom-0 w-[3px] bg-neo-black z-10"
      style={{ left: `${threshold}%` }}
      aria-hidden="true"
    />
  );
});

Divider.displayName = 'Divider';

// ==============================================
// MAIN COMPONENT
// ==============================================

const SegmentedHPBar = memo<SegmentedHPBarProps>(({
  currentHP,
  maxHP,
  phase,
  bossName,
}) => {
  const { t } = useLanguage();
  const bossFightTheme = useBossFightTheme();

  const hpPercentage = useMemo(
    () => calculateHpPercentage(currentHP, maxHP),
    [currentHP, maxHP]
  );

  const isLowHP = hpPercentage <= LOW_HP_THRESHOLD * 100;

  // Override segment colors with theme-derived colors
  const themedSegments = useMemo(() => {
    const [seg1Color, seg2Color, seg3Color] = bossFightTheme.hpSegmentColors;
    return SEGMENTS.map((segment, i) => ({
      ...segment,
      color: i === 0 ? seg1Color : i === 1 ? seg2Color : seg3Color,
    }));
  }, [bossFightTheme.hpSegmentColors]);

  const segmentFills = useMemo(() => {
    return themedSegments.map(segment => ({
      ...segment,
      fill: calculateSegmentFill(
        hpPercentage,
        segment.minThreshold,
        segment.maxThreshold
      ),
    }));
  }, [hpPercentage, themedSegments]);

  // Flash effect when HP drops
  const prevHPRef = useRef(currentHP);
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentHP < prevHPRef.current) {
      setIsFlashing(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 200);
    }
    prevHPRef.current = currentHP;

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [currentHP]);

  const displayHP = Math.max(0, currentHP);

  return (
    <div className="w-full">
      {/* Header: Boss name + Phase indicator */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-neo-display text-sm sm:text-base font-black text-neo-white truncate">
          {t(bossName) || bossName}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* HP numbers */}
          <span
            className={`font-mono text-xs font-bold tabular-nums ${
              isLowHP ? 'text-neo-red' : 'text-neo-white/70'
            }`}
          >
            {displayHP} / {maxHP}
          </span>
          <PhaseIndicator phase={phase} />
        </div>
      </div>

      {/* HP Bar Container */}
      <motion.div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hpPercentage}
        aria-label={`${t(bossName) || bossName} health: ${hpPercentage}%`}
        data-testid="segmented-hp-bar"
        className={`
          relative w-full h-6 sm:h-7
          border-3 border-neo-black rounded-neo
          shadow-hard
          overflow-hidden flex
        `}
        animate={
          isFlashing
            ? { backgroundColor: ['rgba(255,255,255,0.5)', 'rgba(0,0,0,0)'] }
            : {}
        }
        transition={isFlashing ? { duration: 0.2 } : {}}
      >
        {/* Segments */}
        {segmentFills.map(segment => (
          <Segment
            key={segment.id}
            id={segment.id}
            fill={segment.fill}
            color={segment.color}
            label={segment.label}
            isLowHP={isLowHP}
          />
        ))}

        {/* Dividers at 33% and 66% */}
        <Divider threshold={33} />
        <Divider threshold={66} />

        {/* Low HP outer glow */}
        {isLowHP && (
          <motion.div
            className="absolute inset-0 rounded-neo pointer-events-none"
            animate={{
              boxShadow: [
                'inset 0 0 6px rgba(255,0,0,0.5)',
                'inset 0 0 14px rgba(255,0,0,0.8)',
                'inset 0 0 6px rgba(255,0,0,0.5)',
              ],
            }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </div>
  );
});

SegmentedHPBar.displayName = 'SegmentedHPBar';

export default SegmentedHPBar;
