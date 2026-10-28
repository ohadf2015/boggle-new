'use client';

import { useEffect, useRef, useState } from 'react';
import { Crown, Swords, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { BLAST_LADDER_SIZE } from '@/lib/blastLadderSize';
import styles from './progress.module.css';
import { latestPassed, nextTarget, type PassedTarget, type RivalScore } from './rivalTarget';

const PASS_SHOW_MS = 1600;

interface BlastTargetChipProps {
  runScore: number;
  personalBest: number | null;
  rivals: readonly RivalScore[];
}

/** Always-visible "score to beat": the next weekly rival or the personal best. */
export function BlastTargetChip({ runScore, personalBest, rivals }: BlastTargetChipProps) {
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const prevScoreRef = useRef(runScore);
  const [passed, setPassed] = useState<{ target: PassedTarget; key: number } | null>(null);

  useEffect(() => {
    const hit = latestPassed(prevScoreRef.current, runScore, personalBest, rivals);
    prevScoreRef.current = runScore;
    if (!hit) return undefined;
    setPassed({ target: hit, key: Date.now() });
    playAchievementSound();
    const id = setTimeout(() => setPassed(null), PASS_SHOW_MS);
    return () => clearTimeout(id);
  }, [runScore, personalBest, rivals, playAchievementSound]);

  const target = nextTarget(runScore, personalBest, rivals);
  if (!target) return null;

  let Icon = Swords;
  let label: string | null;
  if (target.kind === 'rival') {
    label = t('blastProgress.toPass', { points: target.gap.toLocaleString(), name: target.name });
  } else if (target.kind === 'best') {
    Icon = Trophy;
    label = t('blastProgress.toBest', { points: target.gap.toLocaleString() });
  } else {
    Icon = Crown;
    const ladderExhausted = rivals.length > 0 && rivals.length < BLAST_LADDER_SIZE;
    label = ladderExhausted ? t('blastProgress.top') : personalBest ? t('blastProgress.newBest') : null;
  }
  if (!label) return null;

  return (
    <div className="relative min-w-0">
      <span
        data-testid="blast-target-chip"
        className={cn(
          'flex min-w-0 items-center gap-1 rounded-lg border-2 border-neo-black bg-neo-black/60 px-2 py-0.5 font-neo-display text-[11px] font-black text-neo-white tv:text-base',
          target.kind === 'top' && 'bg-neo-lime text-neo-black',
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-neo-yellow tv:h-5 tv:w-5" strokeWidth={3} aria-hidden="true" />
        <span className="truncate" dir="auto">{label}</span>
      </span>
      {passed && (
        <span
          key={passed.key}
          data-testid="blast-target-passed"
          role="status"
          className={`${styles.pass} absolute end-0 top-full z-50 mt-1 whitespace-nowrap rounded-neo border-2 border-neo-black bg-neo-lime px-2.5 py-1 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard`}
        >
          {passed.target.kind === 'rival'
            ? t('blastProgress.passed', { name: passed.target.name })
            : t('blastProgress.newBest')}
        </span>
      )}
    </div>
  );
}
