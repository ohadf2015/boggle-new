'use client';

/** DEV-ONLY: `/student/play/preview?state=question|picked|timeup|correct|wrong|sweep` drives the real student quiz screen from a scripted socket. */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { VocabQuizView } from '@/components/education/vocabQuiz/VocabQuizView';
import { VOCAB_QUIZ_EVENTS, type VocabQuizStanding } from '@/shared/types/vocabQuiz';

type Handler = (payload: unknown) => void;
type PlayState = 'question' | 'picked' | 'timeup' | 'correct' | 'wrong' | 'sweep';

// The server's grace between the buzzer and the reveal.
const REVEAL_GRACE_MS = 1_500;

const STANDINGS: VocabQuizStanding[] = [
  { username: 'Maya', score: 820, streak: 4, bestStreak: 4, correctCount: 7 },
  { username: 'Leo', score: 640, streak: 3, bestStreak: 3, correctCount: 5 },
  { username: 'Noa', score: 590, streak: 1, bestStreak: 2, correctCount: 5 },
  { username: 'Ari', score: 300, streak: 0, bestStreak: 1, correctCount: 3 },
];

const GAME_CODE = 'PREVIEW';

function remainingFor(state: PlayState): number {
  return state === 'timeup' ? 1_500 : 14_000;
}

function revealPayload(state: PlayState) {
  return {
    gameCode: GAME_CODE, index: 2, total: 8, answerIndex: 0, answer: 'fragile', word: 'brittle',
    definition: 'hard but easily broken', distribution: state === 'sweep' ? [4, 0, 0, 0] : [2, 1, 1, 0],
    standings: STANDINGS, nextInMs: 3_000, isLast: false,
  };
}

function script(state: PlayState): Array<[string, unknown]> {
  const gameCode = GAME_CODE;
  const question = {
    gameCode, index: 2, total: 8, focus: 'synonym', prompt: 'brittle',
    choices: ['fragile', 'enormous', 'quiet', 'ancient'],
    limitMs: 20_000, remainingMs: remainingFor(state), serverNow: Date.now(),
  };
  const steps: Array<[string, unknown]> = [[VOCAB_QUIZ_EVENTS.question, question]];
  // Six seconds in, a real room already has answers in: the server broadcasts the count on every lock-in.
  if (state === 'question' || state === 'picked' || state === 'timeup') {
    return [...steps, [VOCAB_QUIZ_EVENTS.lockIn, { gameCode, index: 2, locked: 2, total: 4, distribution: [1, 1, 0, 0] }]];
  }
  const correct = state !== 'wrong';
  steps.push([VOCAB_QUIZ_EVENTS.answerResult, {
    index: 2, correct, choiceIndex: correct ? 0 : 1, points: correct ? 140 : 0, speedBonus: 40, streakBonus: 0,
    streak: correct ? 3 : 0, totalScore: 640,
  }]);
  steps.push([VOCAB_QUIZ_EVENTS.reveal, revealPayload(state)]);
  return steps;
}

function scriptedSocket(state: PlayState): Socket {
  const handlers = new Map<string, Set<Handler>>();
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
      const fire = (e: string, p: unknown) => handlers.get(e)?.forEach((h) => h(p));
      queueMicrotask(() => script(state).forEach(([e, p]) => fire(e, p)));
      // Like the server, a live question resolves once the clock runs out, so no capture stalls on "the answer is coming".
      if (state === 'question' || state === 'picked' || state === 'timeup') {
        window.setTimeout(() => {
          // `picked` presses 2 ("enormous"), so its verdict is the wrong-answer sheet.
          if (state === 'picked') {
            fire(VOCAB_QUIZ_EVENTS.answerResult, {
              index: 2, correct: false, choiceIndex: 1, points: 0, speedBonus: 0, streakBonus: 0, streak: 0, totalScore: 640,
            });
          }
          fire(VOCAB_QUIZ_EVENTS.reveal, revealPayload(state));
        }, remainingFor(state) + REVEAL_GRACE_MS);
      }
      return socket;
    },
  };
  return socket as unknown as Socket;
}

function readState(value: string | null | undefined): PlayState {
  return value === 'picked' || value === 'timeup' || value === 'correct' || value === 'wrong' || value === 'sweep' ? value : 'question';
}

export default function StudentPlayPreviewClient() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const state = readState(params?.get('state'));
  const socket = useMemo(() => scriptedSocket(state), [state]);
  const { setIsInGame } = useNavigation();

  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // `picked` goes through the real key handler, so the capture proves the 1-4 keys too.
  useEffect(() => {
    if (state !== 'picked') return;
    const id = window.setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' })), 600);
    return () => window.clearTimeout(id);
  }, [state]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-neo-navy">
      <VocabQuizView socket={socket} username="Leo" t={t} onExit={() => toast('Preview: exit')} />
    </div>
  );
}
