'use client';

import { createContext, forwardRef, useContext, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { useGameTimer, type GameTimerReturn } from '@/hooks/useGameTimer';

/**
 * The round clock lives in a per-round store: only leaf timer components
 * subscribe, so a 1 Hz tick never re-renders the phase router or the in-game view.
 */
interface ClockState { remainingTime: number | null }
export type RoundClockStore = StoreApi<ClockState>;
type Controls = Pick<GameTimerReturn, 'pause' | 'resume' | 'togglePause' | 'reset' | 'setTime'>;

export const createRoundClockStore = (remainingTime: number | null = null): RoundClockStore =>
  createStore<ClockState>()(() => ({ remainingTime }));

const RoundClockContext = createContext<RoundClockStore>(createRoundClockStore());
export const RoundClockProvider = RoundClockContext.Provider;

export function useRoundRemainingTime(): number | null {
  return useStore(useContext(RoundClockContext), (s) => s.remainingTime);
}

/** Leaf subscriber: re-renders its children each tick, nothing above it. */
export function RoundClock({ children }: { children: (remainingTime: number | null) => ReactNode }) {
  return <>{children(useRoundRemainingTime())}</>;
}

export interface RoundClockHandle {
  store: RoundClockStore;
  initialTime: number;
  driverRef: RefObject<Controls | null>;
  /** Same contract as useGameTimer's return, minus the reactive value (read the store). */
  timer: GameTimerReturn;
}

export function useRoundClock(initialTime: number): RoundClockHandle {
  const [store] = useState(() => createRoundClockStore(initialTime));
  const driverRef = useRef<Controls | null>(null);
  const timer = useMemo<GameTimerReturn>(() => {
    const read = () => store.getState().remainingTime ?? 0;
    return {
      get remainingTime() { return read(); },
      remainingTimeRef: { get current() { return read(); } } as RefObject<number>,
      isRunning: false,
      pause: () => driverRef.current?.pause(),
      resume: () => driverRef.current?.resume(),
      togglePause: () => driverRef.current?.togglePause(),
      reset: () => driverRef.current?.reset(),
      setTime: (time: number) => driverRef.current?.setTime(time),
    };
  }, [store]);
  return useMemo(() => ({ store, initialTime, driverRef, timer }), [store, initialTime, timer]);
}

interface DriverProps { store: RoundClockStore; initialTime: number; isPaused: boolean }

/** Owns the ticking timer state and mirrors it into the round store. Renders nothing. */
export const RoundClockDriver = forwardRef<Controls, DriverProps>(function RoundClockDriver({ store, initialTime, isPaused }, ref) {
  const { remainingTime, pause, resume, togglePause, reset, setTime } = useGameTimer({ initialTime, isPaused, autoStart: false });
  useImperativeHandle(ref, () => ({ pause, resume, togglePause, reset, setTime }), [pause, resume, togglePause, reset, setTime]);
  useLayoutEffect(() => {
    store.setState({ remainingTime });
  }, [store, remainingTime]);
  return null;
});
