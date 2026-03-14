'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CIRCLE_RADIUS,
  CIRCLE_CIRCUMFERENCE,
  type ComboStreakState,
} from './hooks/useBlastComboStreak';

// ==================== Types ====================

export interface BlastComboStreakBadgeProps {
  streak: ComboStreakState;
  /** Ref attached to the SVG countdown arc — driven by hook via DOM mutation */
  arcRef: React.RefObject<SVGCircleElement | null>;
}

// ==================== Constants ====================

/** Badge diameter in px */
const BADGE_SIZE = 56;
const STROKE_WIDTH = 2;

// ==================== Tier system ====================

type StreakTier = 'green' | 'yellow' | 'red';

function getTier(level: number): StreakTier {
  if (level >= 5) return 'red';
  if (level >= 3) return 'yellow';
  return 'green';
}

const TIER_BG: Record<StreakTier, string> = {
  green: 'bg-green-400',
  yellow: 'bg-neo-yellow',
  red: 'bg-neo-orange',
};

const TIER_STROKE: Record<StreakTier, string> = {
  green: '#16a34a',  // green-600
  yellow: '#d97706', // amber-600
  red: '#dc2626',    // red-600
};

// ==================== Sub-components ====================

/**
 * SVG countdown arc that drains clockwise as time runs out.
 * The active circle's strokeDashoffset is driven directly by the hook via arcRef
 * (DOM mutation at 60fps) — no React re-renders needed for smooth animation.
 */
function CountdownArc({
  tier,
  reducedMotion,
  arcRef,
}: {
  tier: StreakTier;
  reducedMotion: boolean;
  arcRef: React.RefObject<SVGCircleElement | null>;
}) {
  return (
    <svg
      width={BADGE_SIZE}
      height={BADGE_SIZE}
      className="absolute inset-0 rotate-[-90deg]"
      aria-hidden="true"
    >
      {/* Track (background arc) */}
      <circle
        cx={BADGE_SIZE / 2}
        cy={BADGE_SIZE / 2}
        r={CIRCLE_RADIUS}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={STROKE_WIDTH}
      />
      {/* Active arc — ref-driven by useBlastComboStreak hook */}
      <circle
        ref={arcRef}
        cx={BADGE_SIZE / 2}
        cy={BADGE_SIZE / 2}
        r={CIRCLE_RADIUS}
        fill="none"
        stroke={TIER_STROKE[tier]}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCLE_CIRCUMFERENCE}
        strokeDashoffset={reducedMotion ? 0 : 0}
      />
    </svg>
  );
}

// ==================== Animation variants ====================

const ENTRANCE_VARIANTS = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.3, 1.0],
    opacity: 1,
    transition: { duration: 0.2, times: [0, 0.7, 1.0] },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const REDUCED_MOTION_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

// ==================== Component ====================

/**
 * BlastComboStreakBadge — floating neo-brutalist badge showing current combo level.
 *
 * Performance: The countdown arc is driven via direct DOM mutation (arcRef)
 * at 60fps by the useBlastComboStreak hook. This component only re-renders
 * when level or isActive changes (~once per word), not 60 times per second.
 */
export function BlastComboStreakBadge({ streak, arcRef }: BlastComboStreakBadgeProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  if (!streak.isActive) return null;

  const tier = getTier(streak.level);
  const bgClass = TIER_BG[tier];
  const variants = shouldReduceMotion ? REDUCED_MOTION_VARIANTS : ENTRANCE_VARIANTS;

  return (
    <AnimatePresence>
      <motion.div
        key={`streak-${streak.level}`}
        data-testid="combo-streak-badge"
        data-tier={tier}
        className={[
          'relative flex items-center justify-center',
          'border-3 border-neo-black shadow-hard-sm rounded-full',
          bgClass,
        ].join(' ')}
        style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
        variants={variants}
        initial="initial"
        animate={!shouldReduceMotion && streak.level > 1
          ? { scale: [1.0, 1.15, 1.0], opacity: 1, transition: { duration: 0.15 } }
          : "animate"
        }
        exit="exit"
      >
        {/* Countdown arc overlay — driven by arcRef, no re-renders */}
        <CountdownArc
          tier={tier}
          reducedMotion={shouldReduceMotion}
          arcRef={arcRef}
        />

        {/* Combo level text */}
        <span
          className="relative z-10 font-neo-display font-bold text-neo-black select-none"
          style={{ fontSize: streak.level >= 10 ? '13px' : '15px' }}
        >
          x{streak.level}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
