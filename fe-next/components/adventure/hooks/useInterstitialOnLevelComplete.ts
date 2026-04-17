/**
 * useInterstitialOnLevelComplete
 *
 * Shows an interstitial ad on the rising edge of isComplete, keyed to the
 * current world/level so ad-server frequency caps can distinguish levels.
 */

import { useEffect, useRef } from 'react';

interface UseInterstitialOnLevelCompleteProps {
  isComplete: boolean;
  showInterstitial: (placement: string) => void;
  worldNumber: number;
  levelNumber: number;
}

export function useInterstitialOnLevelComplete({
  isComplete, showInterstitial, worldNumber, levelNumber,
}: UseInterstitialOnLevelCompleteProps): void {
  const prevIsCompleteRef = useRef(false);
  useEffect(() => {
    if (isComplete && !prevIsCompleteRef.current) {
      showInterstitial(`adventure-level-complete-${worldNumber}-${levelNumber}`);
    }
    prevIsCompleteRef.current = isComplete;
  }, [isComplete, showInterstitial, worldNumber, levelNumber]);
}
