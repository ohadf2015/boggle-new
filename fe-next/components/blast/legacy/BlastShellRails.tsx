'use client';

import { memo, useMemo } from 'react';
import { ShellKeysCard, ShellPanel, ShellStandings, ShellWordFeed, type ShellT } from '@/components/game/shell';
import { BlastTileLegendList } from './BlastTileLegend';

interface BlastLeftRailProps {
  t: ShellT;
  leaderboard?: ReadonlyArray<{ username: string; score: number }>;
  username?: string;
}

/** Score, moves and clear progress live in the BlastHUD over the board; the rail carries what it cannot. */
export const BlastLeftRail = memo(function BlastLeftRail({ t, leaderboard, username }: BlastLeftRailProps) {
  const rows = useMemo(
    () =>
      (leaderboard ?? []).map((p) => {
        const isMe = !!username && p.username === username;
        return { id: p.username, name: isMe ? (t('gameShell.you') ?? p.username) : p.username, score: p.score, isMe };
      }),
    [leaderboard, username, t],
  );

  return (
    <>
      {rows.length > 1 && <ShellStandings rows={rows} t={t} />}
      <ShellPanel title={t('blast.tileGuide.title')} fill testId="blast-tile-legend">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
          <BlastTileLegendList t={t} compact />
        </div>
      </ShellPanel>
      <ShellKeysCard t={t} />
    </>
  );
});

export const BlastRightRail = memo(function BlastRightRail({ t, words }: { t: ShellT; words: readonly string[] }) {
  const feed = useMemo(() => words.map((word) => ({ word })), [words]);
  return <ShellWordFeed words={feed} t={t} />;
});
