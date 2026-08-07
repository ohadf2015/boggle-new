import { vi } from 'vitest';
/**
 * usePlayerExit - `game_abandon_attempted` wiring test
 *
 * `game_abandon_attempted` was typed in the GrowthEvent union but had 0 call
 * sites (0 volume in PostHog for 14d). `handleExitRoom` is the click that
 * opens the mid-game exit-confirm dialog — the "attempt" — distinct from
 * `game_abandoned`, which only fires later if the tab is actually closed.
 */

vi.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { renderHook, act } from '@testing-library/react';
import { usePlayerExit } from '../usePlayerExit';
import { trackGrowthEvent } from '@/utils/growthTracking';

describe('usePlayerExit - game_abandon_attempted', () => {
  const mockSocket = { connected: true, emit: vi.fn(), disconnect: vi.fn() } as any;

  const baseParams = () => ({
    socket: mockSocket,
    gameCode: 'TEST',
    username: 'player',
    gameActive: true,
    setGameActive: vi.fn(),
    intentionalExitRef: { current: false } as any,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires game_abandon_attempted when exit is clicked mid-game', () => {
    const { result } = renderHook(() => usePlayerExit(baseParams()));

    act(() => {
      result.current.handleExitRoom();
    });

    expect(trackGrowthEvent).toHaveBeenCalledWith('game_abandon_attempted', {
      mode: 'multiplayer',
      gameCode: 'TEST',
    });
  });

  it('does not fire when the game is not active (waiting room exit)', () => {
    const { result } = renderHook(() => usePlayerExit({ ...baseParams(), gameActive: false }));

    act(() => {
      result.current.handleExitRoom();
    });

    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });
});
