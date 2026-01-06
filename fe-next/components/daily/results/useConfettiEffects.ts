/**
 * Confetti Effects Hook
 * Handles victory and rank confetti animations
 */

import { useEffect } from 'react';
import { fireConfetti, fireRankConfetti, fireVictoryConfetti } from '@/utils/confettiUtils';
import { RANK_CONFETTI_COLORS } from './constants';
import type { WordHuntStats } from './types';

interface UseConfettiEffectsProps {
  isNewCompletion: boolean;
  solved: boolean;
  attemptsUsed: number;
  stats: WordHuntStats | null;
}

export function useConfettiEffects({
  isNewCompletion,
  solved,
  attemptsUsed,
  stats,
}: UseConfettiEffectsProps) {
  // Fire confetti on victory
  useEffect(() => {
    if (isNewCompletion && solved) {
      const duration = 2500;
      const end = Date.now() + duration;
      const frame = () => {
        fireConfetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10B981', '#FFE135', '#00D9FF'] });
        fireConfetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10B981', '#FFE135', '#00D9FF'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      if (attemptsUsed <= 3) {
        setTimeout(() => fireConfetti({ particleCount: 150, spread: 120, origin: { y: 0.6 }, colors: ['#10B981', '#FFE135', '#FF1493'] }), 500);
      }
    }
  }, [isNewCompletion, solved, attemptsUsed]);

  // Fire rank confetti for top 3
  useEffect(() => {
    if (isNewCompletion && stats?.yourStats?.solved && stats.yourStats.rank !== undefined && stats.yourStats.rank <= 3) {
      const colors = RANK_CONFETTI_COLORS[stats.yourStats.rank] || RANK_CONFETTI_COLORS[1];
      const count = Math.floor(100 * (1.2 - stats.yourStats.rank * 0.15));
      const timer = setTimeout(() => {
        fireConfetti({ particleCount: Math.floor(count * 0.35), spread: 26, startVelocity: 55, origin: { y: 0.6 }, colors });
        fireConfetti({ particleCount: Math.floor(count * 0.25), spread: 60, origin: { y: 0.6 }, colors });
        fireConfetti({ particleCount: Math.floor(count * 0.4), spread: 100, decay: 0.91, scalar: 0.9, origin: { y: 0.6 }, colors });
      }, 2800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, stats?.yourStats]);

  // Handler for badge click confetti
  const handleBadgeClickConfetti = (rank: number | undefined) => {
    if (rank && rank <= 3) {
      fireRankConfetti(rank);
    } else {
      fireVictoryConfetti();
    }
  };

  return { handleBadgeClickConfetti };
}
