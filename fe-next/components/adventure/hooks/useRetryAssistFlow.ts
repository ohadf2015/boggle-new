/**
 * useRetryAssistFlow
 *
 * Shows RetryAssistModal after ≥2 consecutive 0-star defeats and
 * provides three retry variants: time bonus, hint, plain.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useCallback, useEffect, useState } from 'react';

interface UseRetryAssistFlowProps {
  handleRetry: () => void;
  addTime: (seconds: number) => void;
  getHint?: () => void;
  showLevelComplete: boolean;
  stars: number;
  consecutiveFailures: number;
}

interface UseRetryAssistFlowResult {
  showRetryAssist: boolean;
  closeRetryAssist: () => void;
  handleRetryWithBonus: () => void;
  handleRetryWithHint: () => void;
  handleRetryFromAssist: () => void;
}

const TIME_BONUS_SECONDS = 15;
const HINT_TRIGGER_DELAY_MS = 1500;

export function useRetryAssistFlow({
  handleRetry,
  addTime,
  getHint,
  showLevelComplete,
  stars,
  consecutiveFailures,
}: UseRetryAssistFlowProps): UseRetryAssistFlowResult {
  const [showRetryAssist, setShowRetryAssist] = useState(false);

  useEffect(() => {
    if (showLevelComplete && stars === 0 && consecutiveFailures >= 2) {
      setShowRetryAssist(true);
    }
  }, [showLevelComplete, stars, consecutiveFailures]);

  const closeRetryAssist = useCallback(() => setShowRetryAssist(false), []);

  const handleRetryWithBonus = useCallback(() => {
    setShowRetryAssist(false);
    addTime(TIME_BONUS_SECONDS);
    handleRetry();
  }, [handleRetry, addTime]);

  const handleRetryWithHint = useCallback(() => {
    setShowRetryAssist(false);
    handleRetry();
    setTimeout(() => { if (getHint) getHint(); }, HINT_TRIGGER_DELAY_MS);
  }, [handleRetry, getHint]);

  const handleRetryFromAssist = useCallback(() => {
    setShowRetryAssist(false);
    handleRetry();
  }, [handleRetry]);

  return {
    showRetryAssist,
    closeRetryAssist,
    handleRetryWithBonus,
    handleRetryWithHint,
    handleRetryFromAssist,
  };
}
