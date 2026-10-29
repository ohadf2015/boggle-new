'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { FeedbackType } from '../types';
import {
  huntStageReducer,
  initialHuntStage,
  verdictFor,
  verdictHoldMs,
  PENDING_TIMEOUT_MS,
  type HuntCell,
} from './huntStage';
import { createLiveWord } from './liveWord';

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
  const [liveWord] = useState(createLiveWord);
  const seqRef = useRef(feedbackSeq);
  const phaseRef = useRef(stage.phase);
  useEffect(() => {
    phaseRef.current = stage.phase;
  }, [stage.phase]);

  useEffect(() => {
    seqRef.current = feedbackSeq;
    dispatch({ type: 'feedback', seq: feedbackSeq, verdict: verdictFor(feedbackType), word: feedbackWord });
  }, [feedbackSeq, feedbackType, feedbackWord]);

  useEffect(() => {
    if (stage.phase !== 'pending' && stage.phase !== 'verdict') return;
    // The game ends on the hidden word: its stamp stays on the board under the finish overlay.
    if (stage.verdict === 'target') return;
    const id = setTimeout(
      () => dispatch({ type: 'expire' }),
      stage.phase === 'verdict' ? verdictHoldMs(stage.verdict) : PENDING_TIMEOUT_MS,
    );
    return () => clearTimeout(id);
  }, [stage.phase, stage.releaseSeq, stage.word, stage.verdict]);

  const live = useCallback((word: string) => {
    liveWord.set(word);
    // Mid-drag letters only change the live word; the stage moves on the first letter and on clear.
    if (word && phaseRef.current === 'live') return;
    dispatch({ type: 'live', word });
  }, [liveWord]);
  const release = useCallback(
    (word: string, path: HuntCell[]) => {
      liveWord.set('');
      dispatch({ type: 'release', word, path, seq: seqRef.current });
    },
    [liveWord],
  );

  return { stage, live, release, liveWord };
}
