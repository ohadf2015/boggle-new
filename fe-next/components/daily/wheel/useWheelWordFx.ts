import { useCallback, useEffect, useRef, useState } from 'react';
import { praiseTier, type Praise } from '@/lib/wordWheel/discGeometry';
import type { LetterCoverage } from '@/lib/wheelRush/letterCoverage';

export interface FxRect { x: number; y: number; w: number; h: number }

export interface WheelWordFxEvent {
  id: number;
  kind: 'good' | 'bad';
  /** Wheel indices of the word, in the order they were spelled. */
  indices: number[];
  letters: string[];
  points: number;
  praise: Praise | null;
  /** Whole-wheel words get the coverage banner instead of a praise stamp. */
  coverage: LetterCoverage;
  /** Built-word tiles (relative to the game container) and the score they fly to. */
  launch: { from: FxRect[]; to: { x: number; y: number } } | null;
}

export const FX_MS = { good: 1300, bad: 850 } as const;

/** The spelled word, held up the moment the finger lifts, before its verdict is in. */
export interface WheelReleaseEvent {
  id: number;
  indices: number[];
  letters: string[];
}

type FireInput = Omit<WheelWordFxEvent, 'id' | 'praise' | 'coverage'> & { coverage?: LetterCoverage };

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
    const praise = input.kind === 'good' && coverage === 'none' ? praiseTier(input.letters.length) : null;
    setRelease(null);
    setFx({ ...input, id, praise, coverage });
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

/** Rects of `els` relative to `container`, for overlays that must start where the tiles are. */
export function rectsWithin(container: HTMLElement | null, els: Element[]): FxRect[] {
  if (!container) return [];
  const base = container.getBoundingClientRect();
  return els.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
  });
}

export function centreWithin(container: HTMLElement | null, el: Element | null): { x: number; y: number } | null {
  if (!container || !el) return null;
  const [r] = rectsWithin(container, [el]);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
