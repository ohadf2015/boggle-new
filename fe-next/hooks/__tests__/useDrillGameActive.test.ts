import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDrillGameActive } from '../useDrillGameActive';

const setGameActive = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive }),
}));

describe('useDrillGameActive', () => {
  beforeEach(() => setGameActive.mockClear());

  it('marks the game active while a drill is being played', () => {
    renderHook(() => useDrillGameActive(true));
    expect(setGameActive).toHaveBeenCalledWith(true);
  });

  it('marks the game inactive when not playing', () => {
    renderHook(() => useDrillGameActive(false));
    expect(setGameActive).toHaveBeenCalledWith(false);
  });

  it('clears game-active on unmount so it cannot leak into other modes', () => {
    const { unmount } = renderHook(() => useDrillGameActive(true));
    setGameActive.mockClear();
    unmount();
    expect(setGameActive).toHaveBeenCalledWith(false);
  });

  it('clears game-active when play ends (true -> false)', () => {
    const { rerender } = renderHook(({ a }) => useDrillGameActive(a), {
      initialProps: { a: true },
    });
    setGameActive.mockClear();
    rerender({ a: false });
    expect(setGameActive).toHaveBeenLastCalledWith(false);
  });
});
