'use client';

import { useEffect, useRef } from 'react';
import { GameMascotReactions } from '@/components/mascot/GameMascotReactions';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { feelCues, type FeelSnapshot } from '@/lib/wordTowerV2/towerFeel';
import type { RunState } from '@/lib/wordTowerV2/run';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { haptics } from '@/utils/haptics';

interface Props {
  run: RunState;
  risk: number;
  over: boolean;
  collapsed: boolean;
  lastWord: string;
  /** Results, the district or a wreck own the screen: the mascot steps out. */
  hidden: boolean;
}

/**
 * The mascot and the phone react to the run: a word landing, the floor goal,
 * a scary wobble, a collapse. Parked above the dock on the start side, away
 * from the crane, the tower's centre line and the ruler.
 */
export function TowerFeel({ run, risk, over, collapsed, lastWord, hidden }: Props) {
  const [reducedEffects] = useReducedEffects();
  const prev = useRef<FeelSnapshot | null>(null);

  useEffect(() => {
    const next: FeelSnapshot = { floors: run.floors, combo: run.combo, over, collapsed, risk };
    const cues = prev.current ? feelCues(prev.current, next, lastWord.length) : [];
    prev.current = next;
    for (const cue of cues) {
      if ('mascot' in cue) emitMascotEvent(cue.mascot);
      else if (!reducedEffects) void haptics.trigger(cue.haptic).catch(() => undefined);
    }
  }, [run.floors, run.combo, over, collapsed, risk, lastWord, reducedEffects]);

  if (hidden) return null;
  return (
    <div
      data-wt2-mascot
      className="pointer-events-none absolute start-[calc(var(--wt2-rail,0px)+0.5rem)] bottom-[calc(var(--wt2-dock,16rem)+0.5rem)] z-30 h-14 w-14 sm:h-20 sm:w-20 [&>div]:!start-0 [&>div]:!top-0 [&>div]:!end-auto"
    >
      <GameMascotReactions mode="word-tower" comboLevel={run.combo} />
    </div>
  );
}
