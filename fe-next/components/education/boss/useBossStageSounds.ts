'use client';

import { useEffect, useRef } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import type { BossCue } from './useBossCues';
import { bossImpactBus } from './fx/bossFxBus';

const HIT_SFX_GAP_MS = 220;

export function useBossStageSounds(view: ClassroomBossView | null, cue: BossCue | null): void {
  const { playBossEntranceSound, playBossHitSound, playBossPhaseChangeSound, playBossDefeatLegendarySound } = useSoundEffects();
  const status = view?.status;
  const lastHitSfx = useRef(0);

  useEffect(() => {
    if (status === 'intro') playBossEntranceSound();
    if (status === 'defeated') playBossDefeatLegendarySound();
  }, [status, playBossEntranceSound, playBossDefeatLegendarySound]);

  // The hit sound lands with the word on the boss, not when the server reports it.
  useEffect(() => bossImpactBus.on(() => {
    const now = Date.now();
    if (now - lastHitSfx.current < HIT_SFX_GAP_MS) return;
    lastHitSfx.current = now;
    playBossHitSound();
  }), [playBossHitSound]);

  useEffect(() => {
    if (cue?.kind === 'phase' || (cue?.kind === 'attack' && !cue.blocked)) playBossPhaseChangeSound();
  }, [cue, playBossPhaseChangeSound]);
}
