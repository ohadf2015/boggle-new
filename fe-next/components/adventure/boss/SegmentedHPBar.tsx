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
 * - Floating damage numbers on HP drop
 * - Phase transition flash at 66% and 33% thresholds
 * - Intensified red outer glow when HP is critically low (< 25%)
 * - Swords icon next to boss name when enraged
 * - Boss name above the bar with HP numbers
 * - Neo-brutalist: border-3, shadow-hard, rounded-neo
 * - Phase indicator badge
 * - ARIA progressbar for accessibility
 */

'use client';

import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Swords } from 'lucide-react';
import PhaseIndicator from './PhaseIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

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
    labelKey: 'adventure.hpBar.enragedZone',
  },
  {
    id: 2 as const,
    minThreshold: THRESHOLDS.ENRAGED,
    maxThreshold: THRESHOLDS.PHASE2,
    color: 'bg-neo-lime',
    labelKey: 'adventure.hpBar.phase2Zone',
  },
  {
    id: 3 as const,
    minThreshold: THRESHOLDS.PHASE2,
    maxThreshold: THRESHOLDS.FULL,
    color: 'bg-lime-500',
    labelKey: 'adventure.hpBar.phase1Zone',
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
  labelKey: string;
  isLowHP: boolean;
}

/**
 * Individual HP segment with animated fill and RPG-style chunked look.
 */
