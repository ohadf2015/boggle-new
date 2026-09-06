/**
 * Live Vocab Quiz — client socket state.
 *
 * One hook drives both surfaces (student phone, host projector). It holds no
 * scoring logic of its own: every number here arrived from the server, because
 * a client that recomputes "the same" score drifts from it (Class 3 in
 * .claude/rules/60-recurring-pitfalls.md).
 *
 * The countdown is the one thing computed locally, and only as a render
 * convenience: it is re-anchored to the server clock on every question, reveal
 * and reconnect, so it can never wander far.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  VOCAB_QUIZ_EVENTS,
  type VocabQuizQuestionPayload,
  type VocabQuizReveal,
  type VocabQuizStateSnapshot,
  type VocabQuizAnswerResult,
  type VocabQuizStanding,
  type VocabQuizEnded,
  type VocabQuizPhase,
} from '@/shared/types/vocabQuiz';

export interface VocabQuizClientState {
  phase: VocabQuizPhase | 'idle';
  paused: boolean;
  question: VocabQuizQuestionPayload | null;
  reveal: VocabQuizReveal | null;
  standings: VocabQuizStanding[];
  /** This viewer's answer for the CURRENT question, once the server scored it. */
  myAnswer: VocabQuizAnswerResult | null;
  /** The choice tapped but not yet scored — locks the buttons without judging them. */
  pendingChoice: number | null;
  myScore: number;
  myStreak: number;
  /** Whole seconds left on the current question. */
  secondsLeft: number;
  /** 0..1 — drives the timer bar width. */
  fractionLeft: number;
  totalQuestions: number;
  questionNumber: number;
  finished: boolean;
}

const IDLE: VocabQuizClientState = {
  phase: 'idle',
  paused: false,
  question: null,
  reveal: null,
  standings: [],
  myAnswer: null,
  pendingChoice: null,
  myScore: 0,
  myStreak: 0,
  secondsLeft: 0,
  fractionLeft: 1,
  totalQuestions: 0,
  questionNumber: 0,
  finished: false,
};

export interface UseVocabQuizResult extends VocabQuizClientState {
  /** Send an answer. Ignored once this question is already answered. */
  answer: (choiceIndex: number) => void;
  /** True once a quiz has been seen on this socket — the cue to render the quiz UI. */
  isQuizRoom: boolean;
}

