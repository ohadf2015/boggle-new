/**
 * TDD tests for comboType inclusion in submitWord socket emit.
 * Tests that useWordSubmission reads comboTypeRef.current when emitting submitWord.
 *
 * Written BEFORE implementation (RED phase).
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockValidateWordLocally, mockCouldBeOnBoard, mockHapticForWordScore, mockHapticError } = vi.hoisted(() => {
  const mockValidateWordLocally = vi.fn();
  const mockCouldBeOnBoard = vi.fn();
  const mockHapticForWordScore = vi.fn();
  const mockHapticError = vi.fn();
  return { mockValidateWordLocally, mockCouldBeOnBoard, mockHapticForWordScore, mockHapticError };
});
vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: (...args: any[]) => mockValidateWordLocally(...args),
  couldBeOnBoard: (...args: any[]) => mockCouldBeOnBoard(...args),
}));

vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: (...args: any[]) => mockHapticForWordScore(...args),
  hapticError: (...args: any[]) => mockHapticError(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { useRef, type MutableRefObject } from 'react';
import { useWordSubmission } from '../useWordSubmission';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    playWordAcceptedSound: vi.fn(),
    announceWordResult: vi.fn(),
    onWordSubmit: vi.fn(),
    onResetCombo: vi.fn(),
    setCurrentFeedback: vi.fn(),
    setLastWordFoundTime: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useWordSubmission — comboType in submitWord emit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
