'use client';

import { memo, useMemo } from 'react';
import { ShellClock, ShellKeysCard, ShellStats, ShellWordFeed, type ShellStat, type ShellT } from '@/components/game/shell';

interface AdventureLeftRailProps {
  t: ShellT;
  secsLeft: number;
  totalSecs: number;
  score: number;
  words: readonly string[];
  stars: readonly number[];
}

export const AdventureLeftRail = memo(function AdventureLeftRail({ t, secsLeft, totalSecs, score, words, stars }: AdventureLeftRailProps) {
  const stats = useMemo<ShellStat[]>(
    () => [
      { id: 'score', label: t('gameShell.score') ?? '', value: score, tone: 'accent' },
      { id: 'found', label: t('gameShell.found') ?? '', value: words.length },
      { id: 'best', label: t('gameShell.best') ?? '', value: words.reduce((n, w) => Math.max(n, w.length), 0) },
      { id: 'target', label: t('gameShell.target') ?? '', value: stars[stars.length - 1] ?? 0 },
    ],
    [t, score, words, stars],
  );
  const top = stars[stars.length - 1] || 1;
  return (
    <>
      <ShellClock t={t} remaining={secsLeft} total={totalSecs} />
      <ShellStats
        title={t('gameShell.round') ?? ''}
        stats={stats}
        progress={{ label: '', value: score / top }}
      />
      <ShellKeysCard t={t} />
    </>
  );
});

export const AdventureRightRail = memo(function AdventureRightRail({ t, words }: { t: ShellT; words: readonly string[] }) {
  const feed = useMemo(() => words.map((word) => ({ word })), [words]);
  return <ShellWordFeed words={feed} t={t} />;
});
