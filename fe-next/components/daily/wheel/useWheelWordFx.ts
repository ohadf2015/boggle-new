import { useCallback, useEffect, useRef, useState } from 'react';
import type { LetterCoverage } from '@/lib/wheelRush/letterCoverage';

export interface WheelWordFxEvent {
  id: number;
  kind: 'good' | 'bad';
  /** Wheel indices of the word, in the order they were spelled. */
  indices: number[];
  letters: string[];
  points: number;
  coverage: LetterCoverage;
}

export const FX_MS = { good: 1300, bad: 850 } as const;

/** The spelled word, held up the moment the finger lifts, before its verdict is in. */
export interface WheelReleaseEvent {
  id: number;
  indices: number[];
  letters: string[];
}

type FireInput = Omit<WheelWordFxEvent, 'id' | 'coverage'> & { coverage?: LetterCoverage };

/** The last word's reaction, kept apart from the built word so the wheel can clear at once. */
export function useWheelWordFx() {
  const [fx, setFx] = useState<WheelWordFxEvent | null>(null);
  const [release, setRelease] = useState<WheelReleaseEvent | null>(null);
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const fire = useCallback((input: FireInput) => {
    const id = ++seqRef.current;
    const coverage = input.kind === 'good' ? input.coverage ?? 'none' : 'none';
    setRelease(null);
    setFx({ ...input, id, coverage });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setFx((cur) => (cur?.id === id ? null : cur));
    }, FX_MS[input.kind]);
  }, []);

  const hold = useCallback((input: Omit<WheelReleaseEvent, 'id'>) => {
    setRelease({ ...input, id: ++seqRef.current });
  }, []);
  const drop = useCallback(() => setRelease(null), []);

  return { fx, fire, release, hold, drop };
}
