/**
 * useAdventureActions — bundles small side-effect handlers.
 * Tests: handleSpendGold gold check + deduction, handleExitWithConfirm
 * skip-confirm-on-complete + confirm path, handleRetry tracks + resets + calls base.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdventureActions } from '../useAdventureActions';

vi.mock('@/utils/posthogEngagement', () => ({
  trackLevelRetried: vi.fn(),
}));
import { trackLevelRetried } from '@/utils/posthogEngagement';

type Params = Parameters<typeof useAdventureActions>[0];

const makeParams = (overrides: Partial<Params> = {}): Params => ({
  showLevelComplete: false,
  onExit: vi.fn(),
  t: (k: string) => k,
  world: 1,
  level: 2,
  attemptCount: 3,
  hintsUsedRef: { current: 5 },
  resetFlashGoldAward: vi.fn(),
  resetTracking: vi.fn(),
  resetLastWordTileTypes: vi.fn(),
  handleRetryBase: vi.fn(),
  ...overrides,
});

describe('useAdventureActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleExitWithConfirm exits immediately when level complete', () => {
    const onExit = vi.fn();
    const confirmMock = vi.fn();
    (window as unknown as { confirm: (m: string) => boolean }).confirm = confirmMock;
    const { result } = renderHook(() => useAdventureActions(makeParams({ showLevelComplete: true, onExit })));
    act(() => result.current.handleExitWithConfirm());
    expect(onExit).toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('handleExitWithConfirm prompts otherwise and exits when confirmed', () => {
    const onExit = vi.fn();
    const confirmMock = vi.fn().mockReturnValue(true);
    (window as unknown as { confirm: (m: string) => boolean }).confirm = confirmMock;
    const { result } = renderHook(() => useAdventureActions(makeParams({ onExit })));
    act(() => result.current.handleExitWithConfirm());
    expect(confirmMock).toHaveBeenCalledWith('adventure.game.confirmExitDesc');
    expect(onExit).toHaveBeenCalled();
  });

  it('handleExitWithConfirm skips exit when cancelled', () => {
    const onExit = vi.fn();
    const confirmMock = vi.fn().mockReturnValue(false);
    (window as unknown as { confirm: (m: string) => boolean }).confirm = confirmMock;
    const { result } = renderHook(() => useAdventureActions(makeParams({ onExit })));
    act(() => result.current.handleExitWithConfirm());
    expect(onExit).not.toHaveBeenCalled();
  });

  it('handleRetry tracks, resets hintsUsedRef, calls all resets, invokes base', () => {
    const hintsUsedRef = { current: 7 };
    const resetFlashGoldAward = vi.fn();
    const resetTracking = vi.fn();
    const resetLastWordTileTypes = vi.fn();
    const handleRetryBase = vi.fn();
    const { result } = renderHook(() => useAdventureActions(makeParams({
      hintsUsedRef, resetFlashGoldAward, resetTracking, resetLastWordTileTypes, handleRetryBase,
      world: 2, level: 5, attemptCount: 3,
    })));
    act(() => result.current.handleRetry());
    expect(trackLevelRetried).toHaveBeenCalledWith({ world: 2, level: 5, attempt: 4 });
    expect(hintsUsedRef.current).toBe(0);
    expect(resetFlashGoldAward).toHaveBeenCalled();
    expect(resetTracking).toHaveBeenCalled();
    expect(resetLastWordTileTypes).toHaveBeenCalled();
    expect(handleRetryBase).toHaveBeenCalled();
  });
});
