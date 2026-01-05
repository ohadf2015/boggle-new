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
const MIN_WORDS_BEFORE_HINTS = 1;

// Time (ms) without finding a word before showing a hint ("stuck" detection)
const STUCK_THRESHOLD_MS = 20000;

// Time between showing different hints
const HINT_COOLDOWN_MS = 30000;

// Maximum hints to show per session (prevent hint fatigue)
const MAX_HINTS_PER_SESSION = 3;

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
  const gameStartTimeRef = useRef<number>(0);
  const lastHintTimeRef = useRef<number>(0);
  const lastWordFoundTimeRef = useRef<number>(0);
  const wordsFoundRef = useRef<number>(0);
  const hintsShownRef = useRef<Set<TrainingHintType>>(new Set());
  const totalHintsShownRef = useRef<number>(0);
  const hasCalledCompleteRef = useRef<boolean>(false);

  // Initialize game start time when enabled
  useEffect(() => {
    if (enabled && gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, [enabled]);

  // Update skill gaps and check for stuck state periodically
  useEffect(() => {
    if (!enabled) return;

    const updateGapsAndCheckStuck = () => {
      const gaps = getSkillGaps();
      setSkillGaps(gaps);

      // Check if training is complete
      const progress = getTrainingProgress();
      if (progress.hasPassedTraining && !hasCalledCompleteRef.current) {
        hasCalledCompleteRef.current = true;
        setHasPassed(true);
        onTrainingComplete?.();
      }

      // Check if player is stuck and should see a hint
      const now = Date.now();
      const timeSinceLastWord = lastWordFoundTimeRef.current > 0
        ? now - lastWordFoundTimeRef.current
        : now - gameStartTimeRef.current;
      const timeSinceLastHint = now - lastHintTimeRef.current;

      // Only show hint if stuck and no recent hint shown
      if (
        wordsFoundRef.current >= MIN_WORDS_BEFORE_HINTS &&
        totalHintsShownRef.current < MAX_HINTS_PER_SESSION &&
        timeSinceLastWord >= STUCK_THRESHOLD_MS &&
        (timeSinceLastHint >= HINT_COOLDOWN_MS || lastHintTimeRef.current === 0)
      ) {
        // Only show the 2 most important hints
        const hintPriority: TrainingHintType[] = ['diagonal', 'directionChange'];
        for (const hintType of hintPriority) {
          if (gaps.includes(hintType) && !hintsShownRef.current.has(hintType)) {
            setCurrentHint(hintType);
            lastHintTimeRef.current = now;
            hintsShownRef.current.add(hintType);
            totalHintsShownRef.current++;
            break;
          }
        }
      }
    };

    // Update immediately and then periodically (every 5 seconds)
    updateGapsAndCheckStuck();
    const interval = setInterval(updateGapsAndCheckStuck, 5000);

    return () => clearInterval(interval);
  }, [enabled, onTrainingComplete]);

  /**
   * Determine which hint to show based on current gaps and context
   * Only shows hints when player appears stuck (20+ seconds since last word)
   * Limited to 2 key skills: diagonal and directionChange
   * Maximum 3 hints per session to prevent fatigue
   */
  const selectHint = useCallback((): TrainingHintType | null => {
    const now = Date.now();
    const timeSinceLastWord = lastWordFoundTimeRef.current > 0
      ? now - lastWordFoundTimeRef.current
      : now - gameStartTimeRef.current;
    const timeSinceLastHint = now - lastHintTimeRef.current;

    // Don't show hints until player has found at least one word
    if (wordsFoundRef.current < MIN_WORDS_BEFORE_HINTS) return null;

    // Don't exceed max hints per session (prevent hint fatigue)
    if (totalHintsShownRef.current >= MAX_HINTS_PER_SESSION) return null;

    // Only show hints when player is stuck (20+ seconds without finding a word)
    if (timeSinceLastWord < STUCK_THRESHOLD_MS) return null;

    // Don't show hints too frequently (30s cooldown)
    if (timeSinceLastHint < HINT_COOLDOWN_MS && lastHintTimeRef.current > 0) return null;

    const gaps = getSkillGaps();

    // Only show the 2 most important hints (diagonal and direction change)
    // Removed: corners and longWords (confusing, less impactful)
    const hintPriority: TrainingHintType[] = [
      'diagonal',        // Primary skill - swipe diagonally
      'directionChange', // Secondary skill - change direction mid-word
    ];

    // Find first gap that hasn't been shown yet
    for (const hintType of hintPriority) {
      if (gaps.includes(hintType) && !hintsShownRef.current.has(hintType)) {
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

    // Check if we should show a hint (only when stuck)
    const hint = selectHint();
    if (hint && hint !== currentHint) {
      setCurrentHint(hint);
      lastHintTimeRef.current = Date.now();
      hintsShownRef.current.add(hint);
      totalHintsShownRef.current++;
    }
  }, [enabled, gridSize, selectHint, currentHint]);

  /**
   * Track a validated word for stats
   */
  const trackValidWord = useCallback((wordLength: number) => {
    if (!enabled) return;

    wordsFoundRef.current++;
    // Track when word was found (resets "stuck" timer)
    lastWordFoundTimeRef.current = Date.now();
    updateSkillsFromWord(wordLength);

    // Update local state
    setSkillGaps(getSkillGaps());

    // Clear any current hint since player just found a word
    if (currentHint) {
      setCurrentHint(null);
    }

    // Check if training is complete
    const progress = getTrainingProgress();
    if (progress.hasPassedTraining && !hasCalledCompleteRef.current) {
      hasCalledCompleteRef.current = true;
      setHasPassed(true);
      onTrainingComplete?.();
    }
  }, [enabled, currentHint, onTrainingComplete]);

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
