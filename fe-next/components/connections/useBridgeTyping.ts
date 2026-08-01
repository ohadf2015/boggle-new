'use client';

import { useEffect, useRef } from 'react';
import {
  getKeyboardRows,
  appendLetter,
  backspace,
  localeNeedsIME,
  bridgeSlotCount,
  normalizeTypedChar,
} from '@/lib/connections/keyboard';

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

  const handleLetter = (letter: string) => {
    const next = appendLetter(input, letter, slotCap);
    if (next !== input) onInputChange(next);
  };
  const handleBackspace = () => onInputChange(backspace(input));

  // Desktop typing: physical keys feed the same buffer as the on-screen keys.
  useEffect(() => {
    if (needsIME || disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        if (inputRef.current.trim().length > 0) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        onInputChange(backspace(inputRef.current));
        return;
      }
      const letter = normalizeTypedChar(e.key, locale);
      if (!letter) return;
      const next = appendLetter(inputRef.current, letter, slotCap);
      if (next !== inputRef.current) onInputChange(next);
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

  return { keyboardRows, needsIME, slotCap, handleLetter, handleBackspace };
}
