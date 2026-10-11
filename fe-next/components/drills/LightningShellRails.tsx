'use client';

import { useMemo } from 'react';
import { ShellClock, ShellKeysCard, ShellStats, ShellWordFeed, type ShellStat, type ShellT } from '@/components/game/shell';

interface LeftRailProps {
  t: ShellT;
  remaining: number;
  total: number;
  score: number;
  found: number;
  target: number;
  streak: number;
}

export function LightningLeftRail({ t, remaining, total, score, found, target, streak }: LeftRailProps) {
  const stats = useMemo<ShellStat[]>(
    () => [
      { id: 'score', label: t('gameShell.score') ?? '', value: score, tone: 'accent' },
      { id: 'found', label: t('gameShell.found') ?? '', value: `${found}/${target}` },
      { id: 'streak', label: t('gameShell.streak') ?? '', value: streak, tone: streak >= 3 ? 'warn' : 'plain' },
    ],
    [t, score, found, target, streak],
  );
  return (
    <>
      <ShellClock t={t} remaining={remaining} total={total} />
      <ShellStats
        title={t('gameShell.round') ?? ''}
        stats={stats}
        progress={{ label: t('gameShell.target') ?? '', value: target > 0 ? found / target : 0 }}
      />
      <ShellKeysCard t={t} />
    </>
  );
}

export function LightningRightRail({ t, words }: { t: ShellT; words: readonly string[] }) {
  const feed = useMemo(() => words.map((word) => ({ word })), [words]);
  return <ShellWordFeed words={feed} t={t} />;
}
