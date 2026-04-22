'use client';

import { useState, useEffect, useCallback } from 'react';
import { fireFirstWinConfetti } from '@/utils/confettiUtils';
import { hapticGameWin } from '@/utils/haptics';
import { addCoins, FIRST_WIN_BONUS } from '@/utils/coinManager';

const FIRST_WIN_KEY = 'lexiclash_first_win_celebrated';

interface UseFirstWinCelebrationProps {
  isWinner: boolean;
  gamesPlayed?: number;
  isMultiplayer?: boolean;
}

interface UseFirstWinCelebrationReturn {
  showCelebration: boolean;
  dismissCelebration: () => void;
}

/**
 * Hook to trigger a special celebration on first-time win
 * Shows epic confetti burst and haptic feedback
 */
export function useFirstWinCelebration({
  isWinner,
  gamesPlayed = 0,
  isMultiplayer = true,
}: UseFirstWinCelebrationProps): UseFirstWinCelebrationReturn {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Only trigger for first multiplayer win (1 game played = this was their first)
    // Also check localStorage to ensure we only show once ever
    if (!isWinner || !isMultiplayer) return;

    const hasSeenCelebration = localStorage.getItem(FIRST_WIN_KEY) === 'true';
    if (hasSeenCelebration) return;

    // Check if this is truly their first win (gamesPlayed === 1 means this is first game)
    // If gamesPlayed is 0 or undefined, also trigger (might be a guest)
    if (gamesPlayed > 1) return;

    // Mark as celebrated
    localStorage.setItem(FIRST_WIN_KEY, 'true');
    setShowCelebration(true);

    addCoins(FIRST_WIN_BONUS, 'First Win Bonus');

    // Epic confetti burst using centralized utility
    fireFirstWinConfetti(4000);

    // Trigger haptic feedback
    hapticGameWin();

    // Auto-dismiss after animation
    const timeout = setTimeout(() => {
      setShowCelebration(false);
    }, 6000);

    return () => clearTimeout(timeout);
  }, [isWinner, gamesPlayed, isMultiplayer]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  return { showCelebration, dismissCelebration };
}

export default useFirstWinCelebration;
