import { create } from 'zustand';

export type FlameTier = 0 | 1 | 2 | 3;

export function flameTier(streak: number): FlameTier {
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  if (streak >= 1) return 1;
  return 0;
}

interface EconomyStreakState {
  streak: number;
  multiplier: number;
  live: boolean;
  hudFlames: number;
}

/** The economy dock owns the only economy hook; the HUD flame reads its streak from here. */
export const useEconomyStreakStore = create<EconomyStreakState>(() => ({ streak: 0, multiplier: 1, live: false, hudFlames: 0 }));

export function publishEconomyStreak(snapshot: { streak: number; multiplier: number } | null): void {
  useEconomyStreakStore.setState(
    snapshot ? { streak: snapshot.streak, multiplier: snapshot.multiplier, live: true } : { streak: 0, multiplier: 1, live: false },
  );
}

export function claimHudFlame(): () => void {
  useEconomyStreakStore.setState((s) => ({ hudFlames: s.hudFlames + 1 }));
  return () => useEconomyStreakStore.setState((s) => ({ hudFlames: Math.max(0, s.hudFlames - 1) }));
}