export function useVocabQuiz(socket: Socket | null): UseVocabQuizResult {
  const [state, setState] = useState<VocabQuizClientState>(IDLE);
  const [isQuizRoom, setIsQuizRoom] = useState(false);

  /**
   * Deadline in LOCAL time. The server sends `serverNow` with every question,
   * so we translate once per question instead of trusting the two clocks to
   * agree — a device with a skewed clock would otherwise show a wrong timer.
   */
  const deadlineRef = useRef<number | null>(null);
  const limitRef = useRef<number>(1);

  const anchorClock = useCallback((remainingMs: number, limitMs: number) => {
    deadlineRef.current = Date.now() + remainingMs;
    limitRef.current = Math.max(1, limitMs);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onQuestion = (payload: VocabQuizQuestionPayload) => {
      setIsQuizRoom(true);
      anchorClock(payload.remainingMs, payload.limitMs);
      setState((prev) => ({
        ...prev,
        phase: 'question',
        paused: false,
        question: payload,
        reveal: null,
        // A new question clears the previous answer — without this the student
        // sees their old pick still locked in and cannot answer.
        myAnswer: null,
        pendingChoice: null,
        totalQuestions: payload.total,
        questionNumber: payload.index + 1,
        secondsLeft: Math.ceil(payload.remainingMs / 1000),
        fractionLeft: payload.remainingMs / Math.max(1, payload.limitMs),
        finished: false,
      }));
    };

    const onReveal = (payload: VocabQuizReveal) => {
      setIsQuizRoom(true);
      deadlineRef.current = null;
      setState((prev) => ({
        ...prev,
        phase: 'reveal',
        reveal: payload,
        standings: payload.standings,
        totalQuestions: payload.total,
        questionNumber: payload.index + 1,
        secondsLeft: 0,
        fractionLeft: 0,
      }));
    };

    const onAnswerResult = (payload: VocabQuizAnswerResult) => {
      setState((prev) => ({
        ...prev,
        myAnswer: payload,
        myScore: payload.totalScore,
        myStreak: payload.streak,
      }));
    };

    const onState = (snap: VocabQuizStateSnapshot) => {
      setIsQuizRoom(true);
      if (snap.question) anchorClock(snap.question.remainingMs, snap.question.limitMs);
      else deadlineRef.current = null;

      setState({
        phase: snap.phase,
        paused: snap.paused,
        question: snap.question ?? null,
        reveal: snap.reveal ?? null,
        standings: snap.standings,
        myAnswer: snap.myAnswer ?? null,
        pendingChoice: snap.myAnswer?.choiceIndex ?? null,
        myScore: snap.myScore,
        myStreak: snap.myStreak,
        secondsLeft: snap.question ? Math.ceil(snap.question.remainingMs / 1000) : 0,
        fractionLeft: snap.question ? snap.question.remainingMs / Math.max(1, snap.question.limitMs) : 0,
        totalQuestions: snap.total,
        questionNumber: snap.index + 1,
        finished: !snap.active,
      });
    };

    const onEnded = (payload: VocabQuizEnded) => {
      setIsQuizRoom(true);
      deadlineRef.current = null;
      setState((prev) => ({
        ...prev,
        phase: 'ended',
        question: null,
        standings: payload.standings,
        totalQuestions: payload.totalQuestions,
        secondsLeft: 0,
        fractionLeft: 0,
        finished: true,
      }));
    };

    const onPaused = ({ paused }: { paused: boolean }) => {
      setState((prev) => ({ ...prev, paused }));
    };

    const requestState = () => socket.emit(VOCAB_QUIZ_EVENTS.requestState);

    socket.on(VOCAB_QUIZ_EVENTS.question, onQuestion);
    socket.on(VOCAB_QUIZ_EVENTS.reveal, onReveal);
    socket.on(VOCAB_QUIZ_EVENTS.answerResult, onAnswerResult);
    socket.on(VOCAB_QUIZ_EVENTS.state, onState);
    socket.on(VOCAB_QUIZ_EVENTS.ended, onEnded);
    socket.on(VOCAB_QUIZ_EVENTS.paused, onPaused);
    // Ask on mount AND on every reconnect: a refresh mid-round must restore the
    // live question with the time actually left, not wait for the next one.
    socket.on('connect', requestState);
    requestState();

    return () => {
      socket.off(VOCAB_QUIZ_EVENTS.question, onQuestion);
      socket.off(VOCAB_QUIZ_EVENTS.reveal, onReveal);
      socket.off(VOCAB_QUIZ_EVENTS.answerResult, onAnswerResult);
      socket.off(VOCAB_QUIZ_EVENTS.state, onState);
      socket.off(VOCAB_QUIZ_EVENTS.ended, onEnded);
      socket.off(VOCAB_QUIZ_EVENTS.paused, onPaused);
      socket.off('connect', requestState);
    };
  }, [socket, anchorClock]);

  // Local countdown. Paused rounds freeze by re-anchoring on resume, so the
  // tick simply stops advancing rather than tracking a paused offset itself.
  useEffect(() => {
    if (state.phase !== 'question' || state.paused) return;
    const id = setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const remainingMs = Math.max(0, deadline - Date.now());
      setState((prev) => ({
        ...prev,
        secondsLeft: Math.ceil(remainingMs / 1000),
        fractionLeft: remainingMs / limitRef.current,
      }));
    }, 100);
    return () => clearInterval(id);
  }, [state.phase, state.paused, state.questionNumber]);

  const answer = useCallback(
    (choiceIndex: number) => {
      if (!socket || !state.question || state.myAnswer || state.pendingChoice !== null || state.paused) return;
      socket.emit(VOCAB_QUIZ_EVENTS.answer, { index: state.question.index, choiceIndex });
      // Lock the buttons on the tap itself. The server's `answerResult` decides
      // right or wrong a moment later; until then the UI shows "locked in"
      // rather than guessing, so a correct answer never flashes red first.
      setState((prev) => (prev.pendingChoice === null ? { ...prev, pendingChoice: choiceIndex } : prev));
    },
    [socket, state.question, state.myAnswer, state.pendingChoice, state.paused]
  );

  return { ...state, answer, isQuizRoom };
}
