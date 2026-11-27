'use client';

import { memo, useMemo } from 'react';
import { ShellKeysCard, ShellStandings, ShellWordFeed, type ShellT } from '@/components/game/shell';

interface FoundWordLike {
  word: string;
  score: number;
  isValid: boolean | null;
}

interface QuickClassicLeftRailProps {
  t: ShellT;
  leaderboard: ReadonlyArray<{ username: string; score: number }>;
  selfUsername: string;
}

export const QuickClassicLeftRail = memo(function QuickClassicLeftRail({
  t, leaderboard, selfUsername,
}: QuickClassicLeftRailProps) {
  const rows = useMemo(
    () =>
      leaderboard.map((p) => {
        const isMe = p.username === selfUsername;
        return { id: p.username, name: isMe ? (t('gameShell.you') ?? p.username) : p.username, score: p.score, isMe };
      }),
    [leaderboard, selfUsername, t],
  );
  return (
    <>
      {rows.length > 1 && <ShellStandings rows={rows} t={t} />}
      <ShellKeysCard t={t} compact />
    </>
  );
});

export const QuickClassicRightRail = memo(function QuickClassicRightRail({ t, validWords }: { t: ShellT; validWords: readonly FoundWordLike[] }) {
  const feed = useMemo(() => validWords.map((w) => ({ word: w.word, score: w.score })), [validWords]);
  return <ShellWordFeed words={feed} t={t} />;
});
