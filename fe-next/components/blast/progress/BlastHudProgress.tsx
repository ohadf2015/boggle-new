'use client';

import { useEffect, useRef, useState } from 'react';
import { Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { BlastRunRibbon } from './BlastRunRibbon';
import { BlastTargetChip } from './BlastTargetChip';
import type { RivalScore } from './rivalTarget';
import styles from './progress.module.css';

export interface BlastHudProgress {
  /** Score banked by earlier waves of this run. */
  baseScore: number;
  baseDiamonds: number;
  recordWave: number;
  personalBest: number | null;
  rivals: RivalScore[];
}

/** 0 = no streak, 3 = blazing; drives the combo slot's escalating glow. */
export function comboTier(level: number): 0 | 1 | 2 | 3 {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  if (level >= 1) return 1;
  return 0;
}

function usePulseOnRise(value: number): number {
  const [key, setKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) setKey((k) => k + 1);
    prev.current = value;
  }, [value]);
  return key;
}

export function BlastHudProgressRow({
  progress, wave, waveScore, waveDiamonds,
}: { progress: BlastHudProgress; wave: number; waveScore: number; waveDiamonds: number }) {
  const { t } = useLanguage();
  const diamonds = progress.baseDiamonds + waveDiamonds;
  const pulseKey = usePulseOnRise(diamonds);

  return (
    <div data-testid="blast-hud-progress" className="flex items-center gap-2 px-3 pb-1 tv:pb-2">
      <BlastRunRibbon wave={wave} recordWave={progress.recordWave} />
      <span
        key={pulseKey}
        data-testid="blast-hud-diamonds"
        data-board-diamond-target=""
        aria-label={`${t('blastProgress.diamonds')}: ${diamonds}`}
        className={cn(
          'flex shrink-0 items-center gap-0.5 rounded-md border-2 border-neo-black bg-neo-navy-light px-1.5 font-neo-display text-[11px] font-black tabular-nums text-neo-white tv:text-base',
          pulseKey > 0 && [styles.pulse, styles.shine],
        )}
      >
        <Gem className="h-3 w-3 text-neo-cyan tv:h-5 tv:w-5" fill="currentColor" strokeWidth={2.5} aria-hidden="true" />
        {diamonds}
      </span>
      <div className="ms-auto flex min-w-0 justify-end">
        <BlastTargetChip
          runScore={progress.baseScore + waveScore}
          personalBest={progress.personalBest}
          rivals={progress.rivals}
        />
      </div>
    </div>
  );
}
