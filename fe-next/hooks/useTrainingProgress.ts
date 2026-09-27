'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TrainingSkillId } from '@/components/training';
import { triggerHaptic } from '@/utils/hapticFeedback';

const TARGET_SCORE = 15;
const TARGET_WORDS = 5;

interface TrainingProgressState {
  /** Set of completed skill IDs */
  completedSkills: Set<TrainingSkillId>;
  /** Skill that was just unlocked (for celebration animation) */
  justUnlocked: TrainingSkillId | null;
  /** Whether all skills are complete */
  isComplete: boolean;
}

interface UseTrainingProgressOptions {
  /** Is training mode enabled? */
  enabled: boolean;
  /** Called when a skill is unlocked */
  onSkillUnlock?: (skillId: TrainingSkillId) => void;
  /** Called when all skills are complete */
  onComplete?: () => void;
}

interface UseTrainingProgressReturn {
  /** Current completed skills */
  completedSkills: Set<TrainingSkillId>;
  /** Ref for stable reads in effects without triggering re-renders */
  completedSkillsRef: React.RefObject<Set<TrainingSkillId>>;
  /** Skill that was just unlocked */
  justUnlocked: TrainingSkillId | null;
  /** Whether training is complete */
  isComplete: boolean;
  /** Clear the justUnlocked state (after animation) */
  clearJustUnlocked: () => void;
  /** Update progress based on game state */
  updateProgress: (params: {
    score: number;
    wordsFound: number;
    hasDiagonal: boolean;
    hasDirectionChange: boolean;
  }) => void;
  /** Track a word path for skill detection */
  trackPath: (cells: Array<{ row: number; col: number }>) => void;
  /** Track a valid word submission */
  trackValidWord: (wordLength: number) => void;
}

/**
 * useTrainingProgress - Tracks 5 clear training skills
 *
 * Skills:
 * 1. firstWord - Find your first valid word
 * 2. diagonal - Use diagonal movement
 * 3. directionChange - Change direction mid-word
 * 4. targetScore - Score 15+ points
 * 5. fiveWords - Find 5+ words total
 */
export function useTrainingProgress(options: UseTrainingProgressOptions): UseTrainingProgressReturn {
  const { enabled, onSkillUnlock, onComplete } = options;

  // State
  const [completedSkills, setCompletedSkills] = useState<Set<TrainingSkillId>>(new Set());
  const [justUnlocked, setJustUnlocked] = useState<TrainingSkillId | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Refs for tracking progress
  const wordsFoundRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const hasDiagonalRef = useRef<boolean>(false);
  const hasDirectionChangeRef = useRef<boolean>(false);
  const hasCalledCompleteRef = useRef<boolean>(false);

  // Ref to track completed skills without causing re-renders when read
  const completedSkillsRef = useRef<Set<TrainingSkillId>>(completedSkills);

  /**
   * Unlock a skill if not already unlocked
   */
  const unlockSkill = useCallback((skillId: TrainingSkillId) => {
    // Early return using ref to avoid state update if already unlocked
    if (completedSkillsRef.current.has(skillId)) return;

    setCompletedSkills((prev) => {
      if (prev.has(skillId)) return prev;

      const next = new Set(prev);
      next.add(skillId);
      completedSkillsRef.current = next; // Keep ref in sync

      // Trigger celebration
      setJustUnlocked(skillId);
      triggerHaptic('success');
      onSkillUnlock?.(skillId);

      // Check if all skills complete
      if (next.size === 5 && !hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true;
        setIsComplete(true);
        onComplete?.();
      }

      return next;
    });
  }, [onSkillUnlock, onComplete]);

  /**
   * Clear justUnlocked state (call after animation completes)
   */
  const clearJustUnlocked = useCallback(() => {
    setJustUnlocked(null);
  }, []);

  /**
   * Track a word path for diagonal and direction change detection
   */
  const trackPath = useCallback((cells: Array<{ row: number; col: number }>) => {
    if (!enabled || cells.length < 2) return;

    let hasDiagonal = false;
    let directionChanges = 0;
    let lastDirection: string | null = null;

    for (let i = 1; i < cells.length; i++) {
      const dr = cells[i].row - cells[i - 1].row;
      const dc = cells[i].col - cells[i - 1].col;

      // Determine direction type
      let currentDirection: string;
      if (dr === 0 && dc !== 0) {
        currentDirection = 'horizontal';
      } else if (dc === 0 && dr !== 0) {
        currentDirection = 'vertical';
      } else {
        hasDiagonal = true;
        currentDirection = `diagonal-${dr > 0 ? 'd' : 'u'}${dc > 0 ? 'r' : 'l'}`;
      }

      // Count direction changes
      if (lastDirection && lastDirection !== currentDirection) {
        directionChanges++;
      }
      lastDirection = currentDirection;
    }

    // Update refs
    if (hasDiagonal) hasDiagonalRef.current = true;
    if (directionChanges > 0) hasDirectionChangeRef.current = true;

    // Check for skill unlocks
    if (hasDiagonalRef.current) {
      unlockSkill('diagonal');
    }
    if (hasDirectionChangeRef.current) {
      unlockSkill('directionChange');
    }
  }, [enabled, unlockSkill]);

  /**
   * Track a valid word submission
   */
  const trackValidWord = useCallback((wordLength: number) => {
    if (!enabled) return;

    wordsFoundRef.current++;

    // First word skill
    if (wordsFoundRef.current === 1) {
      unlockSkill('firstWord');
    }

    // Five words skill
    if (wordsFoundRef.current >= TARGET_WORDS) {
      unlockSkill('fiveWords');
    }
  }, [enabled, unlockSkill]);

  /**
   * Update progress based on current game state
   */
  const updateProgress = useCallback((params: {
    score: number;
    wordsFound: number;
    hasDiagonal: boolean;
    hasDirectionChange: boolean;
  }) => {
    if (!enabled) return;

    // Update refs
    scoreRef.current = params.score;
    wordsFoundRef.current = params.wordsFound;
    if (params.hasDiagonal) hasDiagonalRef.current = true;
    if (params.hasDirectionChange) hasDirectionChangeRef.current = true;

    // Check score skill
    if (params.score >= TARGET_SCORE) {
      unlockSkill('targetScore');
    }

    // Check word count skills
    if (params.wordsFound >= 1) {
      unlockSkill('firstWord');
    }
    if (params.wordsFound >= TARGET_WORDS) {
      unlockSkill('fiveWords');
    }

    // Check direction skills
    if (params.hasDiagonal) {
      unlockSkill('diagonal');
    }
    if (params.hasDirectionChange) {
      unlockSkill('directionChange');
    }
  }, [enabled, unlockSkill]);

  // Reset state when disabled
  useEffect(() => {
    if (!enabled) {
      const emptySet = new Set<TrainingSkillId>();
      setCompletedSkills(emptySet);
      completedSkillsRef.current = emptySet;
      setJustUnlocked(null);
      setIsComplete(false);
      wordsFoundRef.current = 0;
      scoreRef.current = 0;
      hasDiagonalRef.current = false;
      hasDirectionChangeRef.current = false;
      hasCalledCompleteRef.current = false;
    }
  }, [enabled]);

  return {
    completedSkills,
    completedSkillsRef, // Expose ref for stable reads in effects
    justUnlocked,
    isComplete,
    clearJustUnlocked,
    updateProgress,
    trackPath,
    trackValidWord,
  };
}

export default useTrainingProgress;
