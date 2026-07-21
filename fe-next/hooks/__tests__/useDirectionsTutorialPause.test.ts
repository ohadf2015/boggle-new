/**
 * useDirectionsTutorialPause Hook Tests
 *
 * Event-bus pause so the first-time "any direction" tutorial can freeze the game
 * clock (via useGameTimer's isExternallyPaused) without tripping the user-pause
 * flag. Without it a brand-new player's first round ticks down behind the
 * blocking overlay.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useDirectionsTutorialPause,
  emitDirectionsTutorialActive,
} from '../useDirectionsTutorialPause';

describe('useDirectionsTutorialPause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false initially', () => {
    const { result } = renderHook(() => useDirectionsTutorialPause());
    expect(result.current).toBe(false);
  });

  it('returns true after emitDirectionsTutorialActive(true)', () => {
    const { result } = renderHook(() => useDirectionsTutorialPause());
    act(() => { emitDirectionsTutorialActive(true); });
    expect(result.current).toBe(true);
  });

  it('returns false again after emitDirectionsTutorialActive(false)', () => {
    const { result } = renderHook(() => useDirectionsTutorialPause());
    act(() => { emitDirectionsTutorialActive(true); });
    expect(result.current).toBe(true);
    act(() => { emitDirectionsTutorialActive(false); });
    expect(result.current).toBe(false);
  });

  it('cleans up its event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useDirectionsTutorialPause());
    expect(addSpy).toHaveBeenCalledWith('directionsTutorialActiveChange', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('directionsTutorialActiveChange', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
