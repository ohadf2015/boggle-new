/**
 * useFlashChallengeRewards Tests
 *
 * Plays a sound on new flash challenge appearance and awards gold + coin
 * sound once per completion (reset when challenge reappears).
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlashChallengeRewards } from '../useFlashChallengeRewards';

describe('useFlashChallengeRewards', () => {
  it('plays appearance sound when a new challenge appears', () => {
    const playFlashChallengeSound = vi.fn();
    const { rerender } = renderHook(
      ({ challenge }: { challenge: { id: string; rewardCoins: number } | null }) =>
        useFlashChallengeRewards({
          activeChallenge: challenge,
          isChallengeComplete: false,
          addGold: vi.fn(), playFlashChallengeSound, playCoinCollectSound: vi.fn(),
        }),
      { initialProps: { challenge: null as { id: string; rewardCoins: number } | null } }
    );
    rerender({ challenge: { id: 'c1', rewardCoins: 10 } });
    expect(playFlashChallengeSound).toHaveBeenCalledTimes(1);
  });

  it('does not replay sound for same challenge id', () => {
    const playFlashChallengeSound = vi.fn();
    const props = {
      activeChallenge: { id: 'c1', rewardCoins: 10 },
      isChallengeComplete: false,
      addGold: vi.fn(), playFlashChallengeSound, playCoinCollectSound: vi.fn(),
    };
    const { rerender } = renderHook(p => useFlashChallengeRewards(p), { initialProps: props });
    rerender({ ...props });
    expect(playFlashChallengeSound).toHaveBeenCalledTimes(1);
  });

  it('plays sound again when a different challenge id appears', () => {
    const playFlashChallengeSound = vi.fn();
    const { rerender } = renderHook(
      ({ challenge }: { challenge: { id: string; rewardCoins: number } | null }) =>
        useFlashChallengeRewards({
          activeChallenge: challenge,
          isChallengeComplete: false,
          addGold: vi.fn(), playFlashChallengeSound, playCoinCollectSound: vi.fn(),
        }),
      { initialProps: { challenge: { id: 'c1', rewardCoins: 10 } as { id: string; rewardCoins: number } | null } }
    );
    rerender({ challenge: null });
    rerender({ challenge: { id: 'c2', rewardCoins: 20 } });
    expect(playFlashChallengeSound).toHaveBeenCalledTimes(2);
  });

  it('awards gold + plays coin sound once on completion', () => {
    const addGold = vi.fn();
    const playCoinCollectSound = vi.fn();
    const props = {
      activeChallenge: { id: 'c1', rewardCoins: 25 },
      isChallengeComplete: true,
      addGold, playFlashChallengeSound: vi.fn(), playCoinCollectSound,
    };
    const { rerender } = renderHook(p => useFlashChallengeRewards(p), { initialProps: props });
    rerender({ ...props });
    expect(addGold).toHaveBeenCalledTimes(1);
    expect(addGold).toHaveBeenCalledWith(25);
    expect(playCoinCollectSound).toHaveBeenCalledTimes(1);
  });

  it('re-awards after completion toggles back to false and then true again', () => {
    const addGold = vi.fn();
    const { rerender } = renderHook(
      (p: { complete: boolean }) =>
        useFlashChallengeRewards({
          activeChallenge: { id: 'c1', rewardCoins: 5 },
          isChallengeComplete: p.complete,
          addGold, playFlashChallengeSound: vi.fn(), playCoinCollectSound: vi.fn(),
        }),
      { initialProps: { complete: true } }
    );
    rerender({ complete: false });
    rerender({ complete: true });
    expect(addGold).toHaveBeenCalledTimes(2);
  });

  it('does not award when completion true but activeChallenge null', () => {
    const addGold = vi.fn();
    renderHook(() =>
      useFlashChallengeRewards({
        activeChallenge: null,
        isChallengeComplete: true,
        addGold, playFlashChallengeSound: vi.fn(), playCoinCollectSound: vi.fn(),
      })
    );
    expect(addGold).not.toHaveBeenCalled();
  });
});
