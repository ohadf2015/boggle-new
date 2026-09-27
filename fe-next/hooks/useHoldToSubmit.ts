import { useCallback, useRef, useState } from 'react';

/** Press-and-hold duration before a word auto-submits. */
export const HOLD_SUBMIT_MS = 800;
/** How long a completed/eager-add gesture suppresses the trailing onClick. */
const CLICK_SUPPRESS_WINDOW_MS = 150;

type BuiltLetter = { letter: string; wheelIndex: number };

export interface UseHoldToSubmitArgs {
  /** Word length at/above which the hold gesture becomes active (e.g. 3). */
  minLength: number;
  holdMs?: number;
  builtLettersRef: React.RefObject<BuiltLetter[]>;
  usedIndicesRef: React.RefObject<Set<number>>;
  draggingRef: React.RefObject<boolean>;
  gameOverRef: React.RefObject<boolean>;
  /** Appends a letter to the built word (must sync builtLettersRef). */
  addLetter: (letter: string, wheelIndex: number, el: HTMLButtonElement) => void;
  submit: () => void;
  haptic?: (pattern: number | number[]) => void;
}

export interface UseHoldToSubmitResult {
  /** wheelIndex currently showing the fill ring, or null. */
  holdingIndex: number | null;
  onLetterPointerDown: (letter: string, wheelIndex: number, el: HTMLButtonElement) => void;
  onLetterPointerEnd: () => void;
  /** Abort an in-flight hold (e.g. drag engaged) — keeps any eager-added letter. */
  cancelHold: () => void;
  /** True if a recent hold gesture should swallow the trailing onClick. */
  shouldSuppressClick: () => boolean;
  /** wheelIndex eager-added on the current pointerdown, or null. */
  getEagerAddedIndex: () => number | null;
}

/**
 * Press-and-hold a wheel letter to auto-submit once the word is already at
 * least `minLength` letters long. Unused held letters are eager-added on
 * pointerdown so the held letter is part of the submitted word; the trailing
 * onClick is suppressed so it isn't toggled back off.
 */
export function useHoldToSubmit({
  minLength,
  holdMs = HOLD_SUBMIT_MS,
  builtLettersRef,
  usedIndicesRef,
  draggingRef,
  gameOverRef,
  addLetter,
  submit,
  haptic,
}: UseHoldToSubmitArgs): UseHoldToSubmitResult {
  const [holdingIndex, setHoldingIndex] = useState<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when the gesture did something the trailing onClick must not undo
  // (eager-added a letter, or completed a hold-submit).
  const gestureConsumedRef = useRef(false);
  const eagerAddedIdxRef = useRef<number | null>(null);
  // Timestamp pattern (not boolean): self-clears if onClick never fires.
  const holdConsumedUntilRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const onLetterPointerDown = useCallback(
    (letter: string, wheelIndex: number, el: HTMLButtonElement) => {
      if (gameOverRef.current) return;
      if (draggingRef.current) return;
      // Ring only appears once the word is already submittable — i.e. the
      // letter being pressed is "above the minimum".
      if (builtLettersRef.current.length < minLength) return;

      const used = usedIndicesRef.current.has(wheelIndex);
      if (!used) {
        addLetter(letter, wheelIndex, el);
        gestureConsumedRef.current = true;
        eagerAddedIdxRef.current = wheelIndex;
      }

      setHoldingIndex(wheelIndex);
      clearTimer();
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        setHoldingIndex(null);
        gestureConsumedRef.current = true;
        haptic?.([20, 30, 40]);
        submit();
      }, holdMs);
    },
    [addLetter, builtLettersRef, clearTimer, draggingRef, gameOverRef, haptic, holdMs, minLength, submit, usedIndicesRef],
  );

  const onLetterPointerEnd = useCallback(() => {
    clearTimer();
    setHoldingIndex(null);
    if (gestureConsumedRef.current) {
      holdConsumedUntilRef.current = Date.now() + CLICK_SUPPRESS_WINDOW_MS;
      gestureConsumedRef.current = false;
    }
    eagerAddedIdxRef.current = null;
  }, [clearTimer]);

  const cancelHold = useCallback(() => {
    clearTimer();
    setHoldingIndex(null);
    // Drag engaged: the original button's onClick won't fire (pointer left it),
    // so it's safe to drop the suppression flag entirely.
    gestureConsumedRef.current = false;
    eagerAddedIdxRef.current = null;
  }, [clearTimer]);

  const shouldSuppressClick = useCallback(
    () => Date.now() < holdConsumedUntilRef.current,
    [],
  );

  const getEagerAddedIndex = useCallback(() => eagerAddedIdxRef.current, []);

  return {
    holdingIndex,
    onLetterPointerDown,
    onLetterPointerEnd,
    cancelHold,
    shouldSuppressClick,
    getEagerAddedIndex,
  };
}
