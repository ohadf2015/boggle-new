'use client';

import { useEffect, useReducer } from 'react';
import type { Socket } from 'socket.io-client';
import { VOCAB_QUIZ_EVENTS, type VocabQuizStateSnapshot } from '@/shared/types/vocabQuiz';
import {
  IDLE_ROUND_STATE,
  isRoundLive,
  reduceRoundSignal,
  shouldShowTeacherStrip,
} from './teacherStripVisibility';

interface UseTeacherStripStateInput {
  socket: Socket | null | undefined;
  isActive: boolean;
  isHost: boolean;
  isClassroomMode: boolean;
  showResults: boolean;
  /**
   * The shell's Zustand `gameActive`. Kept in the OR purely so nothing that
   * already worked regresses — it is never true on the host path, which is
   * exactly why this hook exists.
   */
  storeGameActive?: boolean;
}

export interface TeacherStripState {
  /** Mount the control strip. */
  visible: boolean;
  /** A live Vocab Quiz owns the room: "skip" means the question, not a board word. */
  quizRound: boolean;
  /** The quiz's own pause flag — the board pause store never sees it. */
  quizPaused: boolean;
}

/**
 * Live round state for the teacher's control strip, read from the server.
 *
 * Listens on the SHARED socket that `useHostGameEvents` also binds, so every
 * listener is removed by handler reference on cleanup — a bare
 * `socket.off('startGame')` here would take the host's own game handler with
 * it and kill the round.
 */
export function useTeacherStripState({
  socket,
  isActive,
  isHost,
  isClassroomMode,
  showResults,
  storeGameActive = false,
}: UseTeacherStripStateInput): TeacherStripState {
  const [round, signal] = useReducer(reduceRoundSignal, IDLE_ROUND_STATE);

  useEffect(() => {
    if (!socket) return;

    const onStart = () => signal({ type: 'boardStart' });
    const onTick = (payload: { remainingTime?: number } | undefined) =>
      signal({ type: 'boardTick', remainingTime: payload?.remainingTime });
    const onEnd = () => signal({ type: 'boardEnd' });
    const onReset = () => signal({ type: 'boardReset' });
    const onQuizQuestion = () => signal({ type: 'quizQuestion' });
    const onQuizSnapshot = (payload: Partial<VocabQuizStateSnapshot> | undefined) =>
      signal({ type: 'quizSnapshot', phase: payload?.phase ?? 'ended', paused: !!payload?.paused });
    const onQuizPaused = (payload: { paused?: boolean } | undefined) =>
      signal({ type: 'quizPaused', paused: !!payload?.paused });
    const onQuizEnded = () => signal({ type: 'quizEnded' });

    socket.on('startGame', onStart);
    socket.on('timeUpdate', onTick);
    socket.on('endGame', onEnd);
    socket.on('resetGame', onReset);
    socket.on(VOCAB_QUIZ_EVENTS.question, onQuizQuestion);
    socket.on(VOCAB_QUIZ_EVENTS.reveal, onQuizQuestion);
    socket.on(VOCAB_QUIZ_EVENTS.state, onQuizSnapshot);
    socket.on(VOCAB_QUIZ_EVENTS.paused, onQuizPaused);
    socket.on(VOCAB_QUIZ_EVENTS.ended, onQuizEnded);

    // A teacher who reloads mid-quiz gets no further `question` event until the
    // next one starts — up to a minute of a bare screen. Ask for the snapshot.
    const askForQuiz = () => socket.emit(VOCAB_QUIZ_EVENTS.requestState);
    socket.on('connect', askForQuiz);
    askForQuiz();

    return () => {
      socket.off('startGame', onStart);
      socket.off('timeUpdate', onTick);
      socket.off('endGame', onEnd);
      socket.off('resetGame', onReset);
      socket.off(VOCAB_QUIZ_EVENTS.question, onQuizQuestion);
      socket.off(VOCAB_QUIZ_EVENTS.reveal, onQuizQuestion);
      socket.off(VOCAB_QUIZ_EVENTS.state, onQuizSnapshot);
      socket.off(VOCAB_QUIZ_EVENTS.paused, onQuizPaused);
      socket.off(VOCAB_QUIZ_EVENTS.ended, onQuizEnded);
      socket.off('connect', askForQuiz);
    };
  }, [socket]);

  return {
    visible: shouldShowTeacherStrip({
      isActive,
      isHost,
      isClassroomMode,
      showResults,
      roundLive: isRoundLive(round) || storeGameActive,
    }),
    quizRound: round.quizRound,
    quizPaused: round.quizPaused,
  };
}

export default useTeacherStripState;
