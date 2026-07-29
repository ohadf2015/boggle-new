/**
 * useHintGoldConfirm
 *
 * Two-step confirmation for paid hints: first click enters a pending
 * state (auto-dismiss 5s), second click executes. Free hints (cost 0)
 * execute immediately.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseHintGoldConfirmProps {
  hasHintsAvailable: boolean;
  nextHintCost: number;
  getHint: () => void;
  dismissAutoHint: () => void;
  onHintConsumed?: () => void;
}

interface UseHintGoldConfirmResult {
  hintGoldPending: boolean;
  handleHintClick: () => void;
}

const PENDING_AUTO_DISMISS_MS = 5000;

export function useHintGoldConfirm({
  hasHintsAvailable,
  nextHintCost,
  getHint,
  dismissAutoHint,
  onHintConsumed,
}: UseHintGoldConfirmProps): UseHintGoldConfirmResult {
  const [hintGoldPending, setHintGoldPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const executeHintAction = useCallback(() => {
    getHint();
    dismissAutoHint();
    onHintConsumed?.();
    setHintGoldPending(false);
  }, [getHint, dismissAutoHint, onHintConsumed]);

  const handleHintClick = useCallback(() => {
    if (!hasHintsAvailable) return;
    if (nextHintCost > 0 && !hintGoldPending) {
      setHintGoldPending(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHintGoldPending(false), PENDING_AUTO_DISMISS_MS);
      return;
    }
    executeHintAction();
  }, [hasHintsAvailable, nextHintCost, hintGoldPending, executeHintAction]);

  return { hintGoldPending, handleHintClick };
}
