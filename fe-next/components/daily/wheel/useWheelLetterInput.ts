import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { useHoldToSubmit } from '@/hooks/useHoldToSubmit';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import type { WordWheelEffect } from '../WordWheelEffectsCanvas';
import { haptic } from './useWheelFeedback';

interface BuiltLetter { letter: string; wheelIndex: number }

interface UseWheelLetterInputArgs {
  builtLetters: BuiltLetter[];
  setBuiltLetters: Dispatch<SetStateAction<BuiltLetter[]>>;
  gameOverRef: MutableRefObject<boolean>;
  handleSubmitRef: MutableRefObject<() => void>;
  lastSubmitWasDragRef: MutableRefObject<boolean>;
  gameContainerRef: RefObject<HTMLDivElement | null>;
  cancelIdleSubmit: () => void;
  onActivity: () => void;
  onEffect: (effect: WordWheelEffect) => void;
  playTileSelectSound: () => void;
  playButtonClickSound: () => void;
}

const DOUBLE_TAP_MS = 280;

/** Tap, double-tap, hold and drag spelling on the wheel, plus the builder edits. */
export function useWheelLetterInput({
  builtLetters, setBuiltLetters, gameOverRef, handleSubmitRef, lastSubmitWasDragRef, gameContainerRef,
  cancelIdleSubmit, onActivity, onEffect, playTileSelectSound, playButtonClickSound,
}: UseWheelLetterInputArgs) {
  // Read by the disc trail and useHoldToSubmit as well as the drag hook.
  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const [pendingLetter, setPendingLetter] = useState<string | null>(null);
  const lastTapRef = useRef<{ idx: number; time: number } | null>(null);
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  const usedIndices = useMemo(() => new Set(builtLetters.map(bl => bl.wheelIndex)), [builtLetters]);
  const builtLettersRef = useRef(builtLetters);
  const usedIndicesRef = useRef(usedIndices);
  useEffect(() => { builtLettersRef.current = builtLetters; }, [builtLetters]);
  useEffect(() => { usedIndicesRef.current = usedIndices; }, [usedIndices]);

  // Writes the ref in the same tick as the state so the drag-engage guard reads the new word.
  const addLetter = useCallback((letter: string, wheelIndex: number, el: HTMLButtonElement) => {
    builtLettersRef.current = [...builtLettersRef.current, { letter, wheelIndex }];
    setBuiltLetters(prev => [...prev, { letter, wheelIndex }]);
    playTileSelectSound();
    haptic(10);
    const rect = el.getBoundingClientRect();
    const containerRect = gameContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      onEffect({
        type: 'letterTap',
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    }
  }, [onEffect, playTileSelectSound, setBuiltLetters, gameContainerRef]);

  // Press-and-hold a letter once the word has 3+ letters to submit; the held letter is eager-added.
  const {
    holdingIndex: holdActiveIndex,
    onLetterPointerDown: holdPointerDown,
    onLetterPointerEnd: holdPointerEnd,
    cancelHold: holdCancel,
    shouldSuppressClick: holdSuppressClick,
    getEagerAddedIndex: holdGetEagerAdded,
  } = useHoldToSubmit({
    minLength: 3,
    builtLettersRef,
    usedIndicesRef,
    draggingRef,
    gameOverRef,
    addLetter,
    submit: () => handleSubmitRef.current(),
    haptic,
  });

  // Tap toggles a letter; a double-tap on a letter already in the word submits it.
  const handleLetterPress = useCallback((letter: string, wheelIndex: number, el: HTMLButtonElement) => {
    onActivityRef.current();
    if (holdSuppressClick()) return;
    if (gameOverRef.current) return;
    const now = Date.now();
    const last = lastTapRef.current;
    const isDoubleTap = last && last.idx === wheelIndex && now - last.time < DOUBLE_TAP_MS;
    const existingIdx = builtLettersRef.current.findIndex(bl => bl.wheelIndex === wheelIndex);

    if (isDoubleTap && existingIdx !== -1) {
      lastTapRef.current = null;
      handleSubmitRef.current();
      return;
    }
    if (existingIdx !== -1) {
      setBuiltLetters(prev => prev.filter((_, i) => i !== existingIdx));
      builtLettersRef.current = builtLettersRef.current.filter((_, i) => i !== existingIdx);
      playButtonClickSound();
      haptic(8);
      lastTapRef.current = { idx: wheelIndex, time: now };
      return;
    }
    addLetter(letter, wheelIndex, el);
    lastTapRef.current = { idx: wheelIndex, time: now };
  }, [addLetter, holdSuppressClick, playButtonClickSound, setBuiltLetters, gameOverRef, handleSubmitRef]);

  // Drag engages only on reaching a different letter, so single taps keep their native click.
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    isIndexUsed: (i) => usedIndicesRef.current.has(i),
    addLetter: (i, letter, el) => handleLetterPress(letter, i, el),
    getBuiltLength: () => builtLettersRef.current.length,
    submit: () => handleSubmitRef.current(),
    onEngage: (startIdx) => {
      const eagerIdx = holdGetEagerAdded();
      holdCancel();
      return eagerIdx !== startIdx;
    },
    onBeforeDragSubmit: () => { lastSubmitWasDragRef.current = true; },
    cancelPendingSubmit: cancelIdleSubmit,
  });

  const handleRemoveLetter = useCallback((index: number) => {
    builtLettersRef.current = builtLettersRef.current.filter((_, i) => i !== index);
    setBuiltLetters(prev => prev.filter((_, i) => i !== index));
    playButtonClickSound();
  }, [playButtonClickSound, setBuiltLetters]);

  const handleClear = useCallback(() => {
    builtLettersRef.current = [];
    setBuiltLetters([]);
    playButtonClickSound();
  }, [playButtonClickSound, setBuiltLetters]);

  const handleBackspace = useCallback(() => {
    builtLettersRef.current = builtLettersRef.current.slice(0, -1);
    setBuiltLetters(prev => prev.slice(0, -1));
    playButtonClickSound();
  }, [playButtonClickSound, setBuiltLetters]);

  return {
    builtLettersRef, usedIndices, draggingRef, pointerPosRef, pendingLetter, setPendingLetter,
    holdActiveIndex, holdPointerDown, holdPointerEnd,
    handleLetterPress, handlePointerDown, handlePointerMove, handlePointerUp,
    handleRemoveLetter, handleClear, handleBackspace,
  };
}
