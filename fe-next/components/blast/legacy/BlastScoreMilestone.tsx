'use client';

/**
 * BlastScoreMilestone — transient "you crossed 100/250/500…" pill.
 *
 * Every tier renders through a single structured layout: a lucide icon,
 * a translated label, and the score itself. No emoji — icons are consistent
 * across platforms and scale crisply with the tier's accent color. The
 * lowest tier (100) uses the lime family so it still feels like a reward
 * rather than a muted system notification.
 */

import { memo, useState, useEffect, useRef, useMemo, type ComponentType } from 'react';
import {
  Sparkles, Flame, Zap, Gem, Trophy, Target, TrendingUp, Rocket, Star,
} from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomMilestoneEntrance } from './blastEffectVariations';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { BLAST_MILESTONE_BASES, jitterMilestones } from '@/lib/blast/blastMilestones';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

interface MilestoneTier {
  threshold: number;
  key: string;
  Icon: IconType;
  /** Full pill background + text color utilities. */
  pillClass: string;
  /** Color for the icon — tuned per tier. */
  iconClass: string;
  /** Optional outer aura shadow (boxShadow inline — lets us add colored glow). */
  glow?: string;
}

const MILESTONE_TIERS: readonly MilestoneTier[] = [
  {
    threshold: 5000, key: '5000', Icon: Flame,
    pillClass: 'bg-linear-to-r from-yellow-300 via-white to-yellow-300 text-neo-black',
    iconClass: 'text-neo-pink',
    glow: '0 0 28px rgba(255,215,0,0.6), 3px 3px 0 #000',
  },
  {
    threshold: 3000, key: '3000', Icon: Rocket,
    pillClass: 'bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black',
    iconClass: 'text-neo-black',
    glow: '0 0 24px rgba(255,20,147,0.45), 3px 3px 0 #000',
  },
  {
    threshold: 2000, key: '2000', Icon: Gem,
    pillClass: 'bg-linear-to-r from-purple-500 via-pink-500 to-purple-500 text-white',
    iconClass: 'text-neo-cyan',
    glow: '0 0 22px rgba(168,85,247,0.45), 3px 3px 0 #000',
  },
  {
    threshold: 1500, key: '1500', Icon: Sparkles,
    pillClass: 'bg-linear-to-r from-amber-400 to-yellow-300 text-neo-black',
    iconClass: 'text-neo-pink',
    glow: '0 0 18px rgba(251,191,36,0.45), 3px 3px 0 #000',
  },
  {
    threshold: 1000, key: '1000', Icon: Trophy,
    pillClass: 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black',
    iconClass: 'text-neo-black',
    glow: '0 0 18px rgba(191,255,0,0.5), 3px 3px 0 #000',
  },
  {
    threshold: 750, key: '750', Icon: Zap,
    pillClass: 'bg-neo-lime text-neo-black',
    iconClass: 'text-neo-black',
    glow: '0 0 14px rgba(191,255,0,0.45), 3px 3px 0 #000',
  },
  {
    threshold: 500, key: '500', Icon: Target,
    pillClass: 'bg-neo-cyan text-neo-black',
    iconClass: 'text-neo-black',
    glow: '0 0 14px rgba(0,255,255,0.45), 3px 3px 0 #000',
  },
  {
    threshold: 250, key: '250', Icon: Star,
    pillClass: 'bg-linear-to-r from-neo-cyan to-sky-300 text-neo-black',
    iconClass: 'text-neo-black',
    glow: '0 0 12px rgba(0,255,255,0.4), 3px 3px 0 #000',
  },
  {
    threshold: 100, key: '100', Icon: TrendingUp,
    pillClass: 'bg-linear-to-r from-neo-lime-light to-neo-lime text-neo-black',
    iconClass: 'text-neo-black',
    glow: '0 0 12px rgba(191,255,0,0.5), 3px 3px 0 #000',
  },
] as const;

interface MilestoneConfig {
  score: number;
  label: string;
  tier: MilestoneTier;
}

/**
 * Build the pill config for the tier at `tierIndex`, displaying the player's
 * ACTUAL score (organic) rather than the round threshold. The tier (icon/colour
 * /label) still anchors to the round base so the celebration identity is stable.
 */
function getMilestoneConfig(
  tierIndex: number,
  score: number,
  t?: (key: string) => string | undefined,
): MilestoneConfig {
  const base = BLAST_MILESTONE_BASES[tierIndex];
  const tier = MILESTONE_TIERS.find((m) => m.key === String(base))
    ?? MILESTONE_TIERS[MILESTONE_TIERS.length - 1];
  const label = t?.(`blast.milestone.${tier.key}`) || `${tier.key}!`;
  return { score, label, tier };
}

interface BlastScoreMilestoneProps {
  score: number;
  t?: (key: string) => string | undefined;
  /** Optional fixed seed for the per-game jitter (tests / determinism). */
  seed?: number;
}

export const BlastScoreMilestone = memo(function BlastScoreMilestone({ score, t, seed }: BlastScoreMilestoneProps) {
  const [activeMilestone, setActiveMilestone] = useState<MilestoneConfig | null>(null);
  const lastMilestoneRef = useRef(0);
  const entranceRef = useRef(getRandomMilestoneEntrance());
  const { playAchievementSound } = useSoundEffects();

  // Per-game jittered thresholds — celebration moments land on organic scores,
  // not engineered round numbers. Computed once per mount.
  const seedRef = useRef(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const thresholds = useMemo(() => jitterMilestones(seedRef.current), []);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const idx = thresholds.findIndex((m) => score >= m && lastMilestoneRef.current < m);
    if (idx !== -1) {
      lastMilestoneRef.current = thresholds[idx];
      entranceRef.current = getRandomMilestoneEntrance();
      setActiveMilestone(getMilestoneConfig(idx, score, t));
      playAchievementSound();
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setActiveMilestone(null), 1600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, playAchievementSound, thresholds]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(dismissTimerRef.current), []);

  return (
    <AdaptiveAnimatePresence>
      {activeMilestone && (
        <AdaptiveMotion.div
          initial={entranceRef.current.initial}
          animate={entranceRef.current.animate}
          exit={entranceRef.current.exit}
          transition={entranceRef.current.transition}
          className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          role="status"
          aria-live="assertive"
          data-testid="blast-milestone-pill"
        >
          <div
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5',
              'rounded-neo border-3 border-neo-black',
              'font-neo-display whitespace-nowrap',
              activeMilestone.tier.pillClass,
            )}
            style={{ boxShadow: activeMilestone.tier.glow ?? '3px 3px 0 #000' }}
          >
            <activeMilestone.tier.Icon
              className={cn('w-6 h-6 shrink-0', activeMilestone.tier.iconClass)}
              strokeWidth={2.75}
            />
            <div className="flex flex-col items-start leading-none">
              <span className="font-black uppercase tracking-wider text-[11px] opacity-80">
                {activeMilestone.label}
              </span>
              <span className="font-black tabular-nums text-2xl tracking-tight">
                {activeMilestone.score.toLocaleString()}
              </span>
            </div>
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});
