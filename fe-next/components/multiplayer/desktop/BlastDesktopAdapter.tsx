import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import CircularTimer from '../../ui/CircularTimer';
import type { ShellSlots } from './types';

export interface BlastDesktopAdapterProps {
  roomId: string;
  leaderboard: RosterPlayer[];
  foundWords: LadderWord[];
  remainingTime: number;
  totalTime: number;
  comboCount: number;
  canvas: ReactNode;
  meId?: string;
}

/**
 * Blast desktop adapter. Same shell shape as Wheel Rush, plus a combo meter
 * in `left.secondary` (Blast has chained combos that should be visible
 * at-a-glance; loud × number reinforces the chain payoff).
 */
export function BlastDesktopAdapter(props: BlastDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer duration={props.totalTime} isPlaying size={80} colorFamily="lime" />
          <span className="font-bold uppercase">Blast</span>
        </div>
      ),
      secondary: (
        <div data-testid="blast-combo-meter" className="p-2 border-2 border-foreground rounded bg-card text-center">
          <div className="text-xs uppercase opacity-70">Combo</div>
          <div className="text-2xl font-extrabold tabular-nums">×{props.comboCount}</div>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'blast', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
