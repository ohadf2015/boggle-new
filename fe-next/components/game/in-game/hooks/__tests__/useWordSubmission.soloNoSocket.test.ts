/**
 * Quick Play runs the MULTIPLAYER board (InGameScreen) solo with `socket={null}`
 * — see components/quick-play/adapters/QuickClassicBoard.tsx. The local commit
 * (`onWordSubmit`, which IS the game engine in solo) sat AFTER an early
 * `if (!socket || !gameActive) return`, so in a solo round:
 *   - words under minWordLength still showed "too short" (local pre-check), but
 *   - every VALID word silently did nothing — no score, no found-word, no feedback.
 * That is the reported "wait for 3 letters and then no feedback at all".
 *
 * Written BEFORE implementation (RED phase).
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockValidateWordLocally, mockCouldBeOnBoard, mockHapticForWordScore, mockHapticError } = vi.hoisted(() => ({
  mockValidateWordLocally: vi.fn(),
  mockCouldBeOnBoard: vi.fn(),
  mockHapticForWordScore: vi.fn(),
  mockHapticError: vi.fn(),
}));
vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: (...args: any[]) => mockValidateWordLocally(...args),
  couldBeOnBoard: (...args: any[]) => mockCouldBeOnBoard(...args),
}));
vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: (...args: any[]) => mockHapticForWordScore(...args),
  hapticError: (...args: any[]) => mockHapticError(...args),
}));

import type { MutableRefObject } from 'react';
import { useWordSubmission } from '../useWordSubmission';

function buildOptions(overrides: Partial<Parameters<typeof useWordSubmission>[0]> = {}) {
  const comboLevelRef: MutableRefObject<number> = { current: 0 };
  return {
    isPlaying: true,
    gameActive: true,
    gameLanguage: 'en' as const,
    minWordLength: 3,
    normalizedFoundWords: [],
    letterGrid: [['T', 'E'], ['S', 'T']] as any,
    socket: null,
    clientAuthoritative: true,
    comboLevelRef,
    t: (k: string) => k,
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    announceWordResult: vi.fn(),
    onWordSubmit: vi.fn(),
    onResetCombo: vi.fn(),
    setCurrentFeedback: vi.fn(),
    setLastWordFoundTime: vi.fn(),
    ...overrides,
  };
}

describe('useWordSubmission — solo board (socket=null, Quick Play classic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateWordLocally.mockReturnValue({ isValid: true });
    mockCouldBeOnBoard.mockReturnValue(true);
  });

  it('commits a valid word locally even with no socket', () => {
    const options = buildOptions();
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST', { inputMethod: 'drag' });
    });

    expect(options.onWordSubmit).toHaveBeenCalledWith('TEST', { inputMethod: 'drag' });
  });

  it('does not throw trying to emit on a null socket', () => {
    const options = buildOptions();
    const { result } = renderHook(() => useWordSubmission(options));

    expect(() => {
      act(() => {
        result.current.handleGridWordSubmit('TEST');
      });
    }).not.toThrow();
  });

  it('still runs the local rejection path (short word gets feedback, no commit)', () => {
    mockValidateWordLocally.mockReturnValue({
      isValid: false,
      errorKey: 'playerView.wordTooShortMin',
      errorParams: { min: 3 },
    });
    const options = buildOptions();
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TE');
    });

    expect(options.setCurrentFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rejected', word: 'TE' })
    );
    expect(options.onWordSubmit).not.toHaveBeenCalled();
  });

  it('still gates on gameActive — a finished round commits nothing', () => {
    const options = buildOptions({ gameActive: false });
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST');
    });

    expect(options.onWordSubmit).not.toHaveBeenCalled();
  });

  it('multiplayer is unchanged: emits to the socket AND commits locally', () => {
    const socket = { emit: vi.fn() } as any;
    const options = buildOptions({ socket, clientAuthoritative: false });
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST');
    });

    expect(socket.emit).toHaveBeenCalledWith('submitWord', expect.objectContaining({ word: 'test' }));
    expect(options.onWordSubmit).toHaveBeenCalledWith('TEST', undefined);
  });

  // The MP views type socket as `Socket | null` too, so "no socket" alone cannot
  // mean "solo". During a reconnect gap the server never sees the word, so
  // committing it locally would show a score the server will not credit.
  it('a multiplayer reconnect gap (no socket, no client authority) commits nothing', () => {
    const options = buildOptions({ socket: null, clientAuthoritative: false });
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST');
    });

    expect(options.onWordSubmit).not.toHaveBeenCalled();
  });
});
