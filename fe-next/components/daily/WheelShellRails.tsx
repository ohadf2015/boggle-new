'use client';

import { memo, useMemo } from 'react';
import { ShellKeysCard, ShellStandings, ShellStats, ShellWordFeed, type ShellStat, type ShellT } from '@/components/game/shell';

interface WheelLeftRailProps {
  t: ShellT;
  score: number;
  wordCount: number;
  combo: number;
  /** Null hides the race (practice / no cohort). */
  rivals: ReadonlyArray<{ name: string; score: number; playerId: string | null }> | null;
}

export const WheelLeftRail = memo(function WheelLeftRail({ t, score, wordCount, combo, rivals }: WheelLeftRailProps) {
  const rows = useMemo(
    () =>
      rivals
        ? [
            { id: 'me', name: t('gameShell.you') ?? '', score, isMe: true },
            ...rivals.map((r, i) => ({ id: `rival-${r.playerId ?? i}`, name: r.name, score: r.score })),
          ]
        : [],
    [t, score, rivals],
  );
  const stats = useMemo<ShellStat[]>(
    () => [
      { id: 'score', label: t('gameShell.score') ?? '', value: score, tone: 'accent' },
      { id: 'found', label: t('gameShell.found') ?? '', value: wordCount },
      { id: 'combo', label: t('gameShell.combo') ?? '', value: `×${Math.max(1, combo)}`, bumpKey: combo, tone: combo >= 2 ? 'warn' : 'plain' },
    ],
    [t, score, wordCount, combo],
  );
  return (
    <>
      {rows.length > 1 && <ShellStandings rows={rows} t={t} />}
      <ShellStats title={t('gameShell.round') ?? ''} stats={stats} />
      <ShellKeysCard t={t} />
    </>
  );
});

interface WheelRightRailProps {
  t: ShellT;
  /** Found order, oldest first, already in display form. */
  words: ReadonlyArray<{ word: string; score: number }>;
}

export const WheelRightRail = memo(function WheelRightRail({ t, words }: WheelRightRailProps) {
  return <ShellWordFeed words={words} t={t} />;
});
