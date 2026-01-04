'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GridPosition } from '@/types';
import {
  updateSkillsFromPath,
  updateSkillsFromWord,
  getSkillGaps,
  getSkillSummary,
  getTrainingProgress,
  completeTrainingGame,
} from '@/utils/trainingProgressStorage';

// Minimum words before showing hints (give player a chance to explore)
const MIN_WORDS_BEFORE_HINTS = 2;

// Minimum time (ms) before showing a hint (don't overwhelm immediately)
const HINT_DELAY_MS = 5000;

// Time between showing different hints
const HINT_COOLDOWN_MS = 15000;

export type TrainingHintType = 'diagonal' | 'directionChange' | 'corners' | 'longWords';

export interface TrainingHint {
  type: TrainingHintType;
  priority: number; // Lower = higher priority
}

export interface UseTrainingAnalysisOptions {
  /** Is this a training/practice mode game? */
  enabled: boolean;
  /** Grid dimensions for coverage tracking */
  gridSize: { rows: number; cols: number };
  /** Called when training is complete (all skills demonstrated) */
  onTrainingComplete?: () => void;
}

export interface UseTrainingAnalysisReturn {
  /** Track a word path for skill analysis */
  trackPath: (cells: GridPosition[]) => void;

  /** Track a validated word for stats */
  trackValidWord: (wordLength: number) => void;

  /** Current hint to show (null if none) */
  currentHint: TrainingHintType | null;

  /** Dismiss current hint */
  dismissHint: () => void;

  /** Mark training game as complete */
  finishTraining: () => void;

  /** Get summary for post-game analysis */
  getSummary: () => ReturnType<typeof getSkillSummary>;

  /** Check if player has passed training */
  hasPassed: boolean;

  /** Current skill gaps */
  skillGaps: string[];
}

/**
 * useTrainingAnalysis - Real-time behavior analysis during training mode
 *
 * Tracks player interactions to:
 * 1. Detect skill gaps (diagonal movement, direction changes, etc.)
 * 2. Show contextual hints at appropriate times
 * 3. Determine when player has "passed" training
 * 4. Provide data for post-game analysis
 */
export function useTrainingAnalysis(options: UseTrainingAnalysisOptions): UseTrainingAnalysisReturn {
  const { enabled, gridSize, onTrainingComplete } = options;

  // State
  const [currentHint, setCurrentHint] = useState<TrainingHintType | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [skillGaps, setSkillGaps] = useState<string[]>([]);

  // Refs for timing
  const gameStartTimeRef = useRef<number>(Date.now());
  const lastHintTimeRef = useRef<number>(0);
  const wordsFoundRef = useRef<number>(0);
  const hintsShownRef = useRef<Set<TrainingHintType>>(new Set());
  const hasCalledCompleteRef = useRef<boolean>(false);

  // Update skill gaps periodically
  useEffect(() => {
    if (!enabled) return;

    const updateGaps = () => {
      const gaps = getSkillGaps();
      setSkillGaps(gaps);

      // Check if training is complete
      const progress = getTrainingProgress();
      if (progress.hasPassedTraining && !hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true;
        setHasPassed(true);
        onTrainingComplete?.();
      }
    };

    // Update immediately and then periodically
    updateGaps();
    const interval = setInterval(updateGaps, 2000);

    return () => clearInterval(interval);
  }, [enabled, onTrainingComplete]);

  /**
   * Determine which hint to show based on current gaps and context
   */
  const selectHint = useCallback((): TrainingHintType | null => {
    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;
    const timeSinceLastHint = now - lastHintTimeRef.current;

    // Don't show hints too early or too frequently
    if (timeSinceStart < HINT_DELAY_MS) return null;
    if (timeSinceLastHint < HINT_COOLDOWN_MS && lastHintTimeRef.current > 0) return null;

    // Don't show hints until player has tried a few words
    if (wordsFoundRef.current < MIN_WORDS_BEFORE_HINTS) return null;

    const gaps = getSkillGaps();

    // Priority order for hints (most impactful first)
    const hintPriority: TrainingHintType[] = [
      'directionChange', // Most important skill
      'diagonal',        // Second most important
      'corners',         // Encourages exploration
      'longWords',       // Performance optimization
    ];

    // Find first gap that hasn't been shown yet
    for (const hintType of hintPriority) {
      if (gaps.includes(hintType) && !hintsShownRef.current.has(hintType)) {
        return hintType;
      }
    }

    // If all hints shown but gaps remain, cycle through again
    for (const hintType of hintPriority) {
      if (gaps.includes(hintType)) {
        return hintType;
      }
    }

    return null;
  }, []);

  /**
   * Track a word path for skill analysis
   */
  const trackPath = useCallback((cells: GridPosition[]) => {
    if (!enabled || cells.length < 2) return;

    // Update persistent skills
    updateSkillsFromPath(cells, gridSize);

    // Update local skill gaps
    setSkillGaps(getSkillGaps());

    // Check if we should show a hint
    const hint = selectHint();
    if (hint && hint !== currentHint) {
      setCurrentHint(hint);
      lastHintTimeRef.current = Date.now();
      hintsShownRef.current.add(hint);
    }
  }, [enabled, gridSize, selectHint, currentHint]);

  /**
   * Track a validated word for stats
   */
  const trackValidWord = useCallback((wordLength: number) => {
    if (!enabled) return;

    wordsFoundRef.current++;
    updateSkillsFromWord(wordLength);

    // Update local state
    setSkillGaps(getSkillGaps());

    // Check if training is complete
    const progress = getTrainingProgress();
    if (progress.hasPassedTraining && !hasCalledCompleteRef.current) {
      hasCalledCompleteRef.current = true;
      setHasPassed(true);
      onTrainingComplete?.();
    }

    // Check if we should show a hint
    const hint = selectHint();
    if (hint && hint !== currentHint) {
      setCurrentHint(hint);
      lastHintTimeRef.current = Date.now();
      hintsShownRef.current.add(hint);
    }
  }, [enabled, selectHint, currentHint, onTrainingComplete]);

  /**
   * Dismiss current hint
   */
  const dismissHint = useCallback(() => {
    setCurrentHint(null);
  }, []);

  /**
   * Mark training game as complete
   */
  const finishTraining = useCallback(() => {
    if (!enabled) return;

    completeTrainingGame();

    // Update local state
    const progress = getTrainingProgress();
    setHasPassed(progress.hasPassedTraining);
    setSkillGaps(getSkillGaps());
  }, [enabled]);

  /**
   * Get summary for post-game analysis
   */
  const getSummary = useCallback(() => {
    return getSkillSummary();
  }, []);

  return {
    trackPath,
    trackValidWord,
    currentHint,
    dismissHint,
    finishTraining,
    getSummary,
    hasPassed,
    skillGaps,
  };
}
