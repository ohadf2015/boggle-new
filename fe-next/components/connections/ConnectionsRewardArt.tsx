'use client';

/**
 * Custom neo-brutalist reward art for Word Bridge — a treasure chest (the
 * carrot at the end of the daily track) and a tiered medal (the keepsake).
 * Inline SVG: hard 2px black strokes, solid electric fills, no gradients —
 * matches the design system and scales crisply on phone + TV.
 */
import { m } from 'framer-motion';
import type { Medal } from '@/lib/connections/progressTrack';

const STROKE = '#0b0b14';

/** Treasure chest. `state`: locked (shut, dim), ready (shut, glowing), open (lid up + loot). */
export function ChestArt({ state, size = 40 }: { state: 'locked' | 'ready' | 'open'; size?: number }) {
  const body = state === 'locked' ? '#3a3a52' : '#FFE135';
  const lid = state === 'locked' ? '#4a4a66' : '#FF6B35';
  const lidRotate = state === 'open' ? -38 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ overflow: 'visible' }}>
      {state === 'open' && (
        <m.g
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 14 }}
        >
          {/* loot glow + coins */}
          <circle cx="24" cy="20" r="9" fill="#BFFF00" opacity="0.5" />
          <circle cx="20" cy="18" r="3.2" fill="#FFE135" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="28" cy="16" r="2.6" fill="#FFE135" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="24" cy="13" r="2.2" fill="#00FFFF" stroke={STROKE} strokeWidth="1.5" />
        </m.g>
      )}
      {/* chest body */}
      <rect x="9" y="24" width="30" height="16" rx="2" fill={body} stroke={STROKE} strokeWidth="2.5" />
      {/* lid (animates open) */}
      <m.g
        style={{ originX: '24px', originY: '24px' }}
        animate={{ rotate: lidRotate }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <path d="M8 24 a16 11 0 0 1 32 0 Z" fill={lid} stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      </m.g>
      {/* lock plate */}
      <rect x="21.5" y="26" width="5" height="6" rx="1" fill={STROKE} />
      {state === 'ready' && (
        <m.circle
          cx="24" cy="20" r="20" fill="none" stroke="#FFE135" strokeWidth="2"
          initial={{ opacity: 0.2, scale: 0.85 }}
          animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.85, 1.05, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}

const MEDAL_FILL: Record<Exclude<Medal, 'none'>, string> = {
  gold: '#FFE135',
  silver: '#E8ECF4',
  bronze: '#FF6B35',
};

/** Tiered medal with ribbon + star. Returns null for 'none'. */
export function MedalArt({ medal, size = 96 }: { medal: Medal; size?: number }) {
  if (medal === 'none') return null;
  const fill = MEDAL_FILL[medal];
  return (
    <m.svg
      width={size} height={size} viewBox="0 0 96 96" aria-hidden="true"
      initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 13 }}
    >
      {/* ribbons */}
      <path d="M34 18 L30 50 L42 42 Z" fill="#FF1493" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M62 18 L66 50 L54 42 Z" fill="#00FFFF" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      {/* disc */}
      <circle cx="48" cy="60" r="26" fill={fill} stroke={STROKE} strokeWidth="3" />
      <circle cx="48" cy="60" r="19" fill="none" stroke={STROKE} strokeWidth="1.5" opacity="0.5" />
      {/* star */}
      <path
        d="M48 46 l4.2 9 9.8 1 -7.4 6.6 2.1 9.6 -8.7-5 -8.7 5 2.1-9.6 -7.4-6.6 9.8-1 Z"
        fill={STROKE}
      />
    </m.svg>
  );
}
