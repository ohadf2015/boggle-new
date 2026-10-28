'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { useSoundEffects } from '@/contexts/SoundEffectsContext';

type PlaySound = ReturnType<typeof useSoundEffects>['playSound'];

/** One-time cheer the moment today's goal is reached (not for a goal already hit on open). */
export function useDailyGoalToast(daily: boolean, targetM: number, targetHit: boolean, playSound: PlaySound) {
  const goalSeen = useRef<boolean | null>(null);
  const [goalToast, setGoalToast] = useState(false);
  useEffect(() => {
    if (!daily || targetM === 0) return;
    if (goalSeen.current === null) {
      goalSeen.current = targetHit;
      return;
    }
    if (targetHit && !goalSeen.current) {
      goalSeen.current = true;
      playSound('questComplete');
      setGoalToast(true);
    }
    return undefined;
  }, [daily, targetM, targetHit, playSound]);
  // Left alone it must not sit over the crane forever.
  useEffect(() => {
    if (!goalToast) return undefined;
    const id = window.setTimeout(() => setGoalToast(false), 8000);
    return () => window.clearTimeout(id);
  }, [goalToast]);
  const dismissGoalToast = useCallback(() => setGoalToast(false), []);
  return { goalToast, dismissGoalToast };
}

/**
 * Tenants: the run owns the total; the HUD counts up as each one actually
 * arrives on screen, capped by the run so it can never run ahead of it.
 */
export function useTenantArrivals(runTenants: number, playSound: PlaySound) {
  const [arrived, setArrived] = useState(0);
  const arrivedRef = useRef(0);
  useEffect(() => {
    if (runTenants === 0) {
      arrivedRef.current = 0;
      setArrived(0);
    }
  }, [runTenants]);
  const onTenantArrive = useCallback(() => {
    arrivedRef.current += 1;
    setArrived(arrivedRef.current);
    playSound('coinCollect', { volume: 0.3, rate: 1 + (arrivedRef.current % 6) * 0.08 });
  }, [playSound]);
  return { tenantsShown: Math.min(arrived, runTenants), onTenantArrive };
}
