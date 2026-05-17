import type { ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import { ThemedPanel } from './ThemedPanel';
import CircularTimer from '../../ui/CircularTimer';
import { MyStatsCard } from './insights/MyStatsCard';
import { OpponentInsightFeedConnected } from './insights/OpponentInsightFeedConnected';
import { PaceDeltaChip } from './insights/PaceDeltaChip';
import { LatestScoreTickBanner } from './insights/LatestScoreTickBanner';
import { SpinCounter } from './insights/SpinCounter';
import { RarityHeatChip } from './insights/RarityHeatChip';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ShellSlots } from './types';

export interface WheelRushDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  fogProgress: number;
  canvas: ReactNode;
  meId?: string;
  /** Socket reference for self-subscribing opponent-insight feed (see BlastDesktopAdapter). */
  socket?: Socket | null;
  startTimeMs?: number;
  currentSpin?: number;
  totalSpins?: number;
  lastWordRarity?: 'common' | 'uncommon' | 'rare' | 'legendary' | null;
}

export function WheelRushDesktopAdapter(props: WheelRushDesktopAdapterProps) {
  const { t } = useLanguage();
  const fogPct = Math.max(0, Math.min(1, props.fogProgress)) * 100;
  const slots: ShellSlots = {
    left: {
      roster: (
        <ThemedPanel
          mode="wheel-rush"
          variant="rail"
          header={t('mp.insights.rosterHeader')}
          headerRight={`${props.leaderboard.length}`}
          testId="wr-roster"
        >
          <RosterRail players={props.leaderboard} />
        </ThemedPanel>
      ),
      modeBadge: (
        <ThemedPanel mode="wheel-rush" variant="badge" testId="wr-mode-badge">
          <div className="flex flex-col items-center gap-3 animate-mp-shell-fade">
            <div className="flex items-center justify-between w-full">
              <span className="font-neo-display font-bold uppercase text-sm tracking-widest text-neo-pink">
                {t('mp.modeName.wheelRush')}
              </span>
              {props.currentSpin != null && props.totalSpins != null && (
                <SpinCounter current={props.currentSpin} total={props.totalSpins} />
              )}
            </div>
            <CircularTimer
              duration={props.totalTime}
              initialRemainingTime={props.remainingTime}
              isPlaying
              size={88}
              colorFamily="pink"
            />
          </div>
        </ThemedPanel>
      ),
      secondary: (
        <div className="flex flex-col gap-3">
          <ThemedPanel mode="wheel-rush" variant="rail" header={t('mp.insights.fogHeader')} testId="wr-fog-meter">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-neo-display font-bold uppercase opacity-60 tracking-wide">
                {t('mp.insights.fogLabel')}
              </span>
              <span className={cn('text-xs tabular-nums font-bold', fogPct > 0 ? 'text-neo-pink' : 'opacity-30')}>
                {fogPct > 0 ? `${Math.round(fogPct)}%` : '—'}
              </span>
            </div>
            <div className="h-2 bg-foreground/10 rounded-full overflow-hidden border border-foreground/10">
              <div
                className={cn('h-full rounded-full transition-all duration-500', fogPct > 0 ? 'bg-neo-pink' : 'bg-neo-lime/30')}
                style={{ width: `${fogPct > 0 ? fogPct : 100}%` }}
                aria-label={`fog ${Math.round(fogPct)} percent`}
              />
            </div>
          </ThemedPanel>
          <MyStatsCard mode="wheel-rush" meId={props.meId} foundWords={props.foundWords} startTimeMs={props.startTimeMs} />
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: (
        <ThemedPanel
          mode="wheel-rush"
          variant="rail"
          header={t('mp.insights.foundHeader')}
          headerRight={`${props.foundWords.length}`}
          testId="wr-ladder"
        >
          <LatestScoreTickBanner mode="wheel-rush" meId={props.meId} leaderboard={props.leaderboard} />
          {props.lastWordRarity && (
            <div className="mb-2"><RarityHeatChip rarity={props.lastWordRarity} /></div>
          )}
          <WordsLadder words={props.foundWords} meId={props.meId} />
        </ThemedPanel>
      ),
      activityStream: (
        <div className="flex flex-col gap-2">
          <PaceDeltaChip mode="wheel-rush" leaderboard={props.leaderboard} meId={props.meId} />
          {props.socket && props.meId && (
            <OpponentInsightFeedConnected
              mode="wheel-rush"
              socket={props.socket}
              currentPlayerName={props.meId}
            />
          )}
          <KeyboardHintStrip />
        </div>
      ),
    },
    meta: { mode: 'wheel-rush', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
