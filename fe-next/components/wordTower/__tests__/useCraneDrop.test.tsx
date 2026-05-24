import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playPerfectWordSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playErrorSound: vi.fn(),
  }),
}));
vi.mock('@/hooks/useHaptics', () => ({
  useHaptics: () => ({ levelComplete: vi.fn(), selection: vi.fn(), bossHit: vi.fn() }),
}));

import { useCraneDrop } from '../useCraneDrop';
import { evaluatePlacement } from '@/lib/wordTower/cranePlacement';

describe('useCraneDrop', () => {
  it('commits a lone perfect drop at the base multiplier (no streak bonus)', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useCraneDrop(commit, vi.fn()));
    act(() => result.current.onDrop(evaluatePlacement(0, 0)));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0]).toBeCloseTo(1.4);
    expect(result.current.perfectStreak).toBe(1);
  });

  it('rewards a perfect streak with extra height', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useCraneDrop(commit, vi.fn()));
    act(() => result.current.onDrop(evaluatePlacement(0, 0)));
    act(() => result.current.onDrop(evaluatePlacement(0, 0)));
    expect(commit.mock.calls[1][0]).toBeGreaterThan(1.4);
    expect(result.current.perfectStreak).toBe(2);
  });

  it('a non-perfect drop breaks the perfect streak', () => {
    const { result } = renderHook(() => useCraneDrop(vi.fn(), vi.fn()));
    act(() => result.current.onDrop(evaluatePlacement(0, 0)));
    act(() => result.current.onDrop(evaluatePlacement(0.4, 0))); // sloppy
    expect(result.current.perfectStreak).toBe(0);
    expect(result.current.consecutiveSloppy).toBe(1);
  });

  it('a topple fires a wobble hazard and resets the bad-drop streak', () => {
    const hazard = vi.fn();
    const { result } = renderHook(() => useCraneDrop(vi.fn(), hazard));
    act(() => result.current.onDrop(evaluatePlacement(0.9, 2))); // miss after instability → topples
    expect(hazard).toHaveBeenCalledWith(1, 'wobble', expect.any(Array));
    expect(result.current.consecutiveSloppy).toBe(0);
  });
});
