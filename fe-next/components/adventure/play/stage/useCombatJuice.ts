'use client';

/**
 * Reads the hook's combat fx feed once per entry and turns it into juice:
 * sound cues, the stamped status banner, the enemy's hurt/attack frame, and
 * pulses (player hurt, phase change) the overlays key their animations on.
 */
import { useEffect, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { CombatFxEntry } from '../useAdventureRun';
import { fxSounds, statusFor, type StatusId } from './combatView';

export interface CombatJuice {
  status: { id: number; kind: StatusId } | null;
  /** Enemy frame override for a beat after a hit / attack. */
  flash: 'hurt' | 'attack' | null;
  /** Bumps when the player loses HP (vignette, heart shatter, shake). */
  hurtPulse: number;
  /** Bumps when the boss changes phase (flash + splash). */
  phasePulse: number;
}

type Sfx = Record<string, unknown>;

export function useCombatJuice(feed: readonly CombatFxEntry[]): CombatJuice {
  const sfx = useSoundEffects() as unknown as Sfx;
  const seen = useRef(0);
  const [juice, setJuice] = useState<CombatJuice>({ status: null, flash: null, hurtPulse: 0, phasePulse: 0 });

  useEffect(() => {
    const fresh = feed.filter((e) => e.id > seen.current);
    if (!fresh.length) {
      if (!feed.length) seen.current = 0;
      return;
    }
    seen.current = fresh[fresh.length - 1].id;
    const fx = fresh.flatMap((e) => e.fx);
    for (const name of fxSounds(fx)) {
      const play = sfx[name];
      if (typeof play === 'function') (play as () => void)();
    }
    const kind = statusFor(fx);
    const hurt = fx.some((f) => f === 'hit' || f === 'drain' || f === 'curse');
    const attack = fx.some((f) => f === 'hit' || f === 'drain' || f === 'freeze' || f === 'curse' || f === 'projectile' || f === 'shuffle');
    const struck = fx.includes('damage');
    setJuice((j) => ({
      status: kind ? { id: seen.current, kind } : j.status,
      flash: struck ? 'hurt' : attack ? 'attack' : j.flash,
      hurtPulse: hurt ? j.hurtPulse + 1 : j.hurtPulse,
      phasePulse: fx.includes('phase') ? j.phasePulse + 1 : j.phasePulse,
    }));
  }, [feed, sfx]);

  // Frames and banners are beats, not states.
  useEffect(() => {
    if (!juice.flash) return;
    const id = setTimeout(() => setJuice((j) => ({ ...j, flash: null })), juice.flash === 'hurt' ? 420 : 650);
    return () => clearTimeout(id);
  }, [juice.flash, juice.hurtPulse]);
  useEffect(() => {
    if (!juice.status) return;
    const id = setTimeout(() => setJuice((j) => ({ ...j, status: null })), 1300);
    return () => clearTimeout(id);
  }, [juice.status]);

  return juice;
}
