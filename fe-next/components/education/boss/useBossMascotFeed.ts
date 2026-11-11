'use client';

import { useEffect, useRef } from 'react';
import { emitMascotEvent } from '@/lib/blast/mascotBus';
import type { ClassroomBossStatus } from '@/shared/types/classroomBoss';
import { bossImpactBus } from './fx/bossFxBus';
import type { BossCue } from './useBossCues';

const BONK = { kind: 'cascade-detected', chainDepth: 3 } as const;

/** Projector-only: the mascot reacts to the class's big boss moments, never to each of thirty students' hits. */
export function useBossMascotFeed(status: ClassroomBossStatus | null, cue: BossCue | null): void {
  const prevStatus = useRef(status);
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;
    if (prev === status || prev === null) return;
    if (status === 'defeated') emitMascotEvent({ kind: 'wave-clear' });
    else if (status === 'escaped') emitMascotEvent({ kind: 'wave-fail' });
  }, [status]);

  const cueId = cue && cue.kind !== 'attack' ? cue.id : null;
  useEffect(() => {
    if (cueId !== null) emitMascotEvent(BONK);
  }, [cueId]);

  useEffect(
    () =>
      bossImpactBus.on(({ crit }) => {
        if (crit) emitMascotEvent(BONK);
      }),
    [],
  );
}
