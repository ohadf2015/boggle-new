// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const noteTypedSubmit = vi.fn();
vi.mock('@/lib/input/typedWordHint', () => ({ noteTypedSubmit: () => noteTypedSubmit() }));

import { useKeyboardWordInput } from '../useKeyboardWordInput';
import { useWordWheelKeyboard } from '../useWordWheelKeyboard';

const GRID = [['C', 'A', 'T'], ['S', 'E', 'A'], ['T', 'O', 'P']] as never;
const key = (k: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const press = (k: string) => act(() => { key(k); });

describe('typed submits feed the desktop "just type" hint', () => {
  beforeEach(() => noteTypedSubmit.mockClear());

  it('a grid word typed and sent with Enter is noted as typed', () => {
    const onWordSubmit = vi.fn();
    renderHook(() => useKeyboardWordInput({
      grid: GRID, language: 'en', enabled: true, onWordSubmit, minWordLength: 3,
    }));
    act(() => {
      key('c');
      key('a');
      key('t');
    });
    press('Enter');
    expect(onWordSubmit).toHaveBeenCalledWith('CAT', { inputMethod: 'kb' });
    expect(noteTypedSubmit).toHaveBeenCalledTimes(1);
  });

  it('Enter on the word wheel is noted as typed', () => {
    const handleSubmit = vi.fn();
    renderHook(() => useWordWheelKeyboard({
      centerLetter: 'A', outerLetters: ['C', 'T'], usedIndices: new Set(), handleSubmit, handleClear: vi.fn(),
      setBuiltLetters: vi.fn(), gameOver: false, playTileSelectSound: vi.fn(), playButtonClickSound: vi.fn(),
    }));
    press('Enter');
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(noteTypedSubmit).toHaveBeenCalledTimes(1);
  });
});
