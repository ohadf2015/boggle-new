'use client';

/** DEV-ONLY: `?preview=quizphone&state=question|correct|wrong|ended|swap[&host=1]` drives the real quiz views from a scripted socket. */
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { VocabQuizView } from '@/components/education/vocabQuiz/VocabQuizView';
import { VocabQuizHostView } from '@/components/education/vocabQuiz/VocabQuizHostView';
import { VOCAB_QUIZ_EVENTS, type VocabQuizStanding } from '@/shared/types/vocabQuiz';

type Handler = (payload: unknown) => void;
type QuizState = 'question' | 'correct' | 'wrong' | 'ended' | 'swap';
type Step = [event: string, payload: unknown, atMs?: number];

const CHOICES = ['fragile', 'enormous', 'quiet', 'ancient'];
const STANDINGS: VocabQuizStanding[] = [
  { username: 'Maya', score: 820, streak: 4, bestStreak: 4, correctCount: 7 },
  { username: 'Leo', score: 640, streak: 0, bestStreak: 3, correctCount: 5 },
  { username: 'Noa', score: 590, streak: 1, bestStreak: 2, correctCount: 5 },
  { username: 'Ari', score: 300, streak: 0, bestStreak: 1, correctCount: 3 },
];
const SWAPPED: VocabQuizStanding[] = [
  { username: 'Leo', score: 860, streak: 1, bestStreak: 3, correctCount: 6 },
  { username: 'Maya', score: 840, streak: 0, bestStreak: 4, correctCount: 7 },
  { username: 'Noa', score: 590, streak: 0, bestStreak: 2, correctCount: 5 },
  { username: 'Ari', score: 300, streak: 0, bestStreak: 1, correctCount: 3 },
];
const SWAP_GAP_MS = 1500;

function script(state: QuizState): Step[] {
  const gameCode = 'PREVIEW';
  const question = {
    gameCode, index: 2, total: 8, focus: 'definition', prompt: 'brittle', choices: CHOICES,
    limitMs: 20_000, remainingMs: 14_000, serverNow: Date.now(),
  };
  if (state === 'question') return [[VOCAB_QUIZ_EVENTS.question, question]];
  const correct = state !== 'wrong';
  const answerResult = {
    index: 2, correct, choiceIndex: correct ? 0 : 1, points: correct ? 140 : 0, speedBonus: 40, streakBonus: 0,
    streak: correct ? 3 : 0, totalScore: 640,
  };
  const reveal = {
    gameCode, index: 2, total: 8, answerIndex: 0, answer: 'fragile', word: 'brittle',
    definition: 'hard but easily broken', distribution: [9, 4, 1, 0], standings: STANDINGS, nextInMs: 3_000, isLast: false,
  };
  const steps: Step[] = [[VOCAB_QUIZ_EVENTS.question, question], [VOCAB_QUIZ_EVENTS.answerResult, answerResult], [VOCAB_QUIZ_EVENTS.reveal, reveal]];
  if (state === 'swap') {
    steps.push([VOCAB_QUIZ_EVENTS.question, { ...question, index: 3, prompt: 'vast' }, SWAP_GAP_MS]);
    steps.push([VOCAB_QUIZ_EVENTS.reveal, { ...reveal, index: 3, word: 'vast', standings: SWAPPED }, SWAP_GAP_MS * 2]);
  }
  if (state === 'ended') steps.push([VOCAB_QUIZ_EVENTS.ended, { gameCode, standings: STANDINGS, totalQuestions: 8, missed: [] }]);
  return steps;
}

function scriptedSocket(state: QuizState): Socket {
  const handlers = new Map<string, Set<Handler>>();
  const fire = (event: string, payload: unknown) => handlers.get(event)?.forEach((h) => h(payload));
  let played = false;
  const socket = {
    on(event: string, h: Handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(h);
      return socket;
    },
    off(event: string, h: Handler) {
      handlers.get(event)?.delete(h);
      return socket;
    },
    emit(event: string) {
      if (event !== VOCAB_QUIZ_EVENTS.requestState || played) return socket;
      played = true;
      const steps = script(state);
      queueMicrotask(() => steps.filter(([, , at]) => !at).forEach(([e, p]) => fire(e, p)));
      steps.filter(([, , at]) => at).forEach(([e, p, at]) => setTimeout(() => fire(e, p), at));
      return socket;
    },
  };
  return socket as unknown as Socket;
}

function readState(value: string | null | undefined): QuizState {
  return value === 'question' || value === 'correct' || value === 'ended' || value === 'swap' ? value : 'wrong';
}

export function StudentQuizPreview() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const state = readState(params?.get('state'));
  const host = params?.get('host') === '1';
  const socket = useMemo(() => scriptedSocket(state), [state]);
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-neo-navy">
      {host ? (
        <VocabQuizHostView socket={socket} joinCode="YHNCF4" playerCount={STANDINGS.length} t={t} />
      ) : (
        <VocabQuizView socket={socket} username="Leo" t={t} />
      )}
    </div>
  );
}
