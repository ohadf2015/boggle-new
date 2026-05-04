import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import CircularTimer from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface StandardDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  canvas: ReactNode;
  meId?: string;
}

/**
 * Maps the standard-wheel multiplayer mode's store/props onto the typed
 * `ShellSlots` contract. The adapter owns no gameplay logic — it's purely
 * a layout-shaped projection of the existing mode state.
 */
export function StandardDesktopAdapter(props: StandardDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer
            duration={props.totalTime}
            isPlaying={true}
            size={80}
            colorFamily="cyan"
          />
          <span className="font-bold uppercase">Standard</span>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'standard', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
