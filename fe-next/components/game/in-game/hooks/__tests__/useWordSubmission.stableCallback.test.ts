/**
 * Perf regression test: `handleGridWordSubmit` must keep a stable identity
 * across `normalizedFoundWords`-only changes.
 *
 * In MP classic the parent re-renders the in-game tree on every word event
 * (player or opponent). Before this guard, the `useCallback` deps array
 * included `normalizedFoundWords`, so the callback identity flipped on every
 * word found → broke `<GridComponent>`'s memo via the `onWordSubmit` prop →
 * forced all 16 `<GridCell>` memos to re-check equality on every accept.
 * That cascade is what users perceived as "slowness when finding words" in
 * multiplayer classic mode after the earlier drag-storm fixes landed.
 *
 * This test pins the contract: bumping `normalizedFoundWords` (and only that)
 * must NOT change the returned `handleGridWordSubmit` reference, AND the
 * duplicate check must still reflect the latest list via the internal Set ref.
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockValidateWordLocally, mockCouldBeOnBoard, mockNormalizeWord } = vi.hoisted(() => {
  const mockValidateWordLocally = vi.fn();
  const mockCouldBeOnBoard = vi.fn();
  const mockNormalizeWord = vi.fn((w: string) => w.toLowerCase());
  return { mockValidateWordLocally, mockCouldBeOnBoard, mockNormalizeWord };
});

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: (...args: any[]) => mockValidateWordLocally(...args),
  couldBeOnBoard: (...args: any[]) => mockCouldBeOnBoard(...args),
  normalizeWord: (...args: any[]) => mockNormalizeWord(...args),
}));

vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: vi.fn(),
  hapticError: vi.fn(),
}));

import type { MutableRefObject } from 'react';
import { useWordSubmission } from '../useWordSubmission';

function buildOptions(overrides: Partial<Parameters<typeof useWordSubmission>[0]> = {}) {
  const mockSocket = { emit: vi.fn() } as any;
  const comboLevelRef: MutableRefObject<number> = { current: 0 };

  return {
    isPlaying: true,
    gameActive: true,
    gameLanguage: 'en' as const,
    minWordLength: 2,
    normalizedFoundWords: [],
    letterGrid: [['T', 'E'], ['S', 'T']] as any,
    socket: mockSocket,
    comboLevelRef,
    t: (k: string) => k,
    playWordRejectedSound: vi.fn(),
    announceWordResult: vi.fn(),
    onWordSubmit: vi.fn(),
    onResetCombo: vi.fn(),
    setCurrentFeedback: vi.fn(),
    setLastWordFoundTime: vi.fn(),
    ...overrides,
  };
}

describe('useWordSubmission — handleGridWordSubmit identity stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateWordLocally.mockReturnValue({ isValid: true });
    mockCouldBeOnBoard.mockReturnValue(true);
    mockNormalizeWord.mockImplementation((w: string) => w.toLowerCase());
  });

  it('keeps handleGridWordSubmit identity stable when only normalizedFoundWords changes', () => {
    const opts = buildOptions();
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useWordSubmission>[0]) => useWordSubmission(p),
      { initialProps: opts },
    );

    const firstCallback = result.current.handleGridWordSubmit;

    // Simulate a word being added — same shape as PlayerView's mappedFoundWords
    // useMemo producing a new array per word event.
    rerender({ ...opts, normalizedFoundWords: [{ word: 'cat', isValid: true } as any] });
    const afterOneWord = result.current.handleGridWordSubmit;

    rerender({ ...opts, normalizedFoundWords: [
      { word: 'cat', isValid: true } as any,
      { word: 'dog', isValid: true } as any,
    ] });
    const afterTwoWords = result.current.handleGridWordSubmit;

    expect(afterOneWord).toBe(firstCallback);
    expect(afterTwoWords).toBe(firstCallback);
  });

  it('still rejects duplicates against the latest foundWords (Set ref stays fresh)', () => {
    const opts = buildOptions();
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useWordSubmission>[0]) => useWordSubmission(p),
      { initialProps: opts },
    );

    // Push a found word into the hook — Set ref should update via the effect.
    rerender({ ...opts, normalizedFoundWords: [{ word: 'cat', isValid: true } as any] });

    act(() => {
      result.current.handleGridWordSubmit('CAT');
    });

    // The Set the hook passes to validateWordLocally must contain 'cat'.
    const lastCall = mockValidateWordLocally.mock.calls[mockValidateWordLocally.mock.calls.length - 1];
    const passedFourth = lastCall[3];
    expect(passedFourth instanceof Set).toBe(true);
    expect((passedFourth as Set<string>).has('cat')).toBe(true);
  });

  it('rebuilds the Set when gameLanguage changes (covers language-switch on reconnect)', () => {
    const opts = buildOptions({
      normalizedFoundWords: [{ word: 'casa', isValid: true } as any],
    });
    const { result, rerender } = renderHook(
      (p: Parameters<typeof useWordSubmission>[0]) => useWordSubmission(p),
      { initialProps: opts },
    );

    // Initial language = en
    act(() => {
      result.current.handleGridWordSubmit('CASA');
    });
    const enSet = mockValidateWordLocally.mock.calls.at(-1)?.[3] as Set<string>;
    expect(enSet.has('casa')).toBe(true);

    // Mock normalize that tags the language so we can verify rebuild
    mockNormalizeWord.mockImplementation((w: string, lang: string) => `${lang}:${w.toLowerCase()}`);

    rerender({ ...opts, gameLanguage: 'es' as const });

    act(() => {
      result.current.handleGridWordSubmit('CASA');
    });
    const esSet = mockValidateWordLocally.mock.calls.at(-1)?.[3] as Set<string>;
    expect(esSet.has('es:casa')).toBe(true);
  });
});
