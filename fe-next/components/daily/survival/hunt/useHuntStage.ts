'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { FeedbackType } from '../types';
import {
  huntStageReducer,
  initialHuntStage,
  verdictFor,
  VERDICT_HOLD_MS,
  PENDING_TIMEOUT_MS,
  type HuntCell,
} from './huntStage';

export function useHuntStage({ feedbackSeq, feedbackType }: { feedbackSeq: number; feedbackType: FeedbackType | null }) {
  const [stage, dispatch] = useReducer(huntStageReducer, initialHuntStage);
  const seqRef = useRef(feedbackSeq);

  useEffect(() => {
    seqRef.current = feedbackSeq;
    dispatch({ type: 'feedback', seq: feedbackSeq, verdict: verdictFor(feedbackType) });
  }, [feedbackSeq, feedbackType]);

  useEffect(() => {
    if (stage.phase !== 'pending' && stage.phase !== 'verdict') return;
    const id = setTimeout(
      () => dispatch({ type: 'expire' }),
      stage.phase === 'verdict' ? VERDICT_HOLD_MS : PENDING_TIMEOUT_MS,
    );
    return () => clearTimeout(id);
  }, [stage.phase, stage.releaseSeq, stage.word]);

  const live = useCallback((word: string) => dispatch({ type: 'live', word }), []);
  const release = useCallback(
    (word: string, path: HuntCell[]) => dispatch({ type: 'release', word, path, seq: seqRef.current }),
    [],
  );

  return { stage, live, release };
}
