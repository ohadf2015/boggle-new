'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomMilestoneEntrance } from './blastEffectVariations';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const SCORE_MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000];

interface MilestoneConfig {
  label: string;
  className: string;
}

const MILESTONE_TIERS = [
  { threshold: 5000, key: '5000', emoji: '🔥', className: 'bg-linear-to-r from-yellow-300 via-white to-yellow-300 text-neo-black animate-pulse' },
  { threshold: 3000, key: '3000', emoji: '⚡', className: 'bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' },
  { threshold: 2000, key: '2000', emoji: '💎', className: 'bg-linear-to-r from-purple-500 via-pink-500 to-purple-500 text-white' },
  { threshold: 1500, key: '1500', emoji: '✨', className: 'bg-linear-to-r from-amber-400 to-yellow-300 text-neo-black' },
  { threshold: 1000, key: '1000', emoji: '🏆', className: 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black' },
  { threshold: 750,  key: '750',  emoji: '💪', className: 'bg-neo-lime text-neo-black' },
  { threshold: 500,  key: '500',  emoji: '🎯', className: 'bg-neo-cyan text-neo-black' },
  { threshold: 250,  key: '250',  emoji: '👍', className: 'bg-neo-cyan/80 text-neo-black' },
  { threshold: 100,  key: '100',  emoji: '✓',  className: 'bg-neo-white/90 text-neo-black' },
] as const;

function getMilestoneConfig(score: number, t?: (key: string) => string | undefined): MilestoneConfig {
  const tier = MILESTONE_TIERS.find(m => score >= m.threshold) ?? MILESTONE_TIERS[MILESTONE_TIERS.length - 1];
  const text = t?.(`blast.milestone.${tier.key}`) || `${tier.key}!`;
  return { label: `${tier.emoji} ${text}`, className: tier.className };
}

interface BlastScoreMilestoneProps {
  score: number;
  /** Translation function */
  t?: (key: string) => string | undefined;
}

export function BlastScoreMilestone({ score, t }: BlastScoreMilestoneProps) {
  const [activeMilestone, setActiveMilestone] = useState<MilestoneConfig | null>(null);
  const lastMilestoneRef = useRef(0);
  const entranceRef = useRef(getRandomMilestoneEntrance());
  const { playAchievementSound } = useSoundEffects();

  const checkMilestone = useCallback(() => {
    const crossed = SCORE_MILESTONES.find(m => score >= m && lastMilestoneRef.current < m);
    if (crossed) {
      lastMilestoneRef.current = crossed;
      entranceRef.current = getRandomMilestoneEntrance();
      const config = getMilestoneConfig(crossed, t);
      setActiveMilestone(config);
      playAchievementSound();
      const timer = setTimeout(() => setActiveMilestone(null), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, playAchievementSound]);

  useEffect(() => {
    return checkMilestone();
  }, [checkMilestone]);

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
        >
          <div className={cn(
            'px-5 py-2.5 rounded-neo border-3 border-neo-black shadow-hard font-black text-xl uppercase tracking-wider whitespace-nowrap',
            activeMilestone.className,
          )}>
            {activeMilestone.label}
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
