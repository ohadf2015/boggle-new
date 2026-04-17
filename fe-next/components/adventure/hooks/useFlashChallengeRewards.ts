/**
 * useFlashChallengeRewards
 *
 * Side-effects around FlashChallenge appearance + completion:
 *  - plays appearance sound once per new challenge id
 *  - awards gold + plays coin sound exactly once per completion cycle
 *
 * Extracted from AdventureGame.tsx.
 */

import { useCallback, useEffect, useRef } from 'react';

interface FlashChallenge {
  id: string;
  rewardCoins: number;
}

interface UseFlashChallengeRewardsProps {
  activeChallenge: FlashChallenge | null | undefined;
  isChallengeComplete: boolean;
  addGold: (amount: number) => void;
  playFlashChallengeSound: () => void;
  playCoinCollectSound: () => void;
}

export function useFlashChallengeRewards({
  activeChallenge,
  isChallengeComplete,
  addGold,
  playFlashChallengeSound,
  playCoinCollectSound,
}: UseFlashChallengeRewardsProps): { resetFlashGoldAward: () => void } {
  const prevChallengeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeChallenge && activeChallenge.id !== prevChallengeIdRef.current) {
      prevChallengeIdRef.current = activeChallenge.id;
      playFlashChallengeSound();
    }
    if (!activeChallenge) {
      prevChallengeIdRef.current = null;
    }
  }, [activeChallenge, playFlashChallengeSound]);

  const hasAwardedFlashGoldRef = useRef(false);
  useEffect(() => {
    if (isChallengeComplete && activeChallenge && !hasAwardedFlashGoldRef.current) {
      hasAwardedFlashGoldRef.current = true;
      addGold(activeChallenge.rewardCoins);
      playCoinCollectSound();
    }
    if (!isChallengeComplete) {
      hasAwardedFlashGoldRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChallengeComplete, activeChallenge, addGold]);

  const resetFlashGoldAward = useCallback(() => {
    hasAwardedFlashGoldRef.current = false;
  }, []);

  return { resetFlashGoldAward };
}
