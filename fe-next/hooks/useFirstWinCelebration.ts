'use client';

import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { hapticGameWin } from '@/utils/haptics';

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

    // Epic confetti burst
    const duration = 4000;
    const end = Date.now() + duration;

    // Neo-brutalist color palette
    const colors = ['#FFE135', '#FF6B35', '#00D9FF', '#FF69B4', '#7C3AED', '#10B981'];

    const frame = () => {
      // Left side
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 200,
      });

      // Right side
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 200,
      });

      // Center burst every few frames
      if (Math.random() > 0.7) {
        confetti({
          particleCount: 10,
          angle: 90,
          spread: 120,
          origin: { x: 0.5, y: 0.5 },
          colors,
          startVelocity: 30,
          gravity: 0.6,
          ticks: 150,
        });
      }

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Start the confetti animation
    frame();

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
