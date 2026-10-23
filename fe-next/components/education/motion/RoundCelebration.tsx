'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CelebrationBeats, type CelebrationCue } from './CelebrationBeats';
import { PressButton } from './PressButton';
import type { MotionChip } from './StaggerChips';

type Translate = (key: string, params?: Record<string, string | number>) => string;

// Marked when shown, not when dismissed, so a remount mid-beat never re-pops it.
const seenRounds = new Set<string>();

export interface RoundCelebrationProps {
  /** Plays once per key for the page's lifetime: a remount (reconnect, phase swap) never replays it. */
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
  const [showing, setShowing] = useState<string | null>(null);
  const placed = rank >= 1 && total >= 1;
  useEffect(() => {
    if (!placed || seenRounds.has(roundKey)) return;
    seenRounds.add(roundKey);
    setShowing(roundKey);
  }, [placed, roundKey]);
  const chips = useMemo<MotionChip[]>(() => {
    const list: MotionChip[] = [{ id: 'points', label: t('eduLiveRoom.studentResults.points'), value: score, tone: 'yellow' }];
    if (xp && xp > 0) list.push({ id: 'xp', label: t('common.xp'), value: xp, tone: 'purple' });
    if (coins && coins > 0) list.push({ id: 'coins', label: t('common.coins'), value: coins, tone: 'lime' });
    return list;
  }, [t, score, xp, coins]);

  const fresh = showing === roundKey || !seenRounds.has(roundKey);
  if (!placed || !fresh || dismissed === roundKey) return null;

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
