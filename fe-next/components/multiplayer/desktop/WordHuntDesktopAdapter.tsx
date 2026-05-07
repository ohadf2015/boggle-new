import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import CircularTimer from '../../ui/CircularTimer';
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
}

/**
 * Word Hunt desktop adapter. Same shell shape as Blast/Wheel Rush, plus a
 * target-category chip in `left.secondary` (Word Hunt has a guess-the-target
 * mechanic; the active category needs to be glanceable during the round).
 */
export function WordHuntDesktopAdapter(props: WordHuntDesktopAdapterProps) {
  const slots: ShellSlots = {
    left: {
      roster: <RosterRail players={props.leaderboard} />,
      modeBadge: (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <CircularTimer duration={props.totalTime} initialRemainingTime={props.remainingTime} isPlaying size={80} colorFamily="purple" />
          <span className="font-bold uppercase">Word Hunt</span>
        </div>
      ),
      secondary: (
        <div data-testid="hunt-target" className="p-3 border-2 border-foreground rounded bg-card">
          <div className="text-xs uppercase opacity-70">Target</div>
          <div className="text-lg font-bold capitalize">{props.targetCategory || '—'}</div>
        </div>
      ),
    },
    center: props.canvas,
    right: {
      wordsLadder: <WordsLadder words={props.foundWords} meId={props.meId} />,
      activityStream: <KeyboardHintStrip />,
    },
    meta: { mode: 'word-hunt', roomId: props.roomId },
  };
  return <MultiplayerDesktopShell slots={slots} />;
}
