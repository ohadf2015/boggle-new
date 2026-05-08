import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { ThemedPanel } from './ThemedPanel';
import CircularTimer from '../../ui/CircularTimer';
import { MyStatsCard } from './insights/MyStatsCard';
import { OpponentInsightFeed, type OpponentWord } from './insights/OpponentInsightFeed';
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
  opponentWords?: OpponentWord[];
  startTimeMs?: number;
}

export function StandardDesktopAdapter(props: StandardDesktopAdapterProps) {
  const { t } = useLanguage();
  const slots: ShellSlots = {
    left: {
      roster: (
        <ThemedPanel
          mode="classic"
          variant="rail"
          header={t('mp.insights.rosterHeader')}
          headerRight={`${props.leaderboard.length}`}
          testId="standard-roster"
        >
          <RosterRail players={props.leaderboard} />
        </ThemedPanel>
      ),
      modeBadge: (
        <ThemedPanel mode="classic" variant="badge" testId="standard-mode-badge" withTexture>
          <div className="flex items-center gap-3 animate-mp-shell-fade">
            <CircularTimer
              duration={props.totalTime}
              initialRemainingTime={props.remainingTime}
              isPlaying
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
      secondary: (
        <MyStatsCard
          mode="classic"
          meId={props.meId}
          foundWords={props.foundWords}
          startTimeMs={props.startTimeMs}
        />
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: (
        <ThemedPanel
          mode="classic"
          variant="rail"
          header={t('mp.insights.foundHeader')}
          headerRight={`${props.foundWords.length}`}
          testId="standard-ladder"
        >
          <LatestScoreTickBanner mode="classic" meId={props.meId} leaderboard={props.leaderboard} />
          <WordsLadder words={props.foundWords} meId={props.meId} />
        </ThemedPanel>
      ),
      activityStream: (
        <div className="flex flex-col gap-2">
          <PaceDeltaChip mode="classic" leaderboard={props.leaderboard} meId={props.meId} />
          {props.opponentWords && props.opponentWords.length > 0 && (
            <OpponentInsightFeed mode="classic" opponentWords={props.opponentWords} />
          )}
          <KeyboardHintStrip />
        </div>
      ),
    },
    meta: { mode: 'classic', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
