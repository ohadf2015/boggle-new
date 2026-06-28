import { memo, useMemo, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { type RosterPlayer } from './RosterRail';
import { DesktopRivalsRosterRail } from './DesktopRivalsRosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { ThemedPanel } from './ThemedPanel';
import { ShellBadgeTimer } from './ShellBadgeTimer';
import { MyStatsCard } from './insights/MyStatsCard';
import { OpponentInsightFeedConnected } from './insights/OpponentInsightFeedConnected';
import { PaceDeltaChip } from './insights/PaceDeltaChip';
import { LatestScoreTickBanner } from './insights/LatestScoreTickBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ShellSlots } from './types';

export interface StandardDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  canvas: ReactNode;
  meId?: string;
  /** Socket reference for self-subscribing opponent-insight feed. Owning the
   *  `opponentWordFound` listener inside the feed (rather than the parent
   *  game view) keeps drag-selection rendering off the path of opponent
   *  socket bursts. */
  socket?: Socket | null;
  startTimeMs?: number;
}

function StandardDesktopAdapterImpl(props: StandardDesktopAdapterProps) {
  const { t } = useLanguage();
  const {
    roomId,
    leaderboard,
    foundWords,
    remainingTime,
    totalTime,
    canvas,
    meId,
    socket,
    startTimeMs,
  } = props;

  // Memoize each slot subtree so timer-driven re-renders (e.g. remainingTime
  // ticking each second) don't rebuild the entire ShellSlots graph and
  // re-render every downstream insight component. Each slot only rebuilds
  // when its actual inputs change.
  // Live "Close Race" rivals + roster, now the SAME shared component used by every
  // MP desktop mode (blast/wheel-rush/word-hunt) so the rivals panel renders
  // identically everywhere — see DesktopRivalsRosterRail.
  const rosterSlot = useMemo(
    () => (
      <DesktopRivalsRosterRail
        mode="classic"
        leaderboard={leaderboard}
        meId={meId}
        rosterTestId="standard-roster"
      />
    ),
    [leaderboard, meId],
  );

  const modeBadgeSlot = useMemo(
    () => (
      <ThemedPanel mode="classic" variant="badge" testId="standard-mode-badge" withTexture>
        <div className="flex items-center gap-3 animate-mp-shell-fade">
          <ShellBadgeTimer
            totalTime={totalTime}
            remainingTime={remainingTime}
            size={80}
            colorFamily="cyan"
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono opacity-50">MP</span>
            <span className="font-neo-display font-bold text-xl uppercase tracking-wide">
              {t('mp.modeName.classic')}
            </span>
          </div>
        </div>
      </ThemedPanel>
    ),
    [t, totalTime, remainingTime],
  );

  const secondarySlot = useMemo(
    () => (
      <MyStatsCard
        mode="classic"
        meId={meId}
        foundWords={foundWords}
        startTimeMs={startTimeMs}
      />
    ),
    [meId, foundWords, startTimeMs],
  );

  const wordsLadderSlot = useMemo(
    () => (
      <ThemedPanel
        mode="classic"
        variant="rail"
        header={t('mp.insights.foundHeader')}
        headerRight={`${foundWords.length}`}
        testId="standard-ladder"
      >
        <LatestScoreTickBanner mode="classic" meId={meId} leaderboard={leaderboard} />
        <WordsLadder words={foundWords} meId={meId} />
      </ThemedPanel>
    ),
    [t, foundWords, meId, leaderboard],
  );

  const activityStreamSlot = useMemo(
    () => (
      <div className="flex flex-col gap-2">
        <PaceDeltaChip mode="classic" leaderboard={leaderboard} meId={meId} />
        {socket && meId && (
          <OpponentInsightFeedConnected
            mode="classic"
            socket={socket}
            currentPlayerName={meId}
          />
        )}
        <KeyboardHintStrip />
      </div>
    ),
    [leaderboard, meId, socket],
  );

  const slots: ShellSlots = useMemo(
    () => ({
      left: {
        roster: rosterSlot,
        modeBadge: modeBadgeSlot,
        secondary: secondarySlot,
      },
      center: canvas,
      right: {
        wordsLadder: wordsLadderSlot,
        activityStream: activityStreamSlot,
      },
      meta: { mode: 'classic', roomId },
    }),
    [rosterSlot, modeBadgeSlot, secondarySlot, canvas, wordsLadderSlot, activityStreamSlot, roomId],
  );

  return <MultiplayerDesktopShell slots={slots} />;
}

export const StandardDesktopAdapter = memo(StandardDesktopAdapterImpl);
