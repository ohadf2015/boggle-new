'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CelebrationBeats, type CelebrationCue } from './CelebrationBeats';
import { PressButton } from './PressButton';
import type { MotionChip } from './StaggerChips';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface RoundCelebrationProps {
  /** A new key replays the beat; a dismissed key stays dismissed across re-renders. */
  roundKey: string;
  rank: number;
  total: number;
  score: number;
  xp?: number | null;
  coins?: number | null;
  hero: ReactNode;
  t: Translate;
  onBeat?: (cue: CelebrationCue) => void;
  onDone?: () => void;
}

export function RoundCelebration({ roundKey, rank, total, score, xp, coins, hero, t, onBeat, onDone }: RoundCelebrationProps) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const chips = useMemo<MotionChip[]>(() => {
    const list: MotionChip[] = [{ id: 'points', label: t('eduLiveRoom.studentResults.points'), value: score, tone: 'yellow' }];
    if (xp && xp > 0) list.push({ id: 'xp', label: t('common.xp'), value: xp, tone: 'purple' });
    if (coins && coins > 0) list.push({ id: 'coins', label: t('common.coins'), value: coins, tone: 'lime' });
    return list;
  }, [t, score, xp, coins]);

  if (rank < 1 || total < 1 || dismissed === roundKey) return null;

  const close = () => {
    setDismissed(roundKey);
    onDone?.();
  };

  return (
    <CelebrationBeats
      hero={hero}
      headline={t('eduLiveRoom.studentResults.rankOf', { rank, total })}
      chips={chips}
      skipLabel={t('common.skip')}
      onBeat={onBeat}
      cta={
        <PressButton
          data-testid="edu-celebration-continue"
          onClick={close}
          className="min-h-14 w-full rounded-neo border-[3px] border-neo-black bg-neo-lime px-6 font-neo-display text-xl font-black uppercase tracking-wide text-neo-black"
        >
          {t('common.continue')}
        </PressButton>
      }
    />
  );
}
