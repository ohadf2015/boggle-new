'use client';

import { useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomScoreFlyPath, type ScoreFlyPath } from './blastEffectVariations';

export interface ScoreFlyEvent {
  id: string;
  score: number;
  startX: number;
  startY: number;
  tier: 1 | 2 | 3;
}

interface BlastScoreFlyProps {
  flies: ScoreFlyEvent[];
  onComplete: (id: string) => void;
}

const TIER_COLORS: Record<1 | 2 | 3, string> = {
  1: '#FFFFFF',
  2: '#00FFFF',
  3: '#BFFF00',
};

/** Tier 3 gets a pulsing glow ring behind the score text */
const TIER_GLOW: Record<1 | 2 | 3, string | undefined> = {
  1: undefined,
  2: '0 0 18px rgba(0,255,255,0.5)',
  3: '0 0 24px rgba(191,255,0,0.6), 0 0 48px rgba(191,255,0,0.3)',
};

const TARGET_X = 120;
const TARGET_Y = 8;
const MAX_FLIES = 3;

function ScoreFlyItem({ fly, onComplete }: { fly: ScoreFlyEvent; onComplete: (id: string) => void }) {
  // Pick a random path variation once per fly event
  const path = useMemo<ScoreFlyPath>(() => getRandomScoreFlyPath(), []);

  const xKeys = path.x(fly.startX, TARGET_X);
  const yKeys = path.y(fly.startY, TARGET_Y);

  return (
    <AdaptiveMotion.div
      key={fly.id}
      data-testid="score-fly"
      className="absolute pointer-events-none z-50 font-neo-display font-black tabular-nums"
      style={{
        color: TIER_COLORS[fly.tier],
        textShadow: `0 2px 8px rgba(0,0,0,0.6), 0 0 12px ${TIER_COLORS[fly.tier]}80`,
        fontSize: fly.tier === 3 ? 36 : fly.tier === 2 ? 28 : 22,
        WebkitTextStroke: '1.5px rgba(0,0,0,0.7)',
        paintOrder: 'stroke fill',
      }}
      initial={{
        x: fly.startX,
        y: fly.startY,
        scale: path.scale[0],
        opacity: 1,
        rotate: path.rotate?.[0] ?? 0,
      }}
      animate={{
        x: xKeys,
        y: yKeys,
        scale: path.scale,
        opacity: [...path.scale.slice(0, -1).map(() => 1), 0.5],
        rotate: path.rotate ?? 0,
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: path.duration,
        ease: 'easeInOut',
        times: path.times,
      }}
      onAnimationComplete={() => onComplete(fly.id)}
    >
      {TIER_GLOW[fly.tier] && (
        <span
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ boxShadow: TIER_GLOW[fly.tier] }}
          aria-hidden="true"
        />
      )}
      +{fly.score}
    </AdaptiveMotion.div>
  );
}

export function BlastScoreFly({ flies, onComplete }: BlastScoreFlyProps) {
  const visible = flies.slice(0, MAX_FLIES);

  return (
    <AdaptiveAnimatePresence>
      {visible.map((fly) => (
        <ScoreFlyItem key={fly.id} fly={fly} onComplete={onComplete} />
      ))}
    </AdaptiveAnimatePresence>
  );
}
