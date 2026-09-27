/**
 * useDuelCombo — turns the streak the SERVER sends into display state and the
 * stingers that go with it. It never computes points.
 */

import { renderHook, act } from '@testing-library/react';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound }),
}));

import { useDuelCombo } from '../useDuelCombo';

describe('useDuelCombo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts cold', () => {
    const { result } = renderHook(() => useDuelCombo());
    expect(result.current.streak).toBe(0);
    expect(result.current.tier.id).toBe('none');
    expect(result.current.peakStreak).toBe(0);
  });

  it('takes the streak from the server payload rather than counting its own', () => {
    const { result } = renderHook(() => useDuelCombo());

    act(() => result.current.registerAccepted(4, 6));

    expect(result.current.streak).toBe(4);
    expect(result.current.bonus).toBe(6);
    expect(result.current.tier.id).toBe('blaze');
  });

  it('tracks the best streak of the duel', () => {
    const { result } = renderHook(() => useDuelCombo());

    act(() => result.current.registerAccepted(5, 8));
    act(() => result.current.registerRejected(0));
    act(() => result.current.registerAccepted(1, 0));

    expect(result.current.streak).toBe(1);
    expect(result.current.peakStreak).toBe(5);
  });

  it('fires a milestone stinger when the chain crosses into a new tier', () => {
    const { result } = renderHook(() => useDuelCombo());

    act(() => result.current.registerAccepted(1, 0));
    expect(playSound).not.toHaveBeenCalled();

    act(() => result.current.registerAccepted(2, 2));
    expect(playSound).toHaveBeenCalledWith('comboMilestone', expect.anything());
  });

  it('fires the fire stinger once the chain hits inferno', () => {
    const { result } = renderHook(() => useDuelCombo());

    act(() => result.current.registerAccepted(6, 10));

    expect(playSound).toHaveBeenCalledWith('streakFire', expect.anything());
  });

  it('plays the break sound only when a real chain snaps', () => {
    const { result } = renderHook(() => useDuelCombo());

    act(() => result.current.registerRejected(0));
    expect(playSound).not.toHaveBeenCalledWith('comboBreak', expect.anything());

    act(() => result.current.registerAccepted(3, 4));
    act(() => result.current.registerRejected(0));
    expect(playSound).toHaveBeenCalledWith('comboBreak', expect.anything());
  });

  it('resets everything for a rematch', () => {
    const { result } = renderHook(() => useDuelCombo());

    act(() => result.current.registerAccepted(7, 10));
    act(() => result.current.reset());

    expect(result.current.streak).toBe(0);
    expect(result.current.peakStreak).toBe(0);
    expect(result.current.bonus).toBe(0);
  });
});
