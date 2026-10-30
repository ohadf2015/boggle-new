import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordWheelSubmit } from '../useWordWheelSubmit';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A', outerLetters: ['C', 'T', 'R', 'S', 'E', 'N'], allLetters: ['A', 'C', 'T', 'R', 'S', 'E', 'N'],
  puzzleDate: '2026-11-05', language: 'en', puzzleNumber: 1,
};
const spell = (w: string) => w.split('').map((letter, i) => ({ letter, wheelIndex: i }));

function setup(verdict: boolean | null, { drag = false, found = [] as string[] } = {}) {
  const accept = vi.fn();
  const reject = vi.fn();
  const built = { current: spell('CAT') };
  const { result } = renderHook(() => useWordWheelSubmit({
    puzzle, t: (k) => k, builtLettersRef: built, setBuiltLetters: vi.fn(),
    wordsFoundRef: { current: found }, gameOverRef: { current: false }, lastSubmitWasDragRef: { current: drag },
    onValidateWord: async () => verdict, onQuickVerdict: () => null, accept, reject,
  }));
  return { result, accept, reject };
}

describe('useWordWheelSubmit verdicts', () => {
  it('an unknown verdict never credits and says it could not check', async () => {
    const { result, accept, reject } = setup(null);
    await act(async () => { result.current.handleSubmit(); });
    expect(accept).not.toHaveBeenCalled();
    expect(reject).toHaveBeenCalledWith('wordWheel.cantCheck', 'keep', expect.any(Array), 'unknown');
  });

  it('an unknown verdict on a swipe also never credits', async () => {
    const { result, accept, reject } = setup(null, { drag: true });
    await act(async () => { result.current.handleSubmit(); });
    expect(accept).not.toHaveBeenCalled();
    expect(reject.mock.calls[0][3]).toBe('unknown');
  });

  it('a false verdict is "not a word"', async () => {
    const { result, reject } = setup(false);
    await act(async () => { result.current.handleSubmit(); });
    expect(reject.mock.calls[0][0]).toBe('wordWheel.notInDictionary');
    expect(reject.mock.calls[0][3]).toBe('invalid');
  });

  it('an already-found word is its own kind', async () => {
    const { result, reject } = setup(true, { found: ['CAT'] });
    await act(async () => { result.current.handleSubmit(); });
    expect(reject.mock.calls[0][3]).toBe('found');
  });
});
