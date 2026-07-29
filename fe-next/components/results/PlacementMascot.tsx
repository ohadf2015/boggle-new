'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import useReducedMotion from '@/hooks/useReducedMotion';

// ============================================================
// TYPES
// ============================================================

interface PlacementMascotProps {
  rank: number;
  size?: number;
  className?: string;
}

// ============================================================
// EXPRESSION CONFIGS
// ============================================================

type ExpressionKey = 'winner' | 'silver' | 'bronze' | 'default';

function getExpressionKey(rank: number): ExpressionKey {
  if (rank === 1) return 'winner';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'default';
}

/** Eye shapes per expression — [leftEye, rightEye] as SVG d-paths */
const EYES: Record<ExpressionKey, { left: string; right: string }> = {
  winner: {
    // Ecstatic squint — upward arcs (happy closed eyes)
    left: 'M26,42 Q30,38 34,42',
    right: 'M46,42 Q50,38 54,42',
  },
  silver: {
    // Determined — normal round eyes
    left: 'M28,40 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
    right: 'M46,40 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
  },
  bronze: {
    // Cheerful — slightly squished happy eyes
    left: 'M27,42 Q30,39 33,42',
    right: 'M47,42 Q50,39 53,42',
  },
  default: {
    // Encouraging — round wide eyes
    left: 'M27,39 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
    right: 'M45,39 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
  },
};

/** Mouth shapes per expression */
const MOUTHS: Record<ExpressionKey, string> = {
  winner: 'M30,52 Q40,62 50,52', // Big open grin
  silver: 'M32,54 Q40,59 48,54', // Confident smile
  bronze: 'M33,54 Q40,58 47,54', // Friendly smile
  default: 'M34,53 Q40,56 46,53', // Slight smile
};

/** Body fill per rank */
const BODY_COLORS: Record<ExpressionKey, string> = {
  winner: '#FFE135', // Gold
  silver: '#94A3B8', // Silver-slate
  bronze: '#F59E0B', // Amber-bronze
  default: '#A78BFA', // Purple
};

/** Letter on the body */
const BODY_LETTER_COLORS: Record<ExpressionKey, string> = {
  winner: '#1a1a2e',
  silver: '#1a1a2e',
  bronze: '#1a1a2e',
  default: '#FFFFFF',
};

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const mascotEntrance = {
  hidden: { y: 40, opacity: 0, scale: 0.6, rotate: -8 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 14,
      mass: 0.8,
      delay: 0.3,
    },
  },
};

/** Looping celebration hop — bouncy and joyful */
const winnerHop = {
  animate: {
    y: [0, -5, 0],
    rotate: [0, -2, 2, 0],
    scaleX: [1, 1.03, 0.97, 1],
  },
  transition: {
    duration: 1.8,
    repeat: Infinity,
    repeatDelay: 1.5,
    ease: 'easeInOut' as const,
  },
};

const silverBounce = {
  animate: { y: [0, -3, 0], scaleY: [1, 1.02, 1] },
  transition: {
    duration: 2,
    repeat: Infinity,
    repeatDelay: 2,
    ease: 'easeInOut' as const,
  },
};

