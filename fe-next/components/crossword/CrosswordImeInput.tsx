'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface CrosswordImeInputProps {
  onLetter: (letter: string) => void;
  /** Changes whenever the active cell/direction does, so focus returns here after a click. */
  focusKey: string;
  label: string;
  disabled?: boolean;
}

const isFinePointer = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;

/**
 * Visually hidden input that receives Japanese IME text (keydown only ever reports 'Process').
 * Committed kana are fed to the grid one character per cell; the value is cleared after each feed
 * so a browser that fires both compositionend and input can't enter the same text twice.
 */
export function CrosswordImeInput({ onLetter, focusKey, label, disabled }: CrosswordImeInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  const flush = useCallback(() => {
    const el = ref.current;
    if (!el || !el.value) return;
    const text = el.value;
    el.value = '';
    if (disabled) return;
    for (const ch of text) onLetter(ch);
  }, [onLetter, disabled]);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || !isFinePointer()) return;
    const active = document.activeElement;
    if (active && active !== el && active.matches('input, textarea, select, [contenteditable="true"]')) return;
    el.focus({ preventScroll: true });
  }, [focusKey, disabled]);

  return (
    <input
      ref={ref}
      data-crossword-ime=""
      aria-label={label}
      inputMode="none"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      className="fixed bottom-0 start-0 h-px w-px opacity-0 pointer-events-none"
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={() => { composing.current = false; flush(); }}
      onInput={() => { if (!composing.current) flush(); }}
    />
  );
}
