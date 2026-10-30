'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { submitDailyScore, type SubmitOutcome, type SubmitPayload } from '@/lib/connections/dailyClient';
import { patchDailyResult } from '@/lib/connections/dailyResultStore';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export interface DailyScoreSave {
  state: SaveState;
  send: (payload: SubmitPayload) => Promise<SubmitOutcome>;
  retry: () => void;
}

/**
 * One submit path for both daily flavors. The payload stays on the stored
 * result (`pendingSubmit`) until the server accepts or rejects it, so a failed
 * save is retried on the next visit instead of being lost silently.
 */
export function useDailyScoreSave(today: string, onOutcome?: (outcome: SubmitOutcome) => void): DailyScoreSave {
  const [state, setState] = useState<SaveState>('idle');
  const payloadRef = useRef<SubmitPayload | null>(null);
  const mounted = useRef(true);
  const onOutcomeRef = useRef(onOutcome);
  onOutcomeRef.current = onOutcome;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const send = useCallback(
    async (payload: SubmitPayload) => {
      payloadRef.current = payload;
      setState('saving');
      const outcome = await submitDailyScore(payload);
      const retryable = outcome.status === 'failed' && outcome.retryable;
      if (!retryable) patchDailyResult(today, { pendingSubmit: null });
      if (mounted.current) {
        setState(retryable ? 'failed' : 'saved');
        onOutcomeRef.current?.(outcome);
      }
      return outcome;
    },
    [today],
  );

  const retry = useCallback(() => {
    if (payloadRef.current) void send(payloadRef.current);
  }, [send]);

  return { state, send, retry };
}
