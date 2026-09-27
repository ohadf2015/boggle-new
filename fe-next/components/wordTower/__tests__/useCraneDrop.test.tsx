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
import { perkModifiers } from '@/lib/wordTower/perks';

const SLOPPY = () => evaluatePlacement(0.5, 0); // a sloppy drop (offset in the sloppy band)
const PERFECT = () => evaluatePlacement(0, 0);

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
    act(() => result.current.onDrop(evaluatePlacement(0.5, 0))); // sloppy
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

  it('pushSignedOffset accumulates a visible lean (recent-weighted)', () => {
    const { result } = renderHook(() => useCraneDrop(vi.fn(), vi.fn()));
    act(() => result.current.pushSignedOffset(0.6));
    act(() => result.current.pushSignedOffset(0.7));
    expect(result.current.leanDeg).toBeGreaterThan(0);
  });

  it('a recoverable topple clears the visible lean (recovery beat)', () => {
    const { result } = renderHook(() => useCraneDrop(vi.fn(), vi.fn()));
    act(() => result.current.pushSignedOffset(0.8));
    act(() => result.current.pushSignedOffset(0.9));
    expect(result.current.leanDeg).toBeGreaterThan(0);
    act(() => result.current.onDrop(evaluatePlacement(0.9, 2))); // topple
    expect(result.current.leanDeg).toBe(0);
  });

  describe('clutch save — do-or-die on the brink', () => {
    it('flags critical once two shaky drops stack', () => {
      const { result } = renderHook(() => useCraneDrop(vi.fn(), vi.fn()));
      expect(result.current.critical).toBe(false);
      act(() => result.current.onDrop(SLOPPY()));
      act(() => result.current.onDrop(SLOPPY()));
      expect(result.current.critical).toBe(true);
    });

    it('a clean drop on the brink is a SAVE — no hazard, lean snaps upright', () => {
      const hazard = vi.fn();
      const { result } = renderHook(() => useCraneDrop(vi.fn(), hazard));
      act(() => result.current.pushSignedOffset(0.9));
      act(() => result.current.onDrop(SLOPPY()));
      act(() => result.current.onDrop(SLOPPY())); // now on the brink
      hazard.mockClear();
      act(() => result.current.onDrop(PERFECT())); // clutch!
      expect(result.current.clutch?.outcome).toBe('save');
      expect(hazard).not.toHaveBeenCalled();
      expect(result.current.leanDeg).toBe(0);
      expect(result.current.critical).toBe(false);
    });

    it('a shaky drop on the brink TOPPLES (grace suspended)', () => {
      const hazard = vi.fn();
      const { result } = renderHook(() => useCraneDrop(vi.fn(), hazard));
      act(() => result.current.onDrop(SLOPPY()));
      act(() => result.current.onDrop(SLOPPY())); // on the brink
      hazard.mockClear();
      act(() => result.current.onDrop(SLOPPY())); // sloppy alone normally never topples
      expect(result.current.clutch?.outcome).toBe('topple');
      expect(hazard).toHaveBeenCalledWith(1, 'wobble', expect.any(Array));
    });
  });

  describe('perk modifiers', () => {
    it('masterCrane boosts the perfect-drop reward', () => {
      const commit = vi.fn();
      const { result } = renderHook(() => useCraneDrop(commit, vi.fn(), perkModifiers(['masterCrane'])));
      act(() => result.current.onDrop(PERFECT()));
      // base 1.4 × (1 + 0.3 perfectBonus) = 1.82
      expect(commit.mock.calls.at(-1)![0]).toBeCloseTo(1.82);
    });

    it('tallTimber lifts every floor (sloppy included)', () => {
      const commit = vi.fn();
      const { result } = renderHook(() => useCraneDrop(commit, vi.fn(), perkModifiers(['tallTimber'])));
      act(() => result.current.onDrop(SLOPPY()));
      // sloppy base 0.6 × 1.12 heightMult
      expect(commit.mock.calls.at(-1)![0]).toBeCloseTo(0.6 * 1.12);
    });

    it('cushion makes a crane wobble cost zero floors (no hazard)', () => {
      const hazard = vi.fn();
      const { result } = renderHook(() => useCraneDrop(vi.fn(), hazard, perkModifiers(['cushion'])));
      act(() => result.current.onDrop(evaluatePlacement(0.9, 2))); // would normally topple
      expect(hazard).not.toHaveBeenCalled();
      expect(result.current.consecutiveSloppy).toBe(0); // still recovered
    });

    it('reinforced grants one more bad drop before a topple', () => {
      const hazard = vi.fn();
      const { result } = renderHook(() => useCraneDrop(vi.fn(), hazard, perkModifiers(['reinforced'])));
      act(() => result.current.onDrop(SLOPPY()));
      act(() => result.current.onDrop(SLOPPY())); // sloppyRef = 2
      hazard.mockClear();
      // a miss that would normally topple at 2 is held back by reinforced (needs 3)
      act(() => result.current.onDrop(evaluatePlacement(0.9, 2)));
      expect(hazard).not.toHaveBeenCalled();
    });
  });
});
