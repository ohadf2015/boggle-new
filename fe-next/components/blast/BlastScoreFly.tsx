'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

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

const TARGET_X = 120;
const TARGET_Y = 8;
const MAX_FLIES = 3;

export function BlastScoreFly({ flies, onComplete }: BlastScoreFlyProps) {
  const visible = flies.slice(0, MAX_FLIES);

  return (
    <AdaptiveAnimatePresence>
      {visible.map((fly) => (
        <AdaptiveMotion.div
          key={fly.id}
          data-testid="score-fly"
          className="absolute pointer-events-none z-50 font-neo-display font-black tabular-nums"
          style={{
            color: TIER_COLORS[fly.tier],
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontSize: fly.tier === 3 ? 28 : fly.tier === 2 ? 24 : 20,
          }}
          initial={{
            x: fly.startX,
            y: fly.startY,
            scale: 1.2,
            opacity: 1,
          }}
          animate={{
            x: [fly.startX, fly.startX - 40, TARGET_X],
            y: [fly.startY, fly.startY - 80, TARGET_Y],
            scale: [1.2, 1, 0.6],
            opacity: [1, 1, 0.5],
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.6,
            ease: 'easeInOut',
            times: [0, 0.4, 1],
          }}
          onAnimationComplete={() => onComplete(fly.id)}
        >
          +{fly.score}
        </AdaptiveMotion.div>
      ))}
    </AdaptiveAnimatePresence>
  );
}
