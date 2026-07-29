import { renderHook, act } from '@testing-library/react';
import { useFeedbackChannel } from '../useFeedbackChannel';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const playChord = vi.fn();
const playCoin = vi.fn();

vi.mock('../../lib/audio/wordFindChord', () => ({
  playWordFindChord: (...args: any[]) => playChord(...args),
}));
vi.mock('../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playCoinCollectSound: () => playCoin() }),
}));
vi.mock('../useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

beforeEach(() => {
  playChord.mockClear();
  playCoin.mockClear();
});

describe('useFeedbackChannel', () => {
  it('fires audio + sets visual state on word-found-self', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'word-found-self', word: 'CAT', score: 3 }));
    expect(playChord).toHaveBeenCalledTimes(1);
    expect(playCoin).toHaveBeenCalledTimes(1);
    expect(result.current.visual.flash).toBe(true);
    expect(result.current.visual.popup).toEqual({ word: 'CAT', score: 3 });
  });

  it('combo plays octave-up chord', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'combo', count: 3 }));
    expect(playChord).toHaveBeenLastCalledWith(3, 1);
  });

  it('opponent word plays muted chord (length 1, octave 0)', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'word-found-opponent', word: 'DOG', score: 3 }));
    expect(playChord).toHaveBeenCalledWith(1, 0);
  });

  it('steal plays low chord (length 2, octave -1)', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'steal', word: 'CAT', fromUserId: 'u2' }));
    expect(playChord).toHaveBeenCalledWith(2, -1);
  });

  it('round-end triggers shake', () => {
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'round-end', winnerId: 'u1' }));
    expect(result.current.visual.shake).toBe(true);
  });

  it('reduced-motion disables visual flash but keeps audio', async () => {
    const { useReducedMotion } = await import('../useReducedMotion');
    (useReducedMotion as any).mockReturnValue(true);
    const { result } = renderHook(() => useFeedbackChannel());
    act(() => result.current.fire({ type: 'word-found-self', word: 'CAT', score: 3 }));
    expect(playChord).toHaveBeenCalled();
    expect(result.current.visual.flash).toBe(false);
    expect(result.current.visual.popup).toBeUndefined();
  });
});
