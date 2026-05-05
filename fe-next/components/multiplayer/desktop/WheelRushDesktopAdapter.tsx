import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import CircularTimer from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface WheelRushDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  fogProgress: number; // 0..1
  canvas: ReactNode;
  meId?: string;
}

/**
 * Wheel Rush desktop adapter. Maps wheel-rush mode props onto the desktop shell.
 * Includes a fog-progress meter in `left.secondary` (Wheel Rush has a closing-fog
 * mechanic that should be visible at-a-glance during the round).
 */
export function WheelRushDesktopAdapter(props: WheelRushDesktopAdapterProps) {
  const fogPct = Math.max(0, Math.min(1, props.fogProgress)) * 100;
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer duration={props.totalTime} isPlaying size={80} colorFamily="pink" />
          <span className="font-bold uppercase">Wheel Rush</span>
        </div>
      ),
      secondary: (
        <div data-testid="wr-fog-meter" className="p-2 border-2 border-foreground rounded bg-card">
          <div className="text-xs uppercase opacity-70 mb-1">Fog</div>
          <div className="h-2 bg-foreground/10 rounded overflow-hidden">
            <div
              className="h-full bg-neo-pink"
              style={{ width: `${fogPct}%` }}
              aria-label={`fog ${Math.round(fogPct)} percent`}
            />
          </div>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'wheel-rush', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
