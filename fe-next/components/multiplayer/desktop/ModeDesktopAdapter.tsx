import { memo, useMemo, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { type RosterPlayer } from './RosterRail';
import { DesktopRivalsRosterRail } from './DesktopRivalsRosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { ThemedPanel } from './ThemedPanel';
import { ShellBadgeTimer } from '../shell/MpTimer';
import { MyStatsCard } from './insights/MyStatsCard';
import { OpponentInsightFeedConnected } from './insights/OpponentInsightFeedConnected';
import { PaceDeltaChip } from './insights/PaceDeltaChip';
import { LatestScoreTickBanner } from './insights/LatestScoreTickBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MpDesktopMode, ShellSlots } from './types';

/** Props every mode adapter shares (the live data the frame maps in). */
export interface DesktopAdapterBaseProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  canvas: ReactNode;
  meId?: string;
  /** For the self-subscribing opponent-insight feed — keeps opponent socket
   *  bursts off the drag-selection render path. */
  socket?: Socket | null;
  startTimeMs?: number;
}

/** What differs per mode. Extras must be memoized by the caller. */
export interface ModeDesktopConfig {
  mode: MpDesktopMode;
  /** Test-id prefix, kept per mode: standard / blast / hunt / wr. */
  testPrefix: string;
  modeNameKey: string;
  timerColor: 'lime' | 'pink' | 'cyan' | 'purple';
  timerSize: number;
  /** `row`: timer beside the name · `stacked`: name row above the timer (Wheel Rush). */
  badgeLayout?: 'row' | 'stacked';
  withTexture?: boolean;
  /** Under the mode name (row) or beside it (stacked). */
  badgeExtra?: ReactNode;
  /** Above MyStatsCard in the left rail. */
  secondaryExtra?: ReactNode;
  /** Above the words ladder, under the score tick. */
  ladderExtra?: ReactNode;
  /** First item of the activity stream. */
  streamExtra?: ReactNode;
}

type Props = DesktopAdapterBaseProps & { config: ModeDesktopConfig };

/**
 * The one desktop in-game shell for every MP mode. The four mode adapters were
 * ~90% identical copies; they are now thin configs over this. Each slot is
 * memoized on its own inputs so the 1-Hz `remainingTime` tick re-renders the
 * badge only — never the roster, ladder or insight feeds.
 */
function ModeDesktopAdapterImpl({ config, roomId, leaderboard, foundWords, remainingTime, totalTime, canvas, meId, socket, startTimeMs }: Props) {
  const { t } = useLanguage();
  const { mode, testPrefix, modeNameKey, timerColor, timerSize, badgeLayout = 'row', withTexture, badgeExtra, secondaryExtra, ladderExtra, streamExtra } = config;

  const rosterSlot = useMemo(
    () => <DesktopRivalsRosterRail mode={mode} leaderboard={leaderboard} meId={meId} rosterTestId={`${testPrefix}-roster`} />,
    [mode, leaderboard, meId, testPrefix],
  );

  const modeBadgeSlot = useMemo(() => {
    const timer = <ShellBadgeTimer totalTime={totalTime} remainingTime={remainingTime} size={timerSize} colorFamily={timerColor} />;
    return (
      <ThemedPanel mode={mode} variant="badge" testId={`${testPrefix}-mode-badge`} withTexture={withTexture}>
        {badgeLayout === 'stacked' ? (
          <div className="flex flex-col items-center gap-3 animate-mp-shell-fade">
            <div className="flex items-center justify-between w-full">
              <span className="font-neo-display font-bold uppercase text-sm tracking-widest text-neo-pink">{t(modeNameKey)}</span>
              {badgeExtra}
            </div>
            {timer}
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-mp-shell-fade">
            {timer}
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-mono opacity-70">MP</span>
              <span className="font-neo-display font-bold uppercase text-xl tracking-wide truncate">{t(modeNameKey)}</span>
              {badgeExtra}
            </div>
          </div>
        )}
      </ThemedPanel>
    );
  }, [t, mode, testPrefix, modeNameKey, timerColor, timerSize, badgeLayout, withTexture, badgeExtra, totalTime, remainingTime]);

  const secondarySlot = useMemo(
    () => (
      <div className="flex flex-col gap-3">
        {secondaryExtra}
        <MyStatsCard mode={mode} meId={meId} foundWords={foundWords} startTimeMs={startTimeMs} />
      </div>
    ),
    [secondaryExtra, mode, meId, foundWords, startTimeMs],
  );

  const wordsLadderSlot = useMemo(
    () => (
      <ThemedPanel
        mode={mode}
        variant="rail"
        header={t('mp.insights.foundHeader')}
        headerRight={`${foundWords.length}`}
        fill
        testId={`${testPrefix}-ladder`}
      >
        <LatestScoreTickBanner mode={mode} meId={meId} leaderboard={leaderboard} />
        {ladderExtra}
        <WordsLadder words={foundWords} meId={meId} />
      </ThemedPanel>
    ),
    [t, mode, testPrefix, foundWords, meId, leaderboard, ladderExtra],
  );

  const activityStreamSlot = useMemo(
    () => (
      <div className="flex flex-col gap-2">
        {streamExtra}
        <PaceDeltaChip mode={mode} leaderboard={leaderboard} meId={meId} />
        {socket && meId && <OpponentInsightFeedConnected mode={mode} socket={socket} currentPlayerName={meId} />}
        {foundWords.length === 0 && <KeyboardHintStrip />}
      </div>
    ),
    [streamExtra, mode, leaderboard, meId, socket, foundWords.length],
  );

  const slots: ShellSlots = useMemo(
    () => ({
      left: { roster: rosterSlot, modeBadge: modeBadgeSlot, secondary: secondarySlot },
      center: canvas,
      right: { wordsLadder: wordsLadderSlot, activityStream: activityStreamSlot },
      meta: { mode, roomId },
    }),
    [rosterSlot, modeBadgeSlot, secondarySlot, canvas, wordsLadderSlot, activityStreamSlot, mode, roomId],
  );

  return <MultiplayerDesktopShell slots={slots} />;
}

export const ModeDesktopAdapter = memo(ModeDesktopAdapterImpl);
ModeDesktopAdapter.displayName = 'ModeDesktopAdapter';
