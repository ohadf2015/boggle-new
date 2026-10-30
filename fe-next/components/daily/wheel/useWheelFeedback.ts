import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { LetterClear, RejectKind } from '../useWordWheelSubmit';
import type { useWheelWordFx } from './useWheelWordFx';

// Score, list and cleared trail paint first; particles, audio and haptics follow the frame.
export const afterPaint = (fn: () => void) => {
  if (typeof requestAnimationFrame === 'undefined') return fn();
  requestAnimationFrame(() => setTimeout(fn, 0));
};

export const haptic = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
};

type Channel = 'toast' | 'shake' | 'autoReset' | 'pulse' | 'score' | 'found' | 'combo' | 'celebration';

/** One live timer per channel: a newer toast replaces the older timer instead of cutting itself short. */
export function useChannelTimers() {
  const timers = useRef(new Map<Channel, ReturnType<typeof setTimeout>>());
  const clear = useCallback((channel: Channel) => {
    const id = timers.current.get(channel);
    if (id) clearTimeout(id);
    timers.current.delete(channel);
  }, []);
  const set = useCallback((channel: Channel, fn: () => void, ms: number) => {
    clear(channel);
    timers.current.set(channel, setTimeout(() => { timers.current.delete(channel); fn(); }, ms));
  }, [clear]);
  const has = useCallback((channel: Channel) => timers.current.has(channel), []);
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  return useMemo(() => ({ set, clear, has }), [set, clear, has]);
}

export type FeedbackType = 'success' | 'error' | 'warn';
interface BuiltLetter { letter: string; wheelIndex: number }

interface UseWheelFeedbackArgs {
  builtLettersRef: MutableRefObject<BuiltLetter[]>;
  setBuiltLetters: (letters: BuiltLetter[]) => void;
  fireFx: ReturnType<typeof useWheelWordFx>['fire'];
  cancelIdleSubmit: () => void;
  timers: ReturnType<typeof useChannelTimers>;
}

const TOAST_MS = 1500;

export function useWheelFeedback({ builtLettersRef, setBuiltLetters, fireFx, cancelIdleSubmit, timers }: UseWheelFeedbackArgs) {
  const [feedback, setFeedback] = useState<{ message: string; type: FeedbackType } | null>(null);
  const [shake, setShake] = useState(false);
  const [pulse, setPulse] = useState<{ word: string; id: number } | null>(null);
  const pulseIdRef = useRef(0);

  const showSuccess = useCallback((message: string) => {
    setFeedback({ message, type: 'success' });
    timers.set('toast', () => setFeedback(null), TOAST_MS);
  }, [timers]);

  const showRejection = useCallback((message: string, kind: RejectKind, clear: LetterClear, spelled?: BuiltLetter[]) => {
    const letters = spelled ?? builtLettersRef.current;
    setFeedback({ message, type: kind === 'unknown' ? 'warn' : 'error' });
    timers.set('toast', () => setFeedback(null), TOAST_MS);
    cancelIdleSubmit();

    if (kind === 'found') {
      setPulse({ word: letters.map(bl => bl.letter).join('').toUpperCase(), id: ++pulseIdRef.current });
      timers.set('pulse', () => setPulse(null), 900);
      haptic(15);
    } else if (kind !== 'unknown') {
      if (letters.length > 0) {
        fireFx({ kind: 'bad', indices: letters.map(bl => bl.wheelIndex), letters: letters.map(bl => bl.letter), points: 0 });
      }
      setShake(true);
      haptic([30, 50, 30]);
      timers.set('shake', () => setShake(false), 400);
    }

    // Drag submits clear at once so the next stroke is free; taps wait so the player can read why.
    if (clear === 'now') {
      timers.clear('autoReset');
      builtLettersRef.current = [];
      setBuiltLetters([]);
    } else if (clear === 'later') {
      timers.set('autoReset', () => {
        builtLettersRef.current = [];
        setBuiltLetters([]);
      }, TOAST_MS);
    }
  }, [builtLettersRef, setBuiltLetters, fireFx, cancelIdleSubmit, timers]);

  return { feedback, shake, pulse, showSuccess, showRejection };
}
