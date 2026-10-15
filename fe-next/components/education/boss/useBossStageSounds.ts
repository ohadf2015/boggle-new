'use client';

import { useEffect, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import type { BossCue } from './useBossCues';

const HIT_SFX_GAP_MS = 220;

export function useBossStageSounds(view: ClassroomBossView | null, cue: BossCue | null): void {
  const { playBossEntranceSound, playBossHitSound, playBossPhaseChangeSound, playBossDefeatLegendarySound } = useSoundEffects();
  const status = view?.status;
  const lastHit = view?.lastHits[0]?.id ?? 0;
  const prevHit = useRef(lastHit);
  const lastHitSfx = useRef(0);

  useEffect(() => {
    if (status === 'intro') playBossEntranceSound();
    if (status === 'defeated') playBossDefeatLegendarySound();
  }, [status, playBossEntranceSound, playBossDefeatLegendarySound]);

  useEffect(() => {
    const fresh = lastHit > prevHit.current;
    prevHit.current = lastHit;
    const now = Date.now();
    if (fresh && now - lastHitSfx.current > HIT_SFX_GAP_MS) {
      lastHitSfx.current = now;
      playBossHitSound();
    }
  }, [lastHit, playBossHitSound]);

  useEffect(() => {
    if (cue?.kind === 'phase' || (cue?.kind === 'attack' && !cue.blocked)) playBossPhaseChangeSound();
  }, [cue, playBossPhaseChangeSound]);
}
