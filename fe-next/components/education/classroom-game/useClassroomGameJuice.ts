'use client';

/**
 * useClassroomGameJuice — Manage in-game celebration effects
 *
 * Listens to socket events for:
 * - Score updates
 * - Correct answers
 * - Combo streaks
 *
 * Triggers:
 * - Sound stings (mode-specific)
 * - Bounded confetti bursts
 * - Visual feedback (score pop animations)
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useModeSting } from '@/hooks/useModeSting';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import type { InGameJuiceEventPayload } from './types';

export interface JuiceState {
  /** Student ID with active confetti/pop animation */
  recentScorerIds: Set<string>;
  /** Track which students have combo streaks */
  comboPlayers: Map<string, number>;
}

interface UseClassroomGameJuiceProps {
  socket: Socket | null;
  gameMode: ClassroomGameMode;
  isPlaying: boolean;
}

const CONFETTI_DURATION_MS = 800;
const COMBO_THRESHOLD = 3; // Combo alert after 3 consecutive correct answers

export function useClassroomGameJuice({
  socket,
  gameMode,
  isPlaying,
}: UseClassroomGameJuiceProps) {
  const { playModeSound } = useModeSting();
  const { playMatchFoundSound, playCoinCascadeSound } = useSoundEffects();
  const [juiceState, setJuiceState] = useState<JuiceState>({
    recentScorerIds: new Set(),
    comboPlayers: new Map(),
  });

  const timerRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up confetti timers on unmount
  useEffect(() => {
    const timerMap = timerRef.current;
    return () => {
      timerMap.forEach(timer => clearTimeout(timer));
      timerMap.clear();
    };
  }, []);

  /**
   * Handle a correct answer event — play sound, trigger confetti, update combo
   */
  const handleCorrectAnswer = useCallback(
    (payload: InGameJuiceEventPayload) => {
      const { studentId, studentName, points, comboLevel = 0 } = payload;

      // Play mode-specific sound sting
      playModeSound(gameMode, 'start');

      // Play secondary feedback sound
      if (comboLevel >= COMBO_THRESHOLD) {
        playCoinCascadeSound(); // Big combo celebration
      } else {
        playMatchFoundSound(); // Standard correct-answer sound
      }

      // Trigger confetti
      setJuiceState(prev => ({
        ...prev,
        recentScorerIds: new Set([...prev.recentScorerIds, studentId]),
        comboPlayers: new Map(
          prev.comboPlayers.set(studentId, comboLevel)
        ),
      }));

      // Auto-clear confetti after animation
      const existingTimer = timerRef.current.get(studentId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        setJuiceState(prev => {
          const newRecent = new Set(prev.recentScorerIds);
          newRecent.delete(studentId);
          return { ...prev, recentScorerIds: newRecent };
        });
        timerRef.current.delete(studentId);
      }, CONFETTI_DURATION_MS);

      timerRef.current.set(studentId, timer);
    },
    [gameMode, playModeSound, playMatchFoundSound, playCoinCascadeSound]
  );

  /**
   * Listen to socket events for in-game scoring
   */
  useEffect(() => {
    if (!socket || !isPlaying) return;

    // Define handlers that will be registered and cleaned up
    const handleCorrectAnswerEvent = (payload: InGameJuiceEventPayload) => {
      handleCorrectAnswer(payload);
    };

    const handleScoreUpdateEvent = (data: { playerId: string; newScore: number }) => {
      handleCorrectAnswer({
        studentId: data.playerId,
        studentName: '',
        points: 0,
        gameMode,
      });
    };

    const handleRoundEndEvent = () => {
      playCoinCascadeSound();
    };

    // Register listeners with exact function references for cleanup
    socket.on('correct_answer', handleCorrectAnswerEvent);
    socket.on('score_update', handleScoreUpdateEvent);
    socket.on('round_end', handleRoundEndEvent);

    // Cleanup with exact same function references
    return () => {
      socket.off('correct_answer', handleCorrectAnswerEvent);
      socket.off('score_update', handleScoreUpdateEvent);
      socket.off('round_end', handleRoundEndEvent);
    };
  }, [socket, isPlaying, gameMode, handleCorrectAnswer, playCoinCascadeSound]);

  return {
    recentScorerIds: juiceState.recentScorerIds,
    comboPlayers: juiceState.comboPlayers,
    /** Check if a student should have confetti animating right now */
    shouldShowConfetti: (studentId: string) => juiceState.recentScorerIds.has(studentId),
    /** Get combo level for a student (0 if none) */
    getComboLevel: (studentId: string) => juiceState.comboPlayers.get(studentId) || 0,
  };
}

export default useClassroomGameJuice;
