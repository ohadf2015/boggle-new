'use client';

import { useEffect } from 'react';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Number keys 1..count pick an answer, the way the cards' key hints promise. */
export function useAnswerKeys(count: number, enabled: boolean, onPick: (index: number) => void) {
  useEffect(() => {
    if (!enabled || count <= 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > count) return;
      e.preventDefault();
      onPick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, enabled, onPick]);
}
