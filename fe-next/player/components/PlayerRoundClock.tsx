'use client';

import { memo } from 'react';
import { useStore } from 'zustand';
import { useTimerZeroWatchdog } from '@/hooks/useTimerZeroWatchdog';
import { useTimerStallWatchdog } from '@/hooks/useTimerStallWatchdog';
import { RoundClockDriver, type RoundClockHandle } from '../roundClock';

interface Props {
  clock: RoundClockHandle;
  isPaused: boolean;
  gameActive: boolean;
  /** The stall watchdog's own gate (a teacher pause is a frozen clock by design). */
  stallWatchActive: boolean;
  waitingForResults: boolean;
  onZero: () => void;
  onStall: (remainingTime: number | null) => void;
}

function ClockWatchdogs({ clock, gameActive, stallWatchActive, waitingForResults, onZero, onStall }: Omit<Props, 'isPaused'>) {
  const remainingTime = useStore(clock.store, (s) => s.remainingTime);
  useTimerZeroWatchdog({ remainingTime, gameActive, waitingForResults, onTrigger: onZero });
  useTimerStallWatchdog({ remainingTime, gameActive: stallWatchActive, waitingForResults, onStall: () => onStall(remainingTime) });
  return null;
}

/** The joiner's round clock: the ticking timer plus its watchdogs, all render-null leaves. */
function PlayerRoundClockImpl({ clock, isPaused, ...watch }: Props) {
  return (
    <>
      <RoundClockDriver ref={clock.driverRef} store={clock.store} initialTime={clock.initialTime} isPaused={isPaused} />
      <ClockWatchdogs clock={clock} {...watch} />
    </>
  );
}

export const PlayerRoundClock = memo(PlayerRoundClockImpl);