const idleBreathing = {
  animate: { scaleY: [1, 1.02, 1], y: [0, -1, 0] },
  transition: {
    duration: 2.5,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// ============================================================
// ARM COMPONENTS
// ============================================================

const CelebratingArms: React.FC = () => (
  <>
    {/* Left arm — frenetic wave */}
    <m.path
      d="M18,50 Q8,36 14,24"
      stroke="#1a1a2e"
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
      animate={{ rotate: [0, -18, 8, -14, 5, -10, 0], scaleY: [1, 0.95, 1.05, 0.97, 1] }}
      transition={{ duration: 1.2, delay: 0.9, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
      style={{ transformOrigin: '18px 50px' }}
    />
    {/* Right arm — frenetic wave (offset) */}
    <m.path
      d="M62,50 Q72,36 66,24"
      stroke="#1a1a2e"
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
      animate={{ rotate: [0, 18, -8, 14, -5, 10, 0], scaleY: [1, 1.05, 0.95, 1.03, 1] }}
      transition={{ duration: 1.2, delay: 1.1, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
      style={{ transformOrigin: '62px 50px' }}
    />
    {/* Sparkle bursts — staggered, looping */}
    {[
      { x: 8, y: 22, delay: 1.0, char: '✦' },
      { x: 66, y: 22, delay: 1.2, char: '✦' },
      { x: 2, y: 32, delay: 1.6, char: '✧' },
      { x: 72, y: 30, delay: 1.8, char: '✧' },
    ].map((s) => (
      <m.text
        key={`${s.char}-${s.x}-${s.y}`}
        x={s.x} y={s.y} fontSize="7" fill="#FFE135"
        animate={{
          opacity: [0, 1, 1, 0],
          y: [s.y, s.y - 6, s.y - 10, s.y - 14],
          scale: [0.3, 1.3, 1, 0.5],
        }}
        transition={{
          duration: 1.4,
          delay: s.delay,
          repeat: Infinity,
          repeatDelay: 2.5,
          ease: 'easeOut',
        }}
      >
        {s.char}
      </m.text>
    ))}
  </>
);

const RelaxedArms: React.FC = () => (
  <>
    {/* Left arm down */}
    <path
      d="M20,55 Q14,62 18,70"
      stroke="#1a1a2e"
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
    {/* Right arm — thumbs up */}
    <m.g
      animate={{ rotate: [0, 5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '62px 52px' }}
    >
      <path
        d="M60,55 Q68,48 66,40"
        stroke="#1a1a2e"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
      {/* Thumb */}
      <circle cx="66" cy="38" r="3" fill="#FFE135" stroke="#1a1a2e" strokeWidth={2} />
    </m.g>
  </>
);

const NeutralArms: React.FC = () => (
  <>
    <path
      d="M20,55 Q12,62 16,70"
      stroke="#1a1a2e"
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M60,55 Q68,62 64,70"
      stroke="#1a1a2e"
      strokeWidth={4}
      strokeLinecap="round"
      fill="none"
    />
  </>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const PlacementMascot = memo<PlacementMascotProps>(({ rank, size = 80, className = '' }) => {
  const reducedMotion = useReducedMotion();
  const expression = getExpressionKey(rank);
  const bodyColor = BODY_COLORS[expression];
  const letterColor = BODY_LETTER_COLORS[expression];
  const eyes = EYES[expression];
  const mouth = MOUTHS[expression];

  const isWinner = rank === 1;

  return (
    <m.div
      data-testid="placement-mascot"
      className={className}
      variants={mascotEntrance}
      initial={reducedMotion ? 'visible' : 'hidden'}
      animate="visible"
    >
      <m.svg
        viewBox="0 0 80 90"
        width={size}
        height={size * 1.125}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...(!reducedMotion
          ? isWinner
            ? { animate: winnerHop.animate, transition: winnerHop.transition }
            : expression === 'silver'
              ? { animate: silverBounce.animate, transition: silverBounce.transition }
              : { animate: idleBreathing.animate, transition: idleBreathing.transition }
          : {})}
      >
        {/* Crown for winner */}
        {isWinner && (
          <m.g
            data-testid="mascot-crown"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 400, damping: 12 }}
          >
            <path
              d="M25,20 L30,10 L35,17 L40,6 L45,17 L50,10 L55,20 Z"
              fill="#FFE135"
              stroke="#1a1a2e"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {/* Jewels */}
            <circle cx="35" cy="15" r="1.5" fill="#FF1493" />
            <circle cx="40" cy="10" r="1.5" fill="#00FFFF" />
            <circle cx="45" cy="15" r="1.5" fill="#FF1493" />
          </m.g>
        )}

        {/* Body — chunky rounded square with thick border */}
        <rect
          x="22" y="22" width="36" height="42" rx="8"
          fill={bodyColor}
          stroke="#1a1a2e"
          strokeWidth={3}
        />

        {/* Letter "L" on body */}
        <text
          x="40" y="70"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fill={letterColor}
          fontFamily="sans-serif"
        >
          L
        </text>

        {/* Eyes */}
        <g data-testid={`mascot-expression-${expression}`}>
          <path d={eyes.left} stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" fill={expression === 'silver' || expression === 'default' ? '#1a1a2e' : 'none'} />
          <path d={eyes.right} stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" fill={expression === 'silver' || expression === 'default' ? '#1a1a2e' : 'none'} />

          {/* Eye sparkle for winner */}
          {expression === 'winner' && !reducedMotion && (
            <m.text
              x="36" y="39" fontSize="6" fill="#FFE135"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5], rotate: [0, 180, 360] }}
              transition={{ duration: 1.8, delay: 1.5, repeat: Infinity, repeatDelay: 3 }}
            >
              ✦
            </m.text>
          )}

          {/* Blush cheeks for winner/bronze */}
          {(expression === 'winner' || expression === 'bronze') && (
            <>
              <m.circle
                cx="24" cy="47" r="4" fill="#FF6B6B"
                animate={!reducedMotion ? { opacity: [0.25, 0.45, 0.25] } : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <m.circle
                cx="56" cy="47" r="4" fill="#FF6B6B"
                animate={!reducedMotion ? { opacity: [0.25, 0.45, 0.25] } : undefined}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              />
            </>
          )}

          {/* Mouth */}
          <path d={mouth} stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" fill="none" />
        </g>

        {/* Arms */}
        {isWinner && !reducedMotion ? (
          <CelebratingArms />
        ) : expression === 'silver' ? (
          <RelaxedArms />
        ) : (
          <NeutralArms />
        )}

        {/* Feet — two little ovals */}
        <ellipse cx="33" cy="67" rx="6" ry="3" fill="#1a1a2e" />
        <ellipse cx="47" cy="67" rx="6" ry="3" fill="#1a1a2e" />
      </m.svg>
    </m.div>
  );
});

PlacementMascot.displayName = 'PlacementMascot';

export default PlacementMascot;
