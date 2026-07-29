import { useCallback, useEffect, useRef, useState } from 'react';

export type ClockPhase = 'idle' | 'letterboxIn' | 'clip' | 'card' | 'fadeOut';

export type ClockState = {
  elapsed: number;
  rate: number;
  phase: ClockPhase;
  clipIndex: number;
};

export type ClockApi = {
  state: ClockState;
  start: () => void;
  stop: () => void;
  setRate: (r: number) => void;
  setPhase: (p: ClockPhase) => void;
  setClipIndex: (i: number) => void;
};

const INITIAL: ClockState = { elapsed: 0, rate: 1.0, phase: 'idle', clipIndex: 0 };

export function useHighlightClock(): ClockApi {
  const [state, setState] = useState<ClockState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const tickRef = useRef<(time: number) => void>(() => {});

  tickRef.current = (time: number) => {
    if (!runningRef.current) return;
    if (lastTimeRef.current == null) lastTimeRef.current = time;
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const next: ClockState = {
      ...stateRef.current,
      elapsed: stateRef.current.elapsed + delta * stateRef.current.rate,
    };
    setState(next);
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  };

  const start = useCallback(() => {
    runningRef.current = true;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const setRate = useCallback((r: number) => setState(s => ({ ...s, rate: r })), []);
  const setPhase = useCallback((p: ClockPhase) => setState(s => ({ ...s, phase: p })), []);
  const setClipIndex = useCallback((i: number) => setState(s => ({ ...s, clipIndex: i })), []);

  useEffect(() => () => stop(), [stop]);

  return { state, start, stop, setRate, setPhase, setClipIndex };
}
