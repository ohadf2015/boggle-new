import { useEffect, useRef, useState } from 'react';
import { useShareOpenGuard } from '@/hooks/useShareOpenGuard';
import { fireConfetti } from '@/utils/confettiUtils';
import type { SinglePlayerMode, SinglePlayerResultsData } from '../../SinglePlayerView';

// Neo palette hex, same values as RANK_COLORS / VICTORY_COLORS in confettiUtils (kept local: callers' test mocks only stub fireConfetti).
const RANK_COLORS: Record<number, string[]> = {
  1: ['#FFE135', '#BFFF00', '#00FFFF', '#FF1493'],
  2: ['#C0C0C0', '#00FFFF', '#BFFF00', '#FF1493'],
  3: ['#FF6B35', '#FF1493', '#FFE135'],
};
const VICTORY_COLORS = ['#BFFF00', '#FFE135', '#00FFFF', '#FF1493'];

interface Options {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  playerRank: number;
  isWinner: boolean;
  hasMinimumScore: boolean;
}

/** Confetti for a podium or record, and the share prompt that opens once per new personal best. */
export function useSoloResultsCelebration({ results, mode, playerRank, isWinner, hasMinimumScore }: Options) {
  const [showShareModal, setShowShareModal] = useState(false);
  const { shouldFireShareOpen } = useShareOpenGuard();

  useEffect(() => {
    const shouldAutoOpen = hasMinimumScore && results.isNewHighScore;
    if (!shouldAutoOpen) return;
    if (!results.gameSessionId) return;
    if (shouldFireShareOpen(results.gameSessionId)) {
      setShowShareModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once per gameSessionId
  }, [results.gameSessionId, results.isNewHighScore, hasMinimumScore]);

  const confettiFiredForRef = useRef<string | null>(null);

  const shouldShowConfetti = hasMinimumScore && (
    (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) || isWinner || results.isNewHighScore
  );

  useEffect(() => {
    if (shouldShowConfetti) {
      const sessionKey = results.gameSessionId ?? '';
      if (confettiFiredForRef.current === sessionKey) return;
      confettiFiredForRef.current = sessionKey;
      const isRankCelebration = mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3;
      const colors = isRankCelebration
        ? RANK_COLORS[playerRank]
        : VICTORY_COLORS;
      const particleCount = results.isNewHighScore ? 180 : isRankCelebration ? 140 : 100;
      const spread = results.isNewHighScore ? 100 : 70;
      fireConfetti({ particleCount, spread, origin: { y: 0.6 }, colors });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per gameSessionId
  }, [shouldShowConfetti, results.gameSessionId]);

  return { showShareModal, setShowShareModal };
}
