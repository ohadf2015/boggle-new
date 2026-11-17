'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getKeyboardRows,
  appendLetter,
  backspace,
  localeNeedsIME,
  bridgeSlotCount,
} from '@/lib/connections/keyboard';
import { letterFromKeyEvent } from '@/lib/connections/physicalKeys';

/** Key ids the on-screen keyboard echoes besides letters. */
export const ENTER_KEY = 'Enter';
export const BACKSPACE_KEY = 'Backspace';
const PRESS_ECHO_MS = 140;

/** Callback ref: puts the caret in an IME guess field on desktop, never on touch (no surprise phone keyboard). */
export function focusOnFinePointer(el: HTMLInputElement | null) {
  if (el && window.matchMedia?.('(pointer: fine)').matches) el.focus({ preventScroll: true });
}
import { isTypingTarget } from '@/lib/dom/isTypingTarget';

interface BridgeTypingOptions {
  /** Current guess buffer (base letters). */
  input: string;
  /** The answer this stage is typing toward (bridge / meta answer). */
  answer: string;
  locale: string;
  /** Stage resolved / out of lives — typing off. */
  disabled: boolean;
  /** Stage status — 'wrong' triggers the auto-clear. */
  status: string;
  /** Re-triggers auto-clear on consecutive wrong guesses. */
  wrongAttempts: number;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

/**
 * Shared typing behavior for Word Bridge stages (PuzzleCard + pyramid
 * FinaleCard): slot-capped buffer, on-screen key handlers, physical-keyboard
 * support on desktop, and the wrong-guess auto-clear. The slot cap doubles as
 * a soft length clue — typing is bounded to the answer's letter count.
 */
export function useBridgeTyping({
  input,
  answer,
  locale,
  disabled,
  status,
  wrongAttempts,
  onInputChange,
  onSubmit,
}: BridgeTypingOptions) {
  const keyboardRows = getKeyboardRows(locale);
  const needsIME = localeNeedsIME(locale);
  const slotCap = bridgeSlotCount(answer);

  // Held ref keeps the window listener stable without re-subscribing per keystroke.
  const inputRef = useRef(input);
  inputRef.current = input;
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const pressTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  const handleLetter = (letter: string) => {
    const next = appendLetter(input, letter, slotCap);
    if (next !== input) onInputChange(next);
  };
  const handleBackspace = () => onInputChange(backspace(input));
  const handleClear = () => { if (input) onInputChange(''); };

  // Desktop typing: physical keys feed the same buffer as the on-screen keys.
  useEffect(() => {
    if (needsIME || disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Connections was the one game keyboard handler missed by the #840
      // sweep: no typing-target guard, so with a game mounted every keystroke
      // aimed at the feedback widget / chat / any input was eaten (and
      // Backspace hijacked). composedPath() pierces shadow roots — see
      // lib/dom/isTypingTarget.ts.
      if (isTypingTarget(e)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const echo = (id: string) => {
        setPressedKey(id);
        window.clearTimeout(pressTimer.current);
        pressTimer.current = window.setTimeout(() => setPressedKey(null), PRESS_ECHO_MS);
      };
      // Write the ref eagerly: a fast typist lands several keydowns before
      // React re-renders, and each must build on the previous one.
      const set = (next: string) => {
        inputRef.current = next;
        onInputChange(next);
      };
      if (e.key === 'Enter') {
        if (inputRef.current.trim().length > 0) {
          e.preventDefault();
          echo(ENTER_KEY);
          onSubmit();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        echo(BACKSPACE_KEY);
        set(backspace(inputRef.current));
        return;
      }
      const letter = letterFromKeyEvent(e.key, e.code, locale);
      if (!letter) return;
      e.preventDefault();
      echo(letter);
      const next = appendLetter(inputRef.current, letter, slotCap);
      if (next !== inputRef.current) set(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [needsIME, disabled, locale, slotCap, onInputChange, onSubmit]);

  // A wrong guess shakes, flashes red, then wipes itself — the player retypes
  // fresh instead of hand-deleting a dead guess.
  useEffect(() => {
    if (status !== 'wrong') return;
    const timer = window.setTimeout(() => onInputChange(''), 650);
    return () => window.clearTimeout(timer);
  }, [status, wrongAttempts, onInputChange]);

  return { keyboardRows, needsIME, slotCap, handleLetter, handleBackspace, handleClear, pressedKey };
}
