'use client';

import { useState, useEffect, useRef } from 'react';
import type { FlashChallenge } from '@/types/adventure';
import { getFlashChallengeForWorld } from '@/lib/adventure/flashChallengeConfig';

interface UseFlashChallengeProps {
  worldId: number;
  totalTimeSeconds: number;
  timeRemaining: number;
  wordsFound: string[];
  isPlaying: boolean;
}

interface UseFlashChallengeReturn {
  activeChallenge: FlashChallenge | null;
  isChallengeComplete: boolean;
  dismiss: () => void;
}

export function useFlashChallenge({
  worldId,
  totalTimeSeconds,
  timeRemaining,
  wordsFound,
  isPlaying,
}: UseFlashChallengeProps): UseFlashChallengeReturn {
  const [activeChallenge, setActiveChallenge] = useState<FlashChallenge | null>(null);
  const [isChallengeComplete, setIsChallengeComplete] = useState(false);
  const hasTriggered = useRef(false);
  const challengeStartWords = useRef<string[]>([]);

  // Trigger at 30% elapsed
  useEffect(() => {
    if (!isPlaying || hasTriggered.current || activeChallenge) return;
    const elapsed = totalTimeSeconds - timeRemaining;
    const pct = elapsed / totalTimeSeconds;
    if (pct >= 0.30) {
      hasTriggered.current = true;
      const candidates = getFlashChallengeForWorld(worldId);
      const challenge = candidates[Math.floor(Math.random() * candidates.length)];
      setActiveChallenge(challenge);
      challengeStartWords.current = [...wordsFound];
    }
  }, [timeRemaining, isPlaying, totalTimeSeconds, worldId, activeChallenge, wordsFound]);

  // Auto-dismiss after durationSeconds
  useEffect(() => {
    if (!activeChallenge || isChallengeComplete) return;
    const timer = setTimeout(() => {
      setActiveChallenge(null);
    }, activeChallenge.durationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [activeChallenge, isChallengeComplete]);

  // Check completion
  useEffect(() => {
    if (!activeChallenge || isChallengeComplete) return;
    const newWords = wordsFound.filter(w => !challengeStartWords.current.includes(w));
    let complete = false;
    if (activeChallenge.type === 'longWord') {
      const minLen = activeChallenge.param as number;
      complete = newWords.some(w => w.length >= minLen);
    } else if (activeChallenge.type === 'specificLetter') {
      const letter = (activeChallenge.param as string).toUpperCase();
      complete = newWords.some(w => w.toUpperCase().includes(letter));
    } else if (activeChallenge.type === 'comboStreak') {
      complete = newWords.length >= (activeChallenge.param as number);
    }
    if (complete) setIsChallengeComplete(true);
  }, [wordsFound, activeChallenge, isChallengeComplete]);

  const dismiss = () => {
    setActiveChallenge(null);
    setIsChallengeComplete(false);
  };

  return { activeChallenge, isChallengeComplete, dismiss };
}
