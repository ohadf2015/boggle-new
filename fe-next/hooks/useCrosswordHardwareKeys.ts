'use client';

import { useEffect } from 'react';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';
import type { UseCrosswordGame } from '@/hooks/useCrosswordGame';

type KeyActions = Pick<UseCrosswordGame, 'backspace' | 'moveInSlot' | 'moveVertical' | 'inputLetter' | 'toggleDir' | 'nextSlot'>;

/** The hidden ja IME input owns committed text; the grid still takes its navigation keys. */
function isImeTarget(e: KeyboardEvent): boolean {
  return (e.target as HTMLElement | null)?.dataset?.crosswordIme !== undefined;
}

/** Physical keyboard → crossword engine (letters, arrows mirrored for RTL, Tab/Space). */
export function useCrosswordHardwareKeys(actions: KeyActions, rtl: boolean, enabled = true): void {
  const { backspace, moveInSlot, moveVertical, inputLetter, toggleDir, nextSlot } = actions;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.isComposing || e.keyCode === 229) return;
      const ime = isImeTarget(e);
      if (!ime && isTypingTarget(e)) return;
      const key = e.key;
      if (key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        moveInSlot(rtl ? -1 : 1);
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        moveInSlot(rtl ? 1 : -1);
      } else if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        moveVertical(key === 'ArrowDown' ? 1 : -1);
      } else if (key === ' ' || key === 'Tab') {
        e.preventDefault();
        if (key === 'Tab') nextSlot(e.shiftKey ? -1 : 1);
        else toggleDir();
      } else if (!ime && key.length === 1 && /\p{L}/u.test(key)) {
        inputLetter(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backspace, moveInSlot, moveVertical, inputLetter, toggleDir, nextSlot, rtl, enabled]);
}
