import { useEffect, useState } from 'react';
import { useShareOpenGuard } from '@/hooks/useShareOpenGuard';
import { fireConfetti } from '@/utils/confettiUtils';
import type { SinglePlayerMode, SinglePlayerResultsData } from '../../SinglePlayerView';

const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'],
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'],
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'],
};

interface Options {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  playerRank: number;
  isWinner: boolean;
  hasMinimumScore: boolean;
}

/** Confetti for a podium or record, and the share prompt that opens once per winning game. */
export function useSoloResultsCelebration({ results, mode, playerRank, isWinner, hasMinimumScore }: Options) {
  const [showShareModal, setShowShareModal] = useState(false);
  const { shouldFireShareOpen } = useShareOpenGuard();

  useEffect(() => {
    const shouldAutoOpen = hasMinimumScore && (isWinner || results.isNewHighScore);
    if (!shouldAutoOpen) return;
    if (!results.gameSessionId) return;
    if (shouldFireShareOpen(results.gameSessionId)) {
      setShowShareModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once per gameSessionId
  }, [results.gameSessionId, isWinner, results.isNewHighScore, hasMinimumScore]);

  const shouldShowConfetti = hasMinimumScore && (
    (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) || isWinner || results.isNewHighScore
  );

  useEffect(() => {
    if (shouldShowConfetti) {
      const isRankCelebration = mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3;
      const colors = isRankCelebration
        ? RANK_CONFETTI_COLORS[playerRank]
        : ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7'];
      const particleCount = results.isNewHighScore ? 180 : isRankCelebration ? 140 : 100;
      const spread = results.isNewHighScore ? 100 : 70;
      fireConfetti({ particleCount, spread, origin: { y: 0.6 }, colors });
    }
  }, [shouldShowConfetti, mode, playerRank, results.isNewHighScore]);

  return { showShareModal, setShowShareModal };
}
