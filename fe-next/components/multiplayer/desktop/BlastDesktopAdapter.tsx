import type { ReactNode } from 'react';
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
import { GoalBanner, type BlastGoal } from './insights/GoalBanner';
import { ComboCounter } from './insights/ComboCounter';
import { RetiredTilesChip } from './insights/RetiredTilesChip';
import { LuckyBoostChip } from './insights/LuckyBoostChip';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ShellSlots } from './types';

export interface BlastDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  canvas: ReactNode;
  meId?: string;
  /** Socket reference for self-subscribing opponent-insight feed. The
   *  feed handles its own `opponentWordFound` listener so socket bursts
   *  don't cascade into a shell-wide re-render mid-drag. */
  socket?: Socket | null;
  startTimeMs?: number;
  goal?: BlastGoal;
  comboCount?: number;
  comboMultiplier?: number;
  retiredTileCount?: number;
  luckyBoostActive?: boolean;
}

export function BlastDesktopAdapter(props: BlastDesktopAdapterProps) {
  const { t } = useLanguage();
  const goal: BlastGoal = props.goal ?? { type: 'classic' };
  const slots: ShellSlots = {
    left: {
      roster: (
        <DesktopRivalsRosterRail
          mode="blast"
          leaderboard={props.leaderboard}
          meId={props.meId}
          rosterTestId="blast-roster"
        />
      ),
      modeBadge: (
        <ThemedPanel mode="blast" variant="badge" testId="blast-mode-badge">
          <div className="flex items-center gap-3 animate-mp-shell-fade">
            <ShellBadgeTimer
              totalTime={props.totalTime}
              remainingTime={props.remainingTime}
              size={88}
              colorFamily="lime"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[10px] font-mono opacity-50">MP</span>
              <span className="font-neo-display font-bold uppercase text-xl tracking-wide truncate">
                {t('mp.modeName.blast')}
              </span>
              <div className="flex gap-1 flex-wrap mt-1">
                <RetiredTilesChip count={props.retiredTileCount ?? 0} />
                <LuckyBoostChip active={props.luckyBoostActive ?? false} />
              </div>
            </div>
          </div>
        </ThemedPanel>
      ),
      secondary: (
        <div className="flex flex-col gap-3">
          {goal.type !== 'classic' && <GoalBanner mode="blast" goal={goal} />}
          <MyStatsCard mode="blast" meId={props.meId} foundWords={props.foundWords} startTimeMs={props.startTimeMs} />
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: (
        <ThemedPanel
          mode="blast"
          variant="rail"
          header={t('mp.insights.foundHeader')}
          headerRight={`${props.foundWords.length}`}
          testId="blast-ladder"
        >
          <LatestScoreTickBanner mode="blast" meId={props.meId} leaderboard={props.leaderboard} />
          <WordsLadder words={props.foundWords} meId={props.meId} />
        </ThemedPanel>
      ),
      activityStream: (
        <div className="flex flex-col gap-2">
          <ComboCounter mode="blast" count={props.comboCount ?? 0} multiplier={props.comboMultiplier ?? 1} />
          <PaceDeltaChip mode="blast" leaderboard={props.leaderboard} meId={props.meId} />
          {props.socket && props.meId && (
            <OpponentInsightFeedConnected
              mode="blast"
              socket={props.socket}
              currentPlayerName={props.meId}
            />
          )}
          <KeyboardHintStrip />
        </div>
      ),
    },
    meta: { mode: 'blast', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