const Segment = memo<SegmentProps>(({ id, fill, color, labelKey, isLowHP }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { t } = useLanguage();
  return (
    <div
      data-segment={id}
      data-fill={fill}
      className="relative flex-1 h-full bg-neo-navy-light overflow-hidden"
      aria-label={t(labelKey)}
    >
      <AdaptiveMotion.div
        data-fill-bar
        className={`
          absolute inset-y-0 inset-s-0 h-full
          ${color}
          transition-all duration-300 ease-out
          motion-reduce:transition-none
        `.trim().replace(/\s+/g, ' ')}
        initial={{ width: `${fill}%` }}
        animate={{
          width: `${fill}%`,
          // Pulse opacity when HP is critically low (disabled for reduced motion)
          opacity: isLowHP && fill > 0 && !prefersReducedMotion ? [1, 0.55, 1] : 1,
        }}
        transition={{
          width: { type: 'spring', stiffness: 200, damping: 20 },
          opacity: isLowHP && fill > 0 && !prefersReducedMotion
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
      </AdaptiveMotion.div>
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
      style={{ insetInlineStart: `${threshold}%` }}
      aria-hidden="true"
    />
  );
});

Divider.displayName = 'Divider';

interface FloatingDamageNumberProps {
  id: number;
  amount: number;
}

/** Floating "-N" damage number that rises and fades */
const FloatingDamageNumber = memo<FloatingDamageNumberProps>(({ id, amount }) => (
  <AdaptiveMotion.div
    key={id}
    className="absolute -top-2 inset-e-2 pointer-events-none z-20"
    initial={{ y: 0, opacity: 1 }}
    animate={{ y: -28, opacity: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
    aria-hidden="true"
  >
    <span className="font-neo-display text-sm font-black text-neo-red drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
      -{amount}
    </span>
  </AdaptiveMotion.div>
));

FloatingDamageNumber.displayName = 'FloatingDamageNumber';

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
  const prefersReducedMotion = usePrefersReducedMotion();

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
  const prevHpPctRef = useRef(hpPercentage);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPhaseFlashing, setIsPhaseFlashing] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const damageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Floating damage numbers state
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; amount: number }[]>([]);
  const damageIdRef = useRef(0);

  useEffect(() => {
    const prevHP = prevHPRef.current;
    const prevPct = prevHpPctRef.current;

    if (currentHP < prevHP) {
      const delta = prevHP - currentHP;

      // Hit flash
      setIsFlashing(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 200);

      // Floating damage number
      const newId = ++damageIdRef.current;
      setDamageNumbers(prev => [...prev, { id: newId, amount: delta }]);
      if (damageTimeoutRef.current) clearTimeout(damageTimeoutRef.current);
      damageTimeoutRef.current = setTimeout(() => {
        setDamageNumbers(prev => prev.filter(n => n.id !== newId));
      }, 900);

      // Phase transition flash — crossed 66% or 33% threshold
      const crossedPhase2 = prevPct >= THRESHOLDS.PHASE2 && hpPercentage < THRESHOLDS.PHASE2;
      const crossedEnraged = prevPct >= THRESHOLDS.ENRAGED && hpPercentage < THRESHOLDS.ENRAGED;
      if (crossedPhase2 || crossedEnraged) {
        setIsPhaseFlashing(true);
        if (phaseFlashTimeoutRef.current) clearTimeout(phaseFlashTimeoutRef.current);
        phaseFlashTimeoutRef.current = setTimeout(() => setIsPhaseFlashing(false), 400);
      }
    }

    prevHPRef.current = currentHP;
    prevHpPctRef.current = hpPercentage;

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (phaseFlashTimeoutRef.current) clearTimeout(phaseFlashTimeoutRef.current);
      if (damageTimeoutRef.current) clearTimeout(damageTimeoutRef.current);
    };
  }, [currentHP, hpPercentage]);

  const displayHP = Math.max(0, currentHP);

  return (
    <div className="w-full">
      {/* Header: Boss name + Phase indicator — compact single line */}
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1 min-w-0">
          <h2 className="font-neo-display text-xs sm:text-sm font-black text-neo-white truncate">
            {t(bossName) || bossName}
          </h2>
          {/* Swords icon when enraged */}
          {phase === 'enraged' && (
            <AdaptiveMotion.span
              animate={prefersReducedMotion ? {} : { rotate: [-8, 8, -8], scale: [1, 1.15, 1] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, repeat: Infinity }}
              aria-hidden="true"
            >
              <Swords className="w-3.5 h-3.5 text-neo-red shrink-0" />
            </AdaptiveMotion.span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* HP numbers */}
          <span
            className={`font-mono text-[10px] sm:text-xs font-bold tabular-nums ${
              isLowHP ? 'text-neo-red' : 'text-neo-white'
            }`}
          >
            {displayHP} / {maxHP}
          </span>
          <PhaseIndicator phase={phase} />
        </div>
      </div>

      {/* HP Bar Container */}
      <AdaptiveMotion.div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hpPercentage}
        aria-label={t('adventure.hpBar.healthLabel', { bossName: t(bossName) || bossName, percentage: hpPercentage })}
        data-testid="segmented-hp-bar"
        className={`
          relative w-full h-5 sm:h-6
          border-3 border-neo-black rounded-neo
          shadow-hard
          overflow-hidden flex
        `}
        animate={
          isPhaseFlashing
            ? { backgroundColor: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'], scale: [1, 1.03, 1] }
            : isFlashing
              ? { backgroundColor: ['rgba(255,255,255,0.5)', 'rgba(0,0,0,0)'] }
              : {}
        }
        transition={
          isPhaseFlashing
            ? { duration: 0.4 }
            : isFlashing
              ? { duration: 0.2 }
              : {}
        }
      >
        {/* Segments */}
        {segmentFills.map(segment => (
          <Segment
            key={segment.id}
            id={segment.id}
            fill={segment.fill}
            color={segment.color}
            labelKey={segment.labelKey}
            isLowHP={isLowHP}
          />
        ))}

        {/* Dividers at 33% and 66% */}
        <Divider threshold={33} />
        <Divider threshold={66} />

        {/* Low HP outer glow — intensifies as HP decreases (static for reduced motion) */}
        {isLowHP && !prefersReducedMotion && (
          <AdaptiveMotion.div
            className="absolute inset-0 rounded-neo pointer-events-none"
            style={{
              boxShadow: `inset 0 0 ${18 + (1 - hpPercentage / 25) * 14}px rgba(255,0,0,0.95), 0 0 ${24 + (1 - hpPercentage / 25) * 20}px rgba(255,0,0,0.8)`,
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {isLowHP && prefersReducedMotion && (
          <div className="absolute inset-0 rounded-neo pointer-events-none border-2 border-neo-red" />
        )}

        {/* Floating damage numbers */}
        <AdaptiveAnimatePresence>
          {damageNumbers.map(n => (
            <FloatingDamageNumber key={n.id} id={n.id} amount={n.amount} />
          ))}
        </AdaptiveAnimatePresence>
      </AdaptiveMotion.div>
    </div>
  );
});

SegmentedHPBar.displayName = 'SegmentedHPBar';

export default SegmentedHPBar;
