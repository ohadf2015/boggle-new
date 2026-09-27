import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePracticeSfx } from '../usePracticeSfx';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

describe('usePracticeSfx', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never lets a practice sound be gated behind the game-active flag', () => {
    // Practice screens never call setGameActive(true), so a sound that omits
    // requiresGameActive:false is silently dropped — the exact bug that left
    // four modes mute. Every cue this hook exposes must opt out.
    const { result } = renderHook(() => usePracticeSfx());
    const cues = Object.values(result.current);
    expect(cues.length).toBeGreaterThan(5);
    cues.forEach((cue) => {
      playSound.mockClear();
      (cue as () => void)();
      expect(playSound).toHaveBeenCalledTimes(1);
      expect(playSound.mock.calls[0][1]).toMatchObject({ requiresGameActive: false });
    });
  });

  it('maps each cue to a distinct sound', () => {
    const { result } = renderHook(() => usePracticeSfx());
    result.current.correct();
    result.current.wrong();
    expect(playSound.mock.calls[0][0]).toBe('wordAccepted');
    expect(playSound.mock.calls[1][0]).toBe('wordRejected');
  });

  it('keeps the cue identities stable so effects do not re-fire', () => {
    const { result, rerender } = renderHook(() => usePracticeSfx());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
