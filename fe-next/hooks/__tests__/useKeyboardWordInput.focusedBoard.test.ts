/**
 * The letter board has its own keyboard play when it has focus (useBoardKeyboard:
 * letters trace a path, Enter submits it — and it preventDefault()s each key it
 * handles). This window-level hook also typed and submitted, so with the board
 * focused every word went in twice: accepted, then "Already found" (seen live in
 * Quick Play classic on desktop, Nov 7 2026). A key the board already handled
 * belongs to the board.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useKeyboardWordInput } from '../useKeyboardWordInput';

const grid: any = [
  ['C', 'A', 'T'],
  ['S', 'E', 'A'],
  ['T', 'O', 'P'],
];

function press(key: string, handledByBoard = false) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  if (handledByBoard) e.preventDefault();
  window.dispatchEvent(e);
}

describe('useKeyboardWordInput with a focused board', () => {
  it('submits a typed word once when the board did not handle the keys', () => {
    const onWordSubmit = vi.fn();
    renderHook(() => useKeyboardWordInput({ grid, language: 'en', enabled: true, onWordSubmit, minWordLength: 3 }));
    act(() => {
      press('c');
      press('a');
      press('t');
    });
    act(() => press('Enter'));
    expect(onWordSubmit).toHaveBeenCalledTimes(1);
    expect(onWordSubmit).toHaveBeenCalledWith('CAT', { inputMethod: 'kb' });
  });

  it('leaves keys the board already handled to the board (no second submit)', () => {
    const onWordSubmit = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardWordInput({ grid, language: 'en', enabled: true, onWordSubmit, minWordLength: 3 })
    );
    act(() => {
      press('c', true);
      press('a', true);
      press('t', true);
    });
    expect(result.current.typedWord).toBe('');
    act(() => press('Enter', true));
    expect(onWordSubmit).not.toHaveBeenCalled();
  });
});
