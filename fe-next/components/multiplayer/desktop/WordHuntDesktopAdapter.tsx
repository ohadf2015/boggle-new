import type { ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { type RosterPlayer } from './RosterRail';
import { DesktopRivalsRosterRail } from './DesktopRivalsRosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { ThemedPanel } from './ThemedPanel';
import CircularTimer from '../../ui/CircularTimer';
import { MyStatsCard } from './insights/MyStatsCard';
import { OpponentInsightFeedConnected } from './insights/OpponentInsightFeedConnected';
import { PaceDeltaChip } from './insights/PaceDeltaChip';
import { LatestScoreTickBanner } from './insights/LatestScoreTickBanner';
import { CategoryBanner } from './insights/CategoryBanner';
import { HuntProgressMeter } from './insights/HuntProgressMeter';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ShellSlots } from './types';

export interface WordHuntDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  targetCategory: string;
  canvas: ReactNode;
  meId?: string;
  /** Socket reference for self-subscribing opponent-insight feed (see BlastDesktopAdapter). */
  socket?: Socket | null;
  startTimeMs?: number;
  huntFound?: number;
  huntTarget?: number;
}

export function WordHuntDesktopAdapter(props: WordHuntDesktopAdapterProps) {
  const { t } = useLanguage();
  const slots: ShellSlots = {
    left: {
      roster: (
        <DesktopRivalsRosterRail
          mode="word-hunt"
          leaderboard={props.leaderboard}
          meId={props.meId}
          rosterTestId="hunt-roster"
        />
      ),
      modeBadge: (
        <ThemedPanel mode="word-hunt" variant="badge" testId="hunt-mode-badge">
          <div className="flex items-center gap-3 animate-mp-shell-fade">
            <CircularTimer
              duration={props.totalTime}
              initialRemainingTime={props.remainingTime}
              isPlaying
              size={80}
              colorFamily="purple"
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono opacity-50">MP</span>
              <span className="font-neo-display font-bold uppercase text-xl tracking-wide">
                {t('mp.modeName.wordHunt')}
              </span>
            </div>
          </div>
        </ThemedPanel>
      ),
      secondary: (
        <div className="flex flex-col gap-3">
          <CategoryBanner mode="word-hunt" category={props.targetCategory} />
          {props.huntFound != null && props.huntTarget != null && (
            <HuntProgressMeter mode="word-hunt" found={props.huntFound} target={props.huntTarget} />
          )}
          <MyStatsCard mode="word-hunt" meId={props.meId} foundWords={props.foundWords} startTimeMs={props.startTimeMs} />
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: (
        <ThemedPanel
          mode="word-hunt"
          variant="rail"
          header={t('mp.insights.foundHeader')}
          headerRight={`${props.foundWords.length}`}
          testId="hunt-ladder"
        >
          <LatestScoreTickBanner mode="word-hunt" meId={props.meId} leaderboard={props.leaderboard} />
          <WordsLadder words={props.foundWords} meId={props.meId} />
        </ThemedPanel>
      ),
      activityStream: (
        <div className="flex flex-col gap-2">
          <PaceDeltaChip mode="word-hunt" leaderboard={props.leaderboard} meId={props.meId} />
          {props.socket && props.meId && (
            <OpponentInsightFeedConnected
              mode="word-hunt"
              socket={props.socket}
              currentPlayerName={props.meId}
            />
          )}
          <KeyboardHintStrip />
        </div>
      ),
    },
    meta: { mode: 'word-hunt', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
