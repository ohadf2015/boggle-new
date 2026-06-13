import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameActiveSound } from '../useGameActiveSound';

const setGameActive = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive }),
}));

describe('useGameActiveSound', () => {
  beforeEach(() => setGameActive.mockClear());

  it('marks the game active while a mode is being played (unmutes sounds)', () => {
    renderHook(() => useGameActiveSound(true));
    expect(setGameActive).toHaveBeenCalledWith(true);
  });

  it('marks the game inactive when not playing', () => {
    renderHook(() => useGameActiveSound(false));
    expect(setGameActive).toHaveBeenCalledWith(false);
  });

  it('clears game-active on unmount so it cannot leak into other modes', () => {
    const { unmount } = renderHook(() => useGameActiveSound(true));
    setGameActive.mockClear();
    unmount();
    expect(setGameActive).toHaveBeenCalledWith(false);
  });

  it('clears game-active when play ends (true -> false)', () => {
    const { rerender } = renderHook(({ a }) => useGameActiveSound(a), {
      initialProps: { a: true },
    });
    setGameActive.mockClear();
    rerender({ a: false });
    expect(setGameActive).toHaveBeenLastCalledWith(false);
  });
});
