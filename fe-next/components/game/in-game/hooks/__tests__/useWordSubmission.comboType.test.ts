/**
 * TDD tests for comboType inclusion in submitWord socket emit.
 * Tests that useWordSubmission reads comboTypeRef.current when emitting submitWord.
 *
 * Written BEFORE implementation (RED phase).
 */
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockValidateWordLocally = jest.fn();
const mockCouldBeOnBoard = jest.fn();
const mockHapticForWordScore = jest.fn();
const mockHapticError = jest.fn();

jest.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: (...args: any[]) => mockValidateWordLocally(...args),
  couldBeOnBoard: (...args: any[]) => mockCouldBeOnBoard(...args),
}));

jest.mock('@/utils/haptics', () => ({
  hapticForWordScore: (...args: any[]) => mockHapticForWordScore(...args),
  hapticError: (...args: any[]) => mockHapticError(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { useRef } from 'react';
import { useWordSubmission } from '../useWordSubmission';
import type { MutableRefObject } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOptions(overrides: Partial<Parameters<typeof useWordSubmission>[0]> = {}) {
  const mockSocket = { emit: jest.fn() } as any;
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
    playWordAcceptedSound: jest.fn(),
    announceWordResult: jest.fn(),
    onWordSubmit: jest.fn(),
    onResetCombo: jest.fn(),
    setCurrentFeedback: jest.fn(),
    setLastWordFoundTime: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWordSubmission — comboType in submitWord emit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: word is valid and on board
    mockValidateWordLocally.mockReturnValue({ isValid: true });
    mockCouldBeOnBoard.mockReturnValue(true);
  });

  it('emits submitWord with comboType from comboTypeRef when ref has a value', () => {
    const comboTypeRef: MutableRefObject<string | null> = { current: 'bomb_lightning' };
    const options = buildOptions({ comboTypeRef });
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST');
    });

    expect(options.socket.emit).toHaveBeenCalledWith('submitWord', expect.objectContaining({
      comboType: 'bomb_lightning',
    }));
  });

  it('emits submitWord with comboType: null when comboTypeRef.current is null', () => {
    const comboTypeRef: MutableRefObject<string | null> = { current: null };
    const options = buildOptions({ comboTypeRef });
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST');
    });

    expect(options.socket.emit).toHaveBeenCalledWith('submitWord', expect.objectContaining({
      comboType: null,
    }));
  });

  it('emits submitWord with comboType: null when comboTypeRef is not provided (backward compat)', () => {
    const options = buildOptions();
    // comboTypeRef not included — backward compat
    const { result } = renderHook(() => useWordSubmission(options));

    act(() => {
      result.current.handleGridWordSubmit('TEST');
    });

    expect(options.socket.emit).toHaveBeenCalledWith('submitWord', expect.objectContaining({
      comboType: null,
    }));
  });
});
