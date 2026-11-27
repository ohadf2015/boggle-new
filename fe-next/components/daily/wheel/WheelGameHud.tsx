'use client';

import { useSyncExternalStore } from 'react';
import { GameHud } from '@/components/game/hud/GameHud';
import type { WheelClock } from './useWheelTimer';

/** The shared game HUD driven by the wheel's deadline clock (only this row re-renders per second). */
export default function WheelGameHud({ clock, duration, score, onExit }: { clock: WheelClock; duration: number; score: number; onExit?: () => void }) {
  const left = useSyncExternalStore(clock.subscribe, clock.timeLeft, clock.timeLeft);
  return <GameHud onExit={onExit} remaining={left} total={duration} score={score} />;
}
