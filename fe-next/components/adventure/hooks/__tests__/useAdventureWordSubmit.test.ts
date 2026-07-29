/**
 * useAdventureWordSubmit Tests
 *
 * Tests for the word submission callback hook that handles
 * validation, scoring, boss damage, achievements, and feedback.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdventureWordSubmit } from '../useAdventureWordSubmit';

describe('useAdventureWordSubmit', () => {
  const mockValidateWord = vi.fn();
  const mockSubmitWordWithPath = vi.fn();
  const mockClearSelection = vi.fn();
  const mockClearCurrentHint = vi.fn();
  const mockRecordActivity = vi.fn();
  const mockResetOnGameAction = vi.fn();
  const mockCheckBossWord = vi.fn();
  const mockDealBossDamage = vi.fn();
  const mockTriggerBossTaunt = vi.fn();
  const mockHandleEarnAchievement = vi.fn();
  const mockRecordAIWord = vi.fn();
  const mockHandleAITransition = vi.fn();
  const mockAddScorePopup = vi.fn();
  const mockGetScoreMultiplier = vi.fn().mockReturnValue(1);
  const mockT = vi.fn().mockImplementation((key: string) => key);

  // Generate a 5x5 tile grid with proper row/col
  const mockTiles = Array.from({ length: 25 }, (_, i) => ({
    id: `tile-${i}`,
    letter: String.fromCharCode(65 + (i % 26)),
    row: Math.floor(i / 5),
    col: i % 5,
    isCleared: false,
    isFrozen: false,
  }));

  const defaultProps = {
    isPlaying: true,
    isPaused: false,
    isValidating: false,
    isCascading: false,
    currentWord: '',
    selectedIndices: [] as number[],
    tiles: mockTiles as any,
    gridSize: 5,
    minWordLength: 3,
    validateWord: mockValidateWord,
    submitWordWithPath: mockSubmitWordWithPath,
    clearSelection: mockClearSelection,
    clearCurrentHint: mockClearCurrentHint,
    recordActivity: mockRecordActivity,
    resetOnGameAction: mockResetOnGameAction,
    comboCount: 0,
    wordsFound: [] as string[],
    isBossActive: false,
    bossConfig: null as any,
    checkBossWord: mockCheckBossWord,
    dealBossDamage: mockDealBossDamage,
    triggerBossTaunt: mockTriggerBossTaunt,
    handleEarnAchievement: mockHandleEarnAchievement,
    recordAIWord: mockRecordAIWord,
    handleAITransition: mockHandleAITransition,
    addScorePopup: mockAddScorePopup,
    getScoreMultiplier: mockGetScoreMultiplier,
    upgradeBonuses: { scoreBonus: 1, timeBonus: 1, xpBonus: 1 },
    skillEffects: {
      bossDamageMultiplier: 1,
      comboMultiplierBonus: 0,
      getLongWordDamageMultiplier: vi.fn().mockReturnValue(1),
    },
    t: mockT,
    getPopupStartPosition: vi.fn().mockReturnValue({ x: 100, y: 100 }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return handleWordSubmit callback and feedback state', () => {
    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));
    expect(result.current.handleWordSubmit).toBeInstanceOf(Function);
    expect(result.current.validationFeedback).toEqual({
      error: null,
      wasSubmitted: false,
      isValid: false,
    });
    expect(result.current.wordFeedback).toBeNull();
    expect(result.current.lastAccepted).toBeNull();
  });

  it('should not submit when not playing', async () => {
    const { result } = renderHook(() =>
      useAdventureWordSubmit({ ...defaultProps, isPlaying: false })
    );

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(mockValidateWord).not.toHaveBeenCalled();
  });

  it('should not submit when paused', async () => {
    const { result } = renderHook(() =>
      useAdventureWordSubmit({ ...defaultProps, isPaused: true })
    );

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(mockValidateWord).not.toHaveBeenCalled();
  });

  it('should not submit word shorter than minWordLength', async () => {
    const { result } = renderHook(() =>
      useAdventureWordSubmit({ ...defaultProps, minWordLength: 3 })
    );

    await act(async () => {
      await result.current.handleWordSubmit('hi', [0, 1]);
    });

    expect(mockValidateWord).not.toHaveBeenCalled();
  });

  it('should defer submission during cascade (not validate immediately)', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result } = renderHook(() =>
      useAdventureWordSubmit({ ...defaultProps, isCascading: true })
    );

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    // While cascade is active, validation is deferred
    expect(mockValidateWord).not.toHaveBeenCalled();
  });

  it('flushes a queued submission after cascade ends', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result, rerender } = renderHook(
      ({ isCascading }: { isCascading: boolean }) =>
        useAdventureWordSubmit({ ...defaultProps, isCascading }),
      { initialProps: { isCascading: true } }
    );

    // Submit a word while cascade is in progress — it should queue
    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });
    expect(mockValidateWord).not.toHaveBeenCalled();

    // Cascade ends → queued submission flushes
    await act(async () => {
      rerender({ isCascading: false });
    });

    expect(mockValidateWord).toHaveBeenCalledWith('hello', expect.any(Array));
  });

  it('allows different concurrent words without silently dropping the second', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    // Fire two different words back-to-back before the first's validation
    // promise microtask settles. Second call must not be silently dropped.
    await act(async () => {
      const p1 = result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
      const p2 = result.current.handleWordSubmit('world', [5, 6, 7, 8, 9]);
      await Promise.all([p1, p2]);
    });

    expect(mockValidateWord).toHaveBeenCalledWith('hello', expect.any(Array));
    expect(mockValidateWord).toHaveBeenCalledWith('world', expect.any(Array));
  });

  it('drops duplicate submission of the same in-flight word', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    // Fire the SAME word twice before the first validation settles.
    // The second must be dropped so we don't emit double popups/feedback.
    await act(async () => {
      const p1 = result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
      const p2 = result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
      await Promise.all([p1, p2]);
    });

    expect(mockValidateWord).toHaveBeenCalledTimes(1);
  });

  it('should handle valid word submission', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(mockValidateWord).toHaveBeenCalledWith('hello', expect.any(Array));
    expect(mockSubmitWordWithPath).toHaveBeenCalled();
    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockClearCurrentHint).toHaveBeenCalled();
    expect(mockRecordActivity).toHaveBeenCalled();
    expect(mockResetOnGameAction).toHaveBeenCalled();
    expect(mockRecordAIWord).toHaveBeenCalledWith(true, 0);
    expect(mockAddScorePopup).toHaveBeenCalled();
    expect(result.current.validationFeedback.isValid).toBe(true);
    expect(result.current.lastAccepted).toEqual({ word: 'hello', score: 50 });
  });

  it('should handle rejected word', async () => {
    mockValidateWord.mockResolvedValue({ isValid: false, errorKey: 'error.notAWord' });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    await act(async () => {
      await result.current.handleWordSubmit('xyz', [0, 1, 2]);
    });

    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockRecordAIWord).toHaveBeenCalledWith(false, 0);
    expect(result.current.validationFeedback.error).toBe('error.notAWord');
    expect(result.current.wordFeedback?.type).toBe('rejected');
  });

  it('should deal boss damage on valid word when boss active', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 100 });
    mockCheckBossWord.mockReturnValue({
      scoreMultiplier: 1.5,
      meetsRequirement: true,
      triggerTaunt: null,
    });
    mockDealBossDamage.mockReturnValue(15);

    const { result } = renderHook(() =>
      useAdventureWordSubmit({
        ...defaultProps,
        isBossActive: true,
        bossConfig: { id: 'boss' } as any,
      })
    );

    await act(async () => {
      await result.current.handleWordSubmit('power', [0, 1, 2, 3, 4]);
    });

    expect(mockCheckBossWord).toHaveBeenCalledWith('power');
    expect(mockDealBossDamage).toHaveBeenCalled();
  });

  it('should not inflate boss damage by stacking Math.ceil across multipliers', async () => {
    // scoreValue=5, mechanic x1, boss skill x1.3, long-word x1.2
    // Consolidated: ceil(max(1, 5/3) * 1.3 * 1.2) = ceil(2.6) = 3
    // Stacked-ceil (buggy): ceil(ceil(ceil(5/3)*1.3)*1.2) = ceil(ceil(2*1.3)*1.2) = ceil(3*1.2) = 4
    mockValidateWord.mockResolvedValue({ isValid: true, score: 5 });
    mockCheckBossWord.mockReturnValue({
      scoreMultiplier: 1,
      meetsRequirement: false,
      triggerTaunt: null,
    });

    const { result } = renderHook(() =>
      useAdventureWordSubmit({
        ...defaultProps,
        isBossActive: true,
        bossConfig: { id: 'boss' } as any,
        skillEffects: {
          bossDamageMultiplier: 1.3,
          comboMultiplierBonus: 0,
          getLongWordDamageMultiplier: vi.fn().mockReturnValue(1.2),
        },
      })
    );

    await act(async () => {
      await result.current.handleWordSubmit('cat', [0, 1, 2]);
    });

    expect(mockDealBossDamage).toHaveBeenCalledWith(3, 1.0);
  });

  it('should trigger boss taunt on bad word when boss active', async () => {
    mockValidateWord.mockResolvedValue({ isValid: false, errorKey: 'error.notAWord' });

    const { result } = renderHook(() =>
      useAdventureWordSubmit({
        ...defaultProps,
        isBossActive: true,
        bossConfig: { id: 'boss' } as any,
      })
    );

    await act(async () => {
      await result.current.handleWordSubmit('bad', [0, 1, 2]);
    });

    expect(mockTriggerBossTaunt).toHaveBeenCalledWith('onBadWord');
  });

  it('should earn FIRST_WORD achievement on first valid word', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 30 });

    const { result } = renderHook(() =>
      useAdventureWordSubmit({ ...defaultProps, wordsFound: [] })
    );

    await act(async () => {
      await result.current.handleWordSubmit('cat', [0, 1, 2]);
    });

    expect(mockHandleEarnAchievement).toHaveBeenCalledWith('FIRST_WORD');
  });

  it('should earn LONG_WORD_6 achievement for 6+ letter words', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 80 });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    await act(async () => {
      await result.current.handleWordSubmit('strong', [0, 1, 2, 3, 4, 5]);
    });

    expect(mockHandleEarnAchievement).toHaveBeenCalledWith('LONG_WORD_6');
  });

  it('should clear feedback after timeout on valid word', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(result.current.validationFeedback.isValid).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.validationFeedback.isValid).toBe(false);
    expect(result.current.lastAccepted).toBeNull();
  });

  it('should clear error feedback after timeout on rejected word', async () => {
    mockValidateWord.mockResolvedValue({ isValid: false, errorKey: 'error.notAWord' });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    await act(async () => {
      await result.current.handleWordSubmit('xyz', [0, 1, 2]);
    });

    expect(result.current.validationFeedback.error).toBe('error.notAWord');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.validationFeedback.error).toBeNull();
  });

  it('should reset isSubmitting and show error when validateWord throws', async () => {
    mockValidateWord.mockRejectedValue(new Error('Network timeout'));

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    // First submission — validateWord throws
    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(result.current.validationFeedback.error).toBe('validationError');

    // Second submission should NOT be blocked (isSubmittingRef was reset)
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });
    await act(async () => {
      await result.current.handleWordSubmit('world', [5, 6, 7, 8, 9]);
    });

    expect(mockValidateWord).toHaveBeenCalledTimes(2);
    expect(result.current.validationFeedback.isValid).toBe(true);
  });

  it('dispatches submitHuntGuess when archetype=hunt and word length matches target', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });
    const submitHuntGuess = vi.fn();
    const { result } = renderHook(() => useAdventureWordSubmit({
      ...defaultProps,
      archetype: 'hunt',
      huntTargetWord: 'HELLO',
      submitHuntGuess,
    } as any));

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(submitHuntGuess).toHaveBeenCalledWith('hello');
  });

  it('does NOT dispatch submitHuntGuess when word length differs from target', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });
    const submitHuntGuess = vi.fn();
    const { result } = renderHook(() => useAdventureWordSubmit({
      ...defaultProps,
      archetype: 'hunt',
      huntTargetWord: 'HELLO',
      submitHuntGuess,
    } as any));

    await act(async () => {
      await result.current.handleWordSubmit('hi', [0, 1]);
    });

    expect(submitHuntGuess).not.toHaveBeenCalled();
  });

  it('should store last submitted word path for explosion effects', async () => {
    mockValidateWord.mockResolvedValue({ isValid: true, score: 50 });

    const { result } = renderHook(() => useAdventureWordSubmit(defaultProps));

    await act(async () => {
      await result.current.handleWordSubmit('hello', [0, 1, 2, 3, 4]);
    });

    expect(result.current.lastSubmittedWordRef.current).toEqual({
      word: 'hello',
      path: expect.any(Array),
    });
  });
});
