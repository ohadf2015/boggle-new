'use client';

/**
 * StreakFlame — the fire that grows while a student keeps getting them right.
 *
 * Spelling and Blitz both already tracked a live streak and both already showed
 * it: Spelling as a flat orange pill reading "4x streak", Blitz as a number
 * beside a static icon. Neither made the streak feel like it was *going*
 * anywhere, and neither made a sound, so the one genuinely tense mechanic in
 * the practice stack was invisible and silent.
 *
 * This replaces both with one growing flame: four stages of mascot fire art
 * (spark → kindling → molten → inferno), each one bigger and hotter than the
 * last, with a stinger on the exact answer that reaches a new stage.
 *
 * neo-orange is reserved app-wide for streak/fire, which is exactly what this
 * is, so the pill behind the flame is the one legitimate use of it here.
 *
 * The stinger is guarded against two failure modes at once:
 *  - **Re-firing within a stage** (Class 2): the last stage that stung is held
 *    in a ref, so climbing 2 → 3 inside stage 1 is silent.
 *  - **Not firing after a reset**: a broken streak clears the ref, so climbing
 *    back up stings again. A streak you rebuilt is still an achievement.
 */

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { AdaptiveMotion, useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { streakFlameStage } from '@/lib/education/practiceJuice';

export interface StreakFlameProps {
  /** Current run of correct answers. Below 2 renders nothing. */
  streak: number;
  className?: string;
}

/** Flame art grows with the stage so the heat is legible at a glance. */
const FLAME_PX: Record<number, number> = { 1: 26, 2: 32, 3: 40, 4: 48 };

/*
 * Pill fill is SOLID at every stage. It used to fade in (`/70`, `/85`) so the
 * early rungs read cooler, but an alpha fill over the navy card put the black
 * digit on a blend neither the eye nor a contrast audit could resolve — the r2
 * capture measured that digit at 1.23:1. The heat now comes from the art size
 * and the shadow, which cost nothing in legibility.
 */
const PILL_BY_STAGE: Record<number, string> = {
  1: 'bg-neo-orange',
  2: 'bg-neo-orange shadow-hard-sm',
  3: 'bg-neo-orange shadow-hard',
  4: 'bg-neo-orange shadow-hard ring-2 ring-neo-yellow',
};

export default function StreakFlame({ streak, className }: StreakFlameProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const skipAnimations = useSkipAnimations();
  const flame = streakFlameStage(streak);
  const stungStageRef = useRef(0);

  useEffect(() => {
    // A broken streak resets the ledger so a rebuilt streak can sting again.
    if (flame.stage === 0) {
      stungStageRef.current = 0;
      return;
    }
    if (flame.stage <= stungStageRef.current) return;
    stungStageRef.current = flame.stage;
    playSound(flame.stage >= 4 ? 'streakFire' : 'streakBuild', {
      requiresGameActive: false,
      volume: 0.55,
      // Each stage a semitone hotter, so the fire audibly climbs.
      rate: 1 + (flame.stage - 1) * 0.08,
    });
  }, [flame.stage, playSound]);

  if (flame.stage === 0 || !flame.art) return null;

  const size = FLAME_PX[flame.stage];

  return (
    <AdaptiveMotion.div
      data-testid="practice-streak-flame"
      data-stage={flame.stage}
      key={flame.stage}
      initial={{ scale: 0.7 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 480, damping: 12 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-neo border-[3px] border-black px-2.5 py-1',
        PILL_BY_STAGE[flame.stage],
        className
      )}
      aria-label={t('student.practiceFun.streakLabel', { count: streak })}
    >
      <Image
        src={flame.art}
        alt=""
        role="presentation"
        width={size}
        height={size}
        unoptimized
        style={{ width: size, height: size }}
        className={cn('shrink-0', !skipAnimations && flame.stage >= 3 && 'animate-pulse')}
      />
      <span className="font-neo-display text-lg font-black tabular-nums leading-none text-black">
        {streak}
      </span>
    </AdaptiveMotion.div>
  );
}
