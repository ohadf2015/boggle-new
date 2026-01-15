'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from './types';
import { fireConfetti } from '@/utils/confettiUtils';
import { hapticClueRevealed } from '@/utils/haptics';

export interface UseSurvivalCluesProps {
  targetWord: string;
  clueContainerRef: React.RefObject<HTMLDivElement | null>;
}

export interface ClueState {
  accumulatedClues: Map<number, AccumulatedClue>;
  knownLetters: Set<string>;
  isClueGaining: boolean;
}

export interface ClueActions {
  updateCluesFromFeedback: (feedback: LetterFeedback[], allAttempts: { feedback: LetterFeedback[] }[]) => void;
  updateCluesFromDiscovery: (word: string) => number;
  updateKnownLettersFromDiscovery: (word: string) => void;
  triggerClueGainAnimation: (cluesRevealed: number) => void;
  handleCoinRevealedLetter: (position: number) => void;
}

/**
 * Hook to manage clue accumulation from target guesses and word discoveries
 */
export function useSurvivalClues({
  targetWord,
  clueContainerRef,
}: UseSurvivalCluesProps): [ClueState, ClueActions] {
  const [accumulatedClues, setAccumulatedClues] = useState<Map<number, AccumulatedClue>>(new Map());
  const [knownLetters, setKnownLetters] = useState<Set<string>>(new Set());
  const [isClueGaining, setIsClueGaining] = useState(false);

  const normalizedTarget = targetWord.toUpperCase();

  // Count letters in target for handling duplicates (memoized to prevent useCallback deps from changing)
  const targetLetterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    normalizedTarget.split('').forEach(letter => {
      counts.set(letter, (counts.get(letter) || 0) + 1);
    });
    return counts;
  }, [normalizedTarget]);

  /**
   * Update clues from target word attempt feedback
   *
   * IMPORTANT: Only GREEN letters (exact position matches) are stored in accumulatedClues.
   * Yellow letters mean "exists but wrong position" - they go to knownLetters instead.
   * This is because accumulatedClues is keyed by TARGET WORD position, and yellow
   * feedback means the letter is NOT at the submitted position.
   */
  const updateCluesFromFeedback = useCallback((
    feedback: LetterFeedback[],
    allAttempts: { feedback: LetterFeedback[] }[]
  ) => {
    setAccumulatedClues(prev => {
      const updated = new Map(prev);

      // Only add GREEN letters - they represent confirmed positions in the target
      // Yellow letters are NOT stored here (they go to knownLetters only)
      feedback.forEach((fb) => {
        if (fb.feedback === 'green') {
          updated.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'green' });
        }
      });

      return updated;
    });

    // Update knownLetters
    setKnownLetters(prev => {
      const updated = new Set(prev);

      const allGreenCounts = new Map<string, number>();
      allAttempts.forEach((attempt) => {
        attempt.feedback.forEach((fb) => {
          if (fb.feedback === 'green') {
            const upper = fb.letter.toUpperCase();
            allGreenCounts.set(upper, (allGreenCounts.get(upper) || 0) + 1);
          }
        });
      });

      feedback.forEach((fb) => {
        if (fb.feedback === 'yellow') {
          const upperLetter = fb.letter.toUpperCase();
          const targetCount = targetLetterCounts.get(upperLetter) || 0;
          const greenCount = allGreenCounts.get(upperLetter) || 0;
          if (targetCount > greenCount) {
            updated.add(upperLetter);
          }
        }
      });

      allGreenCounts.forEach((greenCount, letter) => {
        const targetCount = targetLetterCounts.get(letter) || 0;
        if (greenCount >= targetCount) {
          updated.delete(letter);
        }
      });

      return updated;
    });
  }, [targetLetterCounts]);

  /**
   * Update clues from word discovery (3+ letter words can reveal positional clues)
   * Returns the number of clues revealed
   */
  const updateCluesFromDiscovery = useCallback((word: string): number => {
    const normalizedWord = word.toUpperCase();
    const targetLength = normalizedTarget.length;

    if (normalizedWord.length < 3) return 0;

    const checkLength = Math.min(normalizedWord.length, targetLength);
    let cluesRevealed = 0;

    setAccumulatedClues(prev => {
      const updated = new Map(prev);
      let newGreens = 0;

      // Only add GREEN clues - exact position matches between discovered word and target
      // Yellow letters (exist but wrong position) go to knownLetters, not accumulatedClues
      for (let pos = 0; pos < checkLength; pos++) {
        const wordLetter = normalizedWord[pos];
        const targetLetter = normalizedTarget[pos];

        if (wordLetter === targetLetter) {
          const existing = updated.get(pos);
          if (!existing || existing.type !== 'green') {
            updated.set(pos, { letter: wordLetter, type: 'green' });
            newGreens++;
          }
        }
      }

      cluesRevealed = newGreens;
      return updated;
    });

    return cluesRevealed;
  }, [normalizedTarget]);

  /**
   * Update known letters from word discovery
   */
  const updateKnownLettersFromDiscovery = useCallback((word: string) => {
    const normalizedWord = word.toUpperCase();

    if (normalizedWord.length < 3) return;

    setKnownLetters(prev => {
      const updated = new Set(prev);
      const usedCounts = new Map<string, number>();

      // Count existing GREEN letters
      const greenLetterCounts = new Map<string, number>();
      accumulatedClues.forEach((clue) => {
        if (clue.type === 'green') {
          greenLetterCounts.set(clue.letter, (greenLetterCounts.get(clue.letter) || 0) + 1);
        }
      });

      for (const letter of normalizedWord) {
        const targetCount = targetLetterCounts.get(letter) || 0;
        const greenCount = greenLetterCounts.get(letter) || 0;

        if (targetCount > 0 && targetCount > greenCount) {
          const used = usedCounts.get(letter) || 0;
          if (used < targetCount - greenCount) {
            usedCounts.set(letter, used + 1);
            updated.add(letter);
          }
        }
      }

      greenLetterCounts.forEach((greenCount, letter) => {
        const targetCount = targetLetterCounts.get(letter) || 0;
        if (greenCount >= targetCount) {
          updated.delete(letter);
        }
      });

      return updated;
    });
  }, [accumulatedClues, targetLetterCounts]);

  // Ref to track pending clue updates for batched calls
  const pendingCluesRef = useRef<Map<number, AccumulatedClue> | null>(null);

  /**
   * Handle letter revealed via coin purchase
   * - Adds a green clue at the revealed position
   * - Cleans up knownLetters if all occurrences of the letter are now revealed as green
   */
  const handleCoinRevealedLetter = useCallback((position: number) => {
    if (position < 0 || position >= normalizedTarget.length) return;

    const revealedLetter = normalizedTarget[position];

    setAccumulatedClues(prev => {
      // Start from pending or previous state
      const baseClues = pendingCluesRef.current || prev;
      const updatedClues = new Map(baseClues);

      // Add green clue at the revealed position
      updatedClues.set(position, { letter: revealedLetter, type: 'green' });

      // Store for potential next batched call
      pendingCluesRef.current = updatedClues;

      // Schedule clearing the ref after this batch of state updates
      queueMicrotask(() => {
        pendingCluesRef.current = null;
      });

      return updatedClues;
    });

    // Clean up knownLetters if all occurrences are now revealed
    setKnownLetters(prev => {
      const updated = new Set(prev);

      // Use the updatedClues we just calculated (via closure)
      // Count greens for the revealed letter from the updated clues
      let greenCount = 0;
      // Access the pending ref since it has the latest state
      const clues = pendingCluesRef.current || accumulatedClues;
      clues.forEach((clue) => {
        if (clue.letter === revealedLetter && clue.type === 'green') {
          greenCount++;
        }
      });

      const targetCount = targetLetterCounts.get(revealedLetter) || 0;
      if (greenCount >= targetCount) {
        updated.delete(revealedLetter);
      }

      return updated;
    });
  }, [normalizedTarget, targetLetterCounts, accumulatedClues]);

  /**
   * Trigger the clue gain animation with confetti
   */
  const triggerClueGainAnimation = useCallback((cluesRevealed: number) => {
    if (cluesRevealed <= 0) return;

    setIsClueGaining(true);
    setTimeout(() => setIsClueGaining(false), 800);

    hapticClueRevealed(cluesRevealed);

    if (clueContainerRef.current && typeof window !== 'undefined') {
      const rect = clueContainerRef.current.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;
      fireConfetti({
        particleCount: 12 + cluesRevealed * 4,
        spread: 45,
        startVelocity: 20,
        gravity: 0.8,
        ticks: 80,
        origin: { x: originX, y: originY },
        colors: ['#22c55e', '#4ade80', '#86efac', '#fde047'],
        scalar: 0.7,
      });
    }
  }, [clueContainerRef]);

  const state: ClueState = {
    accumulatedClues,
    knownLetters,
    isClueGaining,
  };

  const actions: ClueActions = {
    updateCluesFromFeedback,
    updateCluesFromDiscovery,
    updateKnownLettersFromDiscovery,
    triggerClueGainAnimation,
    handleCoinRevealedLetter,
  };

  return [state, actions];
}
