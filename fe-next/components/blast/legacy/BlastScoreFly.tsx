'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomScoreFlyPath, type ScoreFlyPath } from './blastEffectVariations';
import { pickHypePrefix } from './scoreFlyHype';

export interface ScoreFlyEvent {
  id: string;
  score: number;
  /** Start X as percentage of container width (0-100) */
  startX: number;
  /** Start Y as percentage of container height (0-100) */
  startY: number;
  tier: 1 | 2 | 3;
  /** Dominant tile type in the cleared word — drives color coding */
  tileType?: string;
  /** Treasure-roll upside (points added on top of base). Drives the lucky tag. */
  bonus?: number;
  /** Treasure-roll tier — colours the lucky tag (gold jackpot / cyan lucky). */
  luckyTier?: 'lucky' | 'jackpot';
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

/** Tile-type specific colors — score text matches the cleared tile for visual cohesion */
const TILE_TYPE_COLORS: Record<string, string> = {
  bomb: '#FF3366',
  lightning: '#00FFFF',
  prism: '#A855F7',
  gem: '#34D399',
  gold: '#FFD700',
  silver: '#C0C0D0',
  diamond: '#00EEFF',
  rainbow: '#FF1493',
  frozen: '#B8DDFF',
  magnet: '#8B5CF6',
  mirror: '#D0D0E0',
  wildcard: '#E8B4F8',
  countdown: '#FF6633',
  shuffle: '#FF8C00',
  magma: '#FF4500',
  portal: '#7B68EE',
  catalyst: '#FFD700',
};

/** Tier 3 gets a pulsing glow ring behind the score text */
const TIER_GLOW: Record<1 | 2 | 3, string | undefined> = {
  1: undefined,
  2: '0 0 18px rgba(0,255,255,0.5)',
  3: '0 0 24px rgba(191,255,0,0.6), 0 0 48px rgba(191,255,0,0.3)',
};

/** Tile-type specific glow — matches the tile color for immersive feedback */
const TILE_TYPE_GLOW: Record<string, string> = {
  bomb: '0 0 20px rgba(255,51,102,0.6)',
  lightning: '0 0 22px rgba(0,255,255,0.6)',
  prism: '0 0 20px rgba(168,85,247,0.6)',
  gem: '0 0 18px rgba(52,211,153,0.5)',
  gold: '0 0 24px rgba(255,215,0,0.6), 0 0 48px rgba(255,215,0,0.3)',
  diamond: '0 0 22px rgba(0,238,255,0.5), 0 0 44px rgba(0,238,255,0.25)',
  rainbow: '0 0 20px rgba(255,20,147,0.5)',
};

// Target the score display area (responsive — percentage of container)
const TARGET_X = typeof window !== 'undefined' ? Math.min(120, window.innerWidth * 0.3) : 120;
const TARGET_Y = 8;
const MAX_FLIES = 3;
/** Absolute ceiling on how long a "+N" popup may live before forced removal. */
const MAX_FLY_LIFETIME_MS = 4000;

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function ScoreFlyItem({ fly, onComplete }: { fly: ScoreFlyEvent; onComplete: (id: string) => void }) {
  // Deterministic tilt seeded by fly.id keeps render pure (react-hooks/purity).
  const { path, hype, initialTilt } = useMemo(() => ({
    path: getRandomScoreFlyPath(),
    hype: pickHypePrefix(fly.tier),
    initialTilt: ((Math.abs(hashId(fly.id)) % 2400) / 100) - 12,
  }), [fly.tier, fly.id]);

  // Path functions expect pixel coords; use 0 as origin and TARGET as dest,
  // then apply deltas from the percentage-positioned element.
  const xKeys = path.x(0, TARGET_X);
  const yKeys = path.y(0, TARGET_Y);

  // Idempotent completion — onAnimationComplete and the timeout fallback can
  // both fire (in MP, a mid-flight re-render interrupts the animation so
  // onAnimationComplete may NEVER fire, orphaning the "+N" popup on screen).
  // The fallback guarantees removal; the guard prevents a double-remove.
  const completedRef = useRef(false);
  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(fly.id);
  }, [onComplete, fly.id]);

  // Hard backstop: remove the fly a beat after its animation should have ended,
  // regardless of whether Framer Motion reported completion.
  useEffect(() => {
    const ttl = Math.min(path.duration * 1000 + 1200, MAX_FLY_LIFETIME_MS);
    const timer = setTimeout(complete, ttl);
    return () => clearTimeout(timer);
  }, [complete, path.duration]);

  return (
    <AdaptiveMotion.div
      key={fly.id}
      data-testid="score-fly"
      className="absolute pointer-events-none z-50 font-neo-display font-black tabular-nums"
      style={{
        left: `${fly.startX}%`,
        top: `${fly.startY}%`,
        color: (fly.tileType && TILE_TYPE_COLORS[fly.tileType]) || TIER_COLORS[fly.tier],
        textShadow: `0 2px 8px rgba(0,0,0,0.6), 0 0 12px ${(fly.tileType && TILE_TYPE_COLORS[fly.tileType]) || TIER_COLORS[fly.tier]}80`,
        fontSize: `clamp(${fly.tier === 3 ? '1.5rem' : fly.tier === 2 ? '1.2rem' : '1rem'}, ${fly.tier === 3 ? '5cqw' : fly.tier === 2 ? '4cqw' : '3cqw'}, ${fly.tier === 3 ? '2.25rem' : fly.tier === 2 ? '1.75rem' : '1.375rem'})`,
        WebkitTextStroke: '1.5px rgba(0,0,0,0.7)',
        paintOrder: 'stroke fill',
      }}
      initial={{
        x: xKeys[0],
        y: yKeys[0],
        scale: path.scale[0],
        opacity: 1,
        rotate: (path.rotate?.[0] ?? 0) + initialTilt,
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
      onAnimationComplete={complete}
    >
      {((fly.tileType && TILE_TYPE_GLOW[fly.tileType]) || TIER_GLOW[fly.tier]) && (
        <span
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ boxShadow: (fly.tileType && TILE_TYPE_GLOW[fly.tileType]) || TIER_GLOW[fly.tier] }}
          aria-hidden="true"
        />
      )}
      {hype && <span className="opacity-90 mr-1 text-[0.85em]">{hype}</span>}+{fly.score}
      {fly.bonus != null && fly.bonus > 0 && (
        <span
          data-testid="score-fly-bonus"
          className="ms-1 inline-flex items-center gap-0.5 align-super text-[0.6em] font-black"
          style={{
            color: fly.luckyTier === 'jackpot' ? '#FFD700' : '#00FFFF',
            WebkitTextStroke: '1px rgba(0,0,0,0.7)',
            paintOrder: 'stroke fill',
            textShadow: fly.luckyTier === 'jackpot'
              ? '0 0 8px rgba(255,215,0,0.8)'
              : '0 0 8px rgba(0,255,255,0.7)',
          }}
        >
          <Sparkles className="w-[0.9em] h-[0.9em]" strokeWidth={3} aria-hidden="true" />+{fly.bonus}
        </span>
      )}
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
