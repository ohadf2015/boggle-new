import type { ReactNode } from 'react';
import { MultiplayerDesktopShell } from './MultiplayerDesktopShell';
import { RosterRail, type RosterPlayer } from './RosterRail';
import { WordsLadder, type LadderWord } from './WordsLadder';
import { KeyboardHintStrip } from './KeyboardHintStrip';
import CircularTimer from '../../ui/CircularTimer';
import { cn } from '@/lib/utils';
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
        <div className="flex flex-col items-center gap-3 p-3 rounded-xl border-2 border-foreground bg-card">
          <div className="flex items-center justify-between w-full">
            <span className="font-neo-display font-bold uppercase text-xs tracking-widest text-neo-pink">Wheel Rush</span>
            <span className="text-[10px] opacity-40 font-mono">MP</span>
          </div>
          <CircularTimer duration={props.totalTime} initialRemainingTime={props.remainingTime} isPlaying size={88} colorFamily="pink" />
        </div>
      ),
      secondary: (
        <div data-testid="wr-fog-meter" className="p-3 border-2 border-foreground rounded-xl bg-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-neo-display font-bold uppercase opacity-60 tracking-wide">Fog of War</span>
            <span className={cn(
              'text-xs tabular-nums font-bold',
              fogPct > 0 ? 'text-neo-pink' : 'opacity-30',
            )}>
              {fogPct > 0 ? `${Math.round(fogPct)}%` : '—'}
            </span>
          </div>
          <div className="h-2 bg-foreground/10 rounded-full overflow-hidden border border-foreground/10">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                fogPct > 0 ? 'bg-neo-pink' : 'bg-neo-lime/30',
              )}
              style={{ width: `${fogPct > 0 ? fogPct : 100}%` }}
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
