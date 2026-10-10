'use client';

import { memo, useMemo } from 'react';
import { ShellClock, ShellKeysCard, ShellStandings, ShellStats, ShellWordFeed, type ShellStat, type ShellT } from '@/components/game/shell';

interface FoundWordLike {
  word: string;
  score: number;
  isValid: boolean | null;
}

interface QuickClassicLeftRailProps {
  t: ShellT;
  remaining: number;
  total: number;
  score: number;
  validWords: readonly FoundWordLike[];
  leaderboard: ReadonlyArray<{ username: string; score: number }>;
  selfUsername: string;
}

export const QuickClassicLeftRail = memo(function QuickClassicLeftRail({
  t, remaining, total, score, validWords, leaderboard, selfUsername,
}: QuickClassicLeftRailProps) {
  const rows = useMemo(
    () =>
      leaderboard.map((p) => {
        const isMe = p.username === selfUsername;
        return { id: p.username, name: isMe ? (t('gameShell.you') ?? p.username) : p.username, score: p.score, isMe };
      }),
    [leaderboard, selfUsername, t],
  );
  const stats = useMemo<ShellStat[]>(
    () => [
      { id: 'score', label: t('gameShell.score') ?? '', value: score, tone: 'accent' },
      { id: 'found', label: t('gameShell.found') ?? '', value: validWords.length },
    ],
    [t, score, validWords.length],
  );

  return (
    <>
      <ShellClock t={t} remaining={remaining} total={total} />
      {rows.length > 1 && <ShellStandings rows={rows} t={t} />}
      <ShellStats title={t('gameShell.round') ?? ''} stats={stats} />
      <ShellKeysCard t={t} />
    </>
  );
});

export const QuickClassicRightRail = memo(function QuickClassicRightRail({ t, validWords }: { t: ShellT; validWords: readonly FoundWordLike[] }) {
  const feed = useMemo(() => validWords.map((w) => ({ word: w.word, score: w.score })), [validWords]);
  return <ShellWordFeed words={feed} t={t} />;
});
