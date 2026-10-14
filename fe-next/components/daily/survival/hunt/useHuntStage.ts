'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { FeedbackType } from '../types';
import {
  huntStageReducer,
  initialHuntStage,
  verdictFor,
  verdictHoldMs,
  PENDING_TIMEOUT_MS,
  type HuntCell,
} from './huntStage';

export function useHuntStage({
  feedbackSeq,
  feedbackType,
  feedbackWord,
}: {
  feedbackSeq: number;
  feedbackType: FeedbackType | null;
  feedbackWord: string | null;
}) {
  const [stage, dispatch] = useReducer(huntStageReducer, initialHuntStage);
  const seqRef = useRef(feedbackSeq);

  useEffect(() => {
    seqRef.current = feedbackSeq;
    dispatch({ type: 'feedback', seq: feedbackSeq, verdict: verdictFor(feedbackType), word: feedbackWord });
  }, [feedbackSeq, feedbackType, feedbackWord]);

  useEffect(() => {
    if (stage.phase !== 'pending' && stage.phase !== 'verdict') return;
    const id = setTimeout(
      () => dispatch({ type: 'expire' }),
      stage.phase === 'verdict' ? verdictHoldMs(stage.verdict) : PENDING_TIMEOUT_MS,
    );
    return () => clearTimeout(id);
  }, [stage.phase, stage.releaseSeq, stage.word, stage.verdict]);

  const live = useCallback((word: string) => dispatch({ type: 'live', word }), []);
  const release = useCallback(
    (word: string, path: HuntCell[]) => dispatch({ type: 'release', word, path, seq: seqRef.current }),
    [],
  );

  return { stage, live, release };
}
