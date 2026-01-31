/**
 * SegmentedHPBar Component
 *
 * 3-segment HP bar for boss battles showing phase thresholds.
 * Segments correspond to boss phases:
 * - Segment 1 (0-33%): Red - Enraged phase
 * - Segment 2 (33-66%): Lime - Phase 2
 * - Segment 3 (66-100%): Green - Phase 1
 *
 * Features:
 * - Smooth fill animations with framer-motion
 * - Phase indicator badge integration
 * - Neo-brutalist styling
 * - Respects reduced motion preferences
 * - ARIA progressbar for accessibility
 */

'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import PhaseIndicator from './PhaseIndicator';
import { useLanguage } from '@/contexts/LanguageContext';

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
 * Phase threshold percentages (from bossStateMachine types)
 */
const THRESHOLDS = {
  /** Below this % = enraged (segment 1 only) */
  ENRAGED: 33,
  /** Below this % = phase2 (segments 1-2) */
  PHASE2: 66,
  /** Full HP (segments 1-3) */
  FULL: 100,
};

/**
 * Segment configuration
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

/**
 * Calculate HP percentage (clamped 0-100)
 */
function calculateHpPercentage(currentHP: number, maxHP: number): number {
  if (maxHP <= 0) return 0;
  const percentage = (currentHP / maxHP) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

/**
 * Calculate fill percentage for a segment (0-100)
 */
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

  // Calculate partial fill
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
}

/**
 * Individual HP segment with animated fill
 */
const Segment = memo<SegmentProps>(({ id, fill, color, label }) => {
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
        animate={{ width: `${fill}%` }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
        }}
      />
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
      className="absolute top-0 bottom-0 w-[2px] bg-neo-black z-10"
      style={{ left: `${threshold}%` }}
      aria-hidden="true"
    />
  );
});

Divider.displayName = 'Divider';

// ==============================================
// MAIN COMPONENT
// ==============================================

/**
 * SegmentedHPBar - 3-segment HP bar with phase indicators
 */
const SegmentedHPBar = memo<SegmentedHPBarProps>(({
  currentHP,
  maxHP,
  phase,
  bossName,
}) => {
  const { t } = useLanguage();

  // Calculate HP percentage
  const hpPercentage = useMemo(
    () => calculateHpPercentage(currentHP, maxHP),
    [currentHP, maxHP]
  );

  // Calculate fill for each segment
  const segmentFills = useMemo(() => {
    return SEGMENTS.map(segment => ({
      ...segment,
      fill: calculateSegmentFill(
        hpPercentage,
        segment.minThreshold,
        segment.maxThreshold
      ),
    }));
  }, [hpPercentage]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-3">
      {/* Header: Boss name + Phase indicator */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t(bossName)}
        </h2>
        <PhaseIndicator phase={phase} />
      </div>

      {/* HP Bar Container */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hpPercentage}
        aria-label={`${t(bossName)} health: ${hpPercentage}%`}
        data-testid="segmented-hp-bar"
        className="relative w-full h-8 border-3 border-neo-black rounded-neo shadow-hard overflow-hidden flex"
      >
        {/* Segments */}
        {segmentFills.map(segment => (
          <Segment
            key={segment.id}
            id={segment.id}
            fill={segment.fill}
            color={segment.color}
            label={segment.label}
          />
        ))}

        {/* Dividers at 33% and 66% */}
        <Divider threshold={33} />
        <Divider threshold={66} />

        {/* HP text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-neo-display text-sm font-bold text-neo-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-20">
            {Math.max(0, currentHP)} / {maxHP}
          </span>
        </div>
      </div>
    </div>
  );
});

SegmentedHPBar.displayName = 'SegmentedHPBar';

export default SegmentedHPBar;
