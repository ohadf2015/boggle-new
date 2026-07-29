/**
 * Behavioral test: blastBoardUpdate socket handler in usePlayerGameEvents.
 *
 * Validates that:
 *  - The handler accepts optional overlay + seed fields
 *  - When overlay + seed are present (full board clear), they are applied to store
 *  - When overlay + seed are absent (per-word update), they are NOT applied
 *  - blastBoardUpdate is always set with the payload
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePlayerGameEvents } from '../usePlayerGameEvents';
import { useGameStore } from '@/hooks/gameState';
import type { BlastTileOverlay } from '@/shared/types/game';
import type { BlastTileState } from '@/shared/types/blast';

// Mock socket with handler capture
const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => {
    handlers[event] = handler;
  }),
  off: vi.fn((event: string) => {
    delete handlers[event];
  }),
  emit: vi.fn(),
};

vi.mock('@/utils/logger', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usePlayerGameEvents — blastBoardUpdate handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registers and cleans up blastBoardUpdate socket listener', () => {
    const { unmount } = renderHook(() =>
      usePlayerGameEvents({
        socket: mockSocket as any,
        t: (key: string) => key,
        username: 'testuser',
        setShowWordFeedback: vi.fn(),
        setWordToVote: vi.fn(),
        setEarthquakeState: vi.fn(),
        setFireRoundActive: vi.fn(),
        setFireRoundRemaining: vi.fn(),
        comboLevelRef: { current: 0 },
        lastWordTimeRef: { current: null },
        setComboLevel: vi.fn(),
        setLastWordTime: vi.fn(),
        comboTimeoutRef: { current: null },
        comboShieldsUsedRef: { current: 0 },
        intentionalExitRef: { current: false },
      })
    );

    expect(mockSocket.on).toHaveBeenCalledWith('blastBoardUpdate', expect.any(Function));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('blastBoardUpdate', expect.any(Function));
  });

  it('applies overlay + seed to store when both are present (full board clear)', () => {
    // Spy on the actual store setState to verify it's called with overlay + seed
    const setStateSpy = vi.spyOn(useGameStore, 'setState');

    renderHook(() =>
      usePlayerGameEvents({
        socket: mockSocket as any,
        t: (key: string) => key,
        username: 'testuser',
        setShowWordFeedback: vi.fn(),
        setWordToVote: vi.fn(),
        setEarthquakeState: vi.fn(),
        setFireRoundActive: vi.fn(),
        setFireRoundRemaining: vi.fn(),
        comboLevelRef: { current: 0 },
        lastWordTimeRef: { current: null },
        setComboLevel: vi.fn(),
        setLastWordTime: vi.fn(),
        comboTimeoutRef: { current: null },
        comboShieldsUsedRef: { current: 0 },
        intentionalExitRef: { current: false },
      })
    );

    const testOverlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'jelly' },
    ];
    const testTileStates: BlastTileState[][] = [
      [{ isCleared: false, powerUp: null }],
    ];

    const payload = {
      grid: [['A']],
      tileStates: testTileStates,
      clearedBy: '__board_regenerated__',
      word: '',
      clearedCount: 0,
      totalMoves: 0,
      overlay: testOverlay,
      seed: 42,
    };

    act(() => {
      handlers['blastBoardUpdate']?.(payload);
    });

    // Should apply overlay + seed to store
    expect(setStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        blastTileOverlay: testOverlay,
        blastSeed: 42,
      })
    );

    setStateSpy.mockRestore();
  });

  it('does NOT apply overlay + seed when they are absent (per-word update)', () => {
    // Spy on the actual store setState to verify it's NOT called for per-word updates
    const setStateSpy = vi.spyOn(useGameStore, 'setState');

    renderHook(() =>
      usePlayerGameEvents({
        socket: mockSocket as any,
        t: (key: string) => key,
        username: 'testuser',
        setShowWordFeedback: vi.fn(),
        setWordToVote: vi.fn(),
        setEarthquakeState: vi.fn(),
        setFireRoundActive: vi.fn(),
        setFireRoundRemaining: vi.fn(),
        comboLevelRef: { current: 0 },
        lastWordTimeRef: { current: null },
        setComboLevel: vi.fn(),
        setLastWordTime: vi.fn(),
        comboTimeoutRef: { current: null },
        comboShieldsUsedRef: { current: 0 },
        intentionalExitRef: { current: false },
      })
    );

    const testTileStates: BlastTileState[][] = [
      [{ isCleared: false, powerUp: null }],
    ];

    const payload = {
      grid: [['A']],
      tileStates: testTileStates,
      clearedBy: 'testuser',
      word: 'CAT',
      clearedCount: 1,
      totalMoves: 3,
      // Note: NO overlay or seed — normal per-word update
    };

    act(() => {
      handlers['blastBoardUpdate']?.(payload);
    });

    // Should NOT have called setState (since overlay + seed are missing)
    expect(setStateSpy).not.toHaveBeenCalled();

    setStateSpy.mockRestore();
  });
});
