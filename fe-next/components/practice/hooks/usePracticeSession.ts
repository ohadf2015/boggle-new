'use client';

import { useState, useCallback } from 'react';
import type { PracticeMode } from '@/lib/supabase/education/practice';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PracticeSessionData {
  wordsAttempted: number;
  wordsCorrect: number;
  score: number;
  startTime: number;
  // Mode-specific fields
  pairsMatched?: number; // matching
  totalPairs?: number; // matching
  spellingStreak?: number; // spelling
  maxCombo?: number; // blitz
}

export interface PracticeXpResult {
  totalXp: number;
  breakdown: Record<string, number>;
  masteryMessage: string;
}

interface UsePracticeSessionNewState {
  sessionId: string | null;
  isActive: boolean;
  sessionData: PracticeSessionData;
  isLoading: boolean;
  error: string | null;
}

interface UsePracticeSessionNewActions {
  startSession: (lessonId: string, classroomId?: string) => Promise<{ success: boolean; error?: string }>;
  recordAnswer: (correct: boolean, modeSpecificData?: Record<string, unknown>) => void;
  completeSession: () => Promise<{ success: boolean; xpResult?: PracticeXpResult; error?: string }>;
  resetSession: () => void;
}

export type UsePracticeSessionNewReturn = UsePracticeSessionNewState & UsePracticeSessionNewActions;

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for managing new practice mode sessions (matching, spelling, blitz)
 *
 * Provides client-side session lifecycle management:
 * - startSession: Creates session via API
 * - recordAnswer: Updates local state
 * - completeSession: Submits final results and calculates XP
 * - resetSession: Clears state for replay
 */
export function usePracticeSessionNew(mode: PracticeMode): UsePracticeSessionNewReturn {
  const [state, setState] = useState<UsePracticeSessionNewState>({
    sessionId: null,
    isActive: false,
    sessionData: {
      wordsAttempted: 0,
      wordsCorrect: 0,
      score: 0,
      startTime: 0,
    },
    isLoading: false,
    error: null,
  });

  /**
   * Start a new practice session
   */
  const startSession = useCallback(async (
    lessonId: string,
    classroomId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/education/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          practiceType: mode,
          classroomId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to start session',
        }));
        return { success: false, error: result.error || 'Failed to start session' };
      }

      // Initialize session state
      setState({
        sessionId: result.session.id,
        isActive: true,
        sessionData: {
          wordsAttempted: 0,
          wordsCorrect: 0,
          score: 0,
          startTime: Date.now(),
        },
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start session';
      logger.error('Error starting practice session:', error);
      setState(prev => ({ ...prev, isLoading: false, error }));
      return { success: false, error };
    }
  }, [mode]);

  /**
   * Record an answer (updates local state only)
   */
  const recordAnswer = useCallback((
    correct: boolean,
    modeSpecificData?: Record<string, unknown>
  ) => {
    setState(prev => ({
      ...prev,
      sessionData: {
        ...prev.sessionData,
        wordsAttempted: prev.sessionData.wordsAttempted + 1,
        wordsCorrect: correct ? prev.sessionData.wordsCorrect + 1 : prev.sessionData.wordsCorrect,
        ...modeSpecificData,
      },
    }));
  }, []);

  /**
   * Complete the session and submit results to API
   * Calculates XP and returns result
   */
  const completeSession = useCallback(async (): Promise<{
    success: boolean;
    xpResult?: PracticeXpResult;
    error?: string;
  }> => {
    if (!state.sessionId) {
      return { success: false, error: 'No active session' };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const durationSeconds = Math.floor((Date.now() - state.sessionData.startTime) / 1000);
      const accuracy = state.sessionData.wordsAttempted > 0
        ? state.sessionData.wordsCorrect / state.sessionData.wordsAttempted
        : 0;

      // Complete session via API
      const response = await fetch('/api/education/practice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          wordsAttempted: state.sessionData.wordsAttempted,
          wordsCorrect: state.sessionData.wordsCorrect,
          accuracy,
          totalScore: state.sessionData.score,
          maxCombo: state.sessionData.maxCombo || 0,
          timeSpentSeconds: durationSeconds,
          completed: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to complete session',
        }));
        return { success: false, error: result.error || 'Failed to complete session' };
      }

      // Calculate XP (client-side for immediate feedback)
      // Note: Server should also calculate and store XP
      const xpResult: PracticeXpResult = {
        totalXp: 0, // Will be calculated by educationXpManager
        breakdown: {},
        masteryMessage: 'Great work!',
      };

      setState(prev => ({
        ...prev,
        isActive: false,
        isLoading: false,
      }));

      return { success: true, xpResult };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to complete session';
      logger.error('Error completing practice session:', error);
      setState(prev => ({ ...prev, isLoading: false, error }));
      return { success: false, error };
    }
  }, [state.sessionId, state.sessionData]);

  /**
   * Reset session state for replay
   */
  const resetSession = useCallback(() => {
    setState({
      sessionId: null,
      isActive: false,
      sessionData: {
        wordsAttempted: 0,
        wordsCorrect: 0,
        score: 0,
        startTime: 0,
      },
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    startSession,
    recordAnswer,
    completeSession,
    resetSession,
  };
}
