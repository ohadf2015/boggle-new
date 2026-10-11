'use client';

import { memo, useMemo } from 'react';
import { ShellKeysCard, ShellStandings, ShellStats, ShellWordFeed, type ShellStat, type ShellT } from '@/components/game/shell';
import { SurvivalLiveRanks } from './SurvivalLiveRanks';
import { MAX_ATTEMPTS } from './constants';
import type { TargetAttempt, WordDiscovery } from './types';

interface HuntLeftRailProps {
  t: ShellT;
  liveScore: number;
  lifePoints: number;
  hintStage: number;
  attempts: readonly TargetAttempt[];
  /** Quick play: finished ghost scores to race. */
  rivals?: ReadonlyArray<{ username: string; score: number }>;
  /** Daily: the live leaderboard for this puzzle. */
  daily?: { puzzleDate: string; language: string; currentPlayerId: string | null; currentGuestFingerprint: string | null };
}

export const HuntLeftRail = memo(function HuntLeftRail({ t, liveScore, lifePoints, hintStage, attempts, rivals, daily }: HuntLeftRailProps) {
  const triesLeft = Math.max(0, MAX_ATTEMPTS - attempts.filter((a) => !a.isDiscovery).length);
  const stats = useMemo<ShellStat[]>(
    () => [
      { id: 'score', label: t('gameShell.score') ?? '', value: liveScore, tone: 'accent' },
      { id: 'life', label: t('gameShell.life') ?? '', value: `${Math.round(lifePoints)}%`, bumpKey: Math.round(lifePoints / 10), tone: lifePoints <= 25 ? 'warn' : 'plain' },
      { id: 'tries', label: t('gameShell.tries') ?? '', value: triesLeft, tone: triesLeft <= 2 ? 'warn' : 'plain' },
      { id: 'clues', label: t('gameShell.clues') ?? '', value: hintStage },
    ],
    [t, liveScore, lifePoints, triesLeft, hintStage],
  );
  const rows = useMemo(
    () =>
      rivals?.length
        ? [{ id: 'me', name: t('gameShell.you') ?? '', score: liveScore, isMe: true }, ...rivals.map((r, i) => ({ id: `rival-${i}`, name: r.username, score: r.score }))]
        : [],
    [t, liveScore, rivals],
  );

  return (
    <>
      {rows.length > 1 && <ShellStandings rows={rows} t={t} />}
      {daily && rows.length === 0 && (
        <section className="min-h-0 flex-1 overflow-hidden rounded-[14px] border-3 border-black bg-[#16213e] shadow-[4px_4px_0_#000]">
          <SurvivalLiveRanks
            puzzleDate={daily.puzzleDate}
            language={daily.language}
            currentPlayerId={daily.currentPlayerId}
            currentGuestFingerprint={daily.currentGuestFingerprint}
            t={(k) => t(k) ?? k}
          />
        </section>
      )}
      <ShellStats title={t('gameShell.round') ?? ''} stats={stats} />
      <ShellKeysCard t={t} />
    </>
  );
});

export const HuntRightRail = memo(function HuntRightRail({ t, words }: { t: ShellT; words: readonly WordDiscovery[] }) {
  const feed = useMemo(
    () => [...words].sort((a, b) => a.timestamp - b.timestamp).map((w) => ({ word: w.word, detail: w.lifeGained > 0 ? `+${w.lifeGained}♥` : undefined })),
    [words],
  );
  return <ShellWordFeed words={feed} t={t} />;
});
