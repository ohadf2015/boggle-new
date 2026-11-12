import { useMemo } from 'react';
import { useAsyncChallengeProducer } from '@/hooks/useAsyncChallengeProducer';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

/** Posts the challenger score, or the friend's reply, when a pending async challenge sits in sessionStorage. */
export function useSoloAsyncChallenge(results: SinglePlayerResultsData) {
  const bestWord = useMemo(() => {
    return (results.playerWords || []).reduce(
      (longest, w) => (w.length > longest.length ? w : longest),
      '',
    );
  }, [results.playerWords]);
  useAsyncChallengeProducer({
    enabled: true,
    score: results.playerScore,
    words: results.playerWords || [],
    bestWord: bestWord || undefined,
    letterGrid: results.grid,
    gridSize: results.grid?.length ?? 4,
  });
}
