import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { fireConfetti } from '@/utils/confettiUtils';

const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'],
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'],
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'],
};

interface UseDailyConfettiReturn {
  currentUserRank: number | null;
  totalPlayers: number;
  handleCurrentUserRankChange: (rank: number | null) => void;
  setTotalPlayers: (count: number) => void;
  fireRankConfettiLocal: (rank: number) => void;
}

export function useDailyConfetti(
  isNewCompletion: boolean,
  score: number,
  streakMilestone: number | null,
): UseDailyConfettiReturn {
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipConfetti = useMemo(() => isLowEnd || !enableComplexAnimations, [isLowEnd, enableComplexAnimations]);

  const fireRankConfettiLocal = useCallback((rank: number): void => {
    if (skipConfetti) return;

    const count = Math.floor(60 * (1.2 - rank * 0.15));
    const colors = RANK_CONFETTI_COLORS[rank] || RANK_CONFETTI_COLORS[1];
    const defaults = { origin: { y: 0.6 }, colors };

    fireConfetti({ ...defaults, particleCount: Math.floor(count * 0.35), spread: 26, startVelocity: 55 });
    fireConfetti({ ...defaults, particleCount: Math.floor(count * 0.25), spread: 60 });
    fireConfetti({ ...defaults, particleCount: Math.floor(count * 0.4), spread: 100, decay: 0.91, scalar: 0.9 });
  }, [skipConfetti]);

  const handleCurrentUserRankChange = useCallback((rank: number | null) => {
    setCurrentUserRank(rank);
    if (isNewCompletion && rank !== null && rank <= 3) {
      setTimeout(() => fireRankConfettiLocal(rank), 2500);
    }
  }, [isNewCompletion, fireRankConfettiLocal]);

  // Fire confetti on new completion
  const rafIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (skipConfetti || !isNewCompletion || score <= 0) return;

    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      fireConfetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFE135', '#FF6B35', '#00D9FF'] });
      fireConfetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFE135', '#FF6B35', '#00D9FF'] });
      if (Date.now() < end) {
        rafIdRef.current = requestAnimationFrame(frame);
      }
    };
    rafIdRef.current = requestAnimationFrame(frame);

    if (streakMilestone) {
      setTimeout(() => {
        fireConfetti({ particleCount: 60, spread: 100, origin: { y: 0.6 }, colors: ['#FF6B35', '#FFE135', '#FF1493'] });
      }, 500);
    }

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isNewCompletion, score, streakMilestone, skipConfetti]);

  return {
    currentUserRank,
    totalPlayers,
    handleCurrentUserRankChange,
    setTotalPlayers,
    fireRankConfettiLocal,
  };
}
