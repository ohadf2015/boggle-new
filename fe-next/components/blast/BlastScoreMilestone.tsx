'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';

const SCORE_MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000];

interface MilestoneConfig {
  label: string;
  className: string;
}

function getMilestoneConfig(score: number): MilestoneConfig {
  if (score >= 5000) return { label: '🔥 5000+', className: 'bg-gradient-to-r from-yellow-300 via-white to-yellow-300 text-neo-black animate-pulse' };
  if (score >= 3000) return { label: '⚡ 3000!', className: 'bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' };
  if (score >= 2000) return { label: '💎 2000!', className: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white' };
  if (score >= 1500) return { label: '✨ 1500!', className: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-neo-black' };
  if (score >= 1000) return { label: '🏆 1000!', className: 'bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black' };
  if (score >= 750) return { label: '💪 750!', className: 'bg-neo-lime text-neo-black' };
  if (score >= 500) return { label: '🎯 500!', className: 'bg-neo-cyan text-neo-black' };
  if (score >= 250) return { label: '👍 250!', className: 'bg-neo-cyan/80 text-neo-black' };
  return { label: '✓ 100!', className: 'bg-neo-white/90 text-neo-black' };
}

interface BlastScoreMilestoneProps {
  score: number;
}

export function BlastScoreMilestone({ score }: BlastScoreMilestoneProps) {
  const [activeMilestone, setActiveMilestone] = useState<MilestoneConfig | null>(null);
  const lastMilestoneRef = useRef(0);
  const { playAchievementSound } = useSoundEffects();

  const checkMilestone = useCallback(() => {
    const crossed = SCORE_MILESTONES.find(m => score >= m && lastMilestoneRef.current < m);
    if (crossed) {
      lastMilestoneRef.current = crossed;
      const config = getMilestoneConfig(crossed);
      setActiveMilestone(config);
      playAchievementSound();
      const timer = setTimeout(() => setActiveMilestone(null), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [score, playAchievementSound]);

  useEffect(() => {
    return checkMilestone();
  }, [checkMilestone]);

  return (
    <AdaptiveAnimatePresence>
      {activeMilestone && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.4, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.8, y: -20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 18 }}
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
