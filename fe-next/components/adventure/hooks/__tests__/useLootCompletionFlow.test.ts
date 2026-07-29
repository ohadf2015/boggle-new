/**
 * useLootCompletionFlow Tests
 *
 * Loot chest vs level-complete routing:
 *  - stars > 0 AND lootDrops non-empty → loot chest
 *  - otherwise → level-complete
 *  - auto-fires when nonBossCompleted flips true
 *  - handleStoryBeatContinue closes story beat + routes
 *  - handleLootChestComplete closes chest + opens level-complete
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLootCompletionFlow } from '../useLootCompletionFlow';

describe('useLootCompletionFlow', () => {
  const baseProps = () => ({
    lootDropsLength: 0,
    stars: 0,
    nonBossCompleted: false,
    setShowLootChest: vi.fn(),
    setShowLevelComplete: vi.fn(),
    setShowStoryBeat: vi.fn(),
  });

  it('showLootOrComplete → level-complete when no loot', () => {
    const p = baseProps();
    const { result } = renderHook(() => useLootCompletionFlow({ ...p, stars: 3 }));
    act(() => result.current.showLootOrComplete());
    expect(p.setShowLevelComplete).toHaveBeenCalledWith(true);
    expect(p.setShowLootChest).not.toHaveBeenCalled();
  });

  it('showLootOrComplete → loot chest when loot exists and stars>0', () => {
    const p = { ...baseProps(), lootDropsLength: 2, stars: 1 };
    const { result } = renderHook(() => useLootCompletionFlow(p));
    act(() => result.current.showLootOrComplete());
    expect(p.setShowLootChest).toHaveBeenCalledWith(true);
    expect(p.setShowLevelComplete).not.toHaveBeenCalled();
  });

  it('showLootOrComplete → level-complete when loot exists but 0 stars', () => {
    const p = { ...baseProps(), lootDropsLength: 2, stars: 0 };
    const { result } = renderHook(() => useLootCompletionFlow(p));
    act(() => result.current.showLootOrComplete());
    expect(p.setShowLevelComplete).toHaveBeenCalledWith(true);
  });

  it('auto-fires when nonBossCompleted flips true', () => {
    const setShowLevelComplete = vi.fn();
    const { rerender } = renderHook(
      (p: { nonBossCompleted: boolean }) => useLootCompletionFlow({
        lootDropsLength: 0, stars: 2, nonBossCompleted: p.nonBossCompleted,
        setShowLootChest: vi.fn(), setShowLevelComplete, setShowStoryBeat: vi.fn(),
      }),
      { initialProps: { nonBossCompleted: false } }
    );
    expect(setShowLevelComplete).not.toHaveBeenCalled();
    rerender({ nonBossCompleted: true });
    expect(setShowLevelComplete).toHaveBeenCalledWith(true);
  });

  it('handleStoryBeatContinue closes story + routes', () => {
    const p = { ...baseProps(), stars: 2 };
    const { result } = renderHook(() => useLootCompletionFlow(p));
    act(() => result.current.handleStoryBeatContinue());
    expect(p.setShowStoryBeat).toHaveBeenCalledWith(false);
    expect(p.setShowLevelComplete).toHaveBeenCalledWith(true);
  });

  it('handleLootChestComplete closes chest + opens level complete', () => {
    const p = baseProps();
    const { result } = renderHook(() => useLootCompletionFlow(p));
    act(() => result.current.handleLootChestComplete());
    expect(p.setShowLootChest).toHaveBeenCalledWith(false);
    expect(p.setShowLevelComplete).toHaveBeenCalledWith(true);
  });
});
