/**
 * Live Vocab Quiz — the wire contract between the classroom quiz server loop
 * and both client surfaces (student phone, host projector).
 *
 * Deliberately NOT part of `GameMode` in shared/types/game.ts. A quiz has no
 * letter grid, no submitted words and no duplicate/rarity scoring, so widening
 * that union would drag it into `ALL_GAME_MODES` random rolls, quick-play
 * matchmaking and every `game.gameMode` branch in the board engine. It travels
 * instead as a classroom setting (`ClassroomGameSettings.gameMode`) and the
 * client learns a quiz is live from `vocabQuiz:state`.
 */

import type { VocabFocus, PracticeFocusSetting } from '@/lib/education/vocabFocus';
import type { GameMode } from './game';

export type { VocabFocus, PracticeFocusSetting };

/** Wire value for the fifth classroom mode. */
export const VOCAB_QUIZ_MODE = 'vocab-quiz' as const;
export type VocabQuizMode = typeof VOCAB_QUIZ_MODE;

/**
 * What a teacher may pick in the classroom wizard: the board modes plus the
 * quiz. Wider than `GameMode` on purpose — the quiz is not a board mode, and
 * this type keeps that distinction visible at the one layer that mixes them.
 */
export type ClassroomGameMode = GameMode | VocabQuizMode;

/**
 * The modes a teacher can actually pick in the classroom wizard, in wizard order.
 *
 * `GameMode` is wider (nine values) because it covers every board the app ships;
 * only these five are offered for a live class. That list existed twice — a local
 * `GAME_MODES` array in `components/education/ClassroomModeSettings.tsx` and a Zod
 * enum in `backend/handlers/classroomGameHandler.ts` — with nothing exported for a
 * third party to count, which is why marketing copy about "how many modes" had to
 * be typed by hand. `app/[locale]/education/__tests__/playFormats.test.ts` asserts
 * this array still agrees with both.
 */
export const CLASSROOM_GAME_MODES: readonly ClassroomGameMode[] = [
  'classic',
  'word-hunt',
  'blast',
  'wheel-rush',
  VOCAB_QUIZ_MODE,
] as const;

// ---------------------------------------------------------------------------
// Round shape
// ---------------------------------------------------------------------------

export const VOCAB_QUIZ_DEFAULT_QUESTION_COUNT = 10;
export const VOCAB_QUIZ_MIN_QUESTION_COUNT = 4;
export const VOCAB_QUIZ_MAX_QUESTION_COUNT = 30;

export const VOCAB_QUIZ_DEFAULT_SECONDS = 20;
export const VOCAB_QUIZ_MIN_SECONDS = 5;
export const VOCAB_QUIZ_MAX_SECONDS = 90;

/** The "answer reveal + standings" beat between questions. */
export const VOCAB_QUIZ_REVEAL_MS = 3_000;

export type VocabQuizPhase = 'question' | 'reveal' | 'ended';

// ---------------------------------------------------------------------------
// Server → client payloads
// ---------------------------------------------------------------------------

/**
 * One question as the students see it. `answerIndex` is deliberately absent —
 * it only ships in the reveal, so the answer is never sitting in a student's
 * devtools while the clock runs.
 */
export interface VocabQuizQuestionPayload {
  gameCode: string;
  /** 0-based. */
  index: number;
  total: number;
  focus: VocabFocus;
  prompt: string;
  choices: string[];
  /** Full length of this question's clock. */
  limitMs: number;
  /** How much of that clock is left right now (a late joiner gets less). */
  remainingMs: number;
  /** Server clock at emit, so a client can drift-correct its own countdown. */
  serverNow: number;
}

export interface VocabQuizStanding {
  username: string;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
}

export interface VocabQuizReveal {
  gameCode: string;
  index: number;
  total: number;
  answerIndex: number;
  answer: string;
  /** The lesson word this question drilled — what the teacher's report keys on. */
  word: string;
  definition?: string;
  /** Votes per choice index, for the host's distribution bars. */
  distribution: number[];
  standings: VocabQuizStanding[];
  /** ms until the next question starts. */
  nextInMs: number;
  /** True when this was the last question. */
  isLast: boolean;
}

/** Private per-student result for the question they just answered. */
export interface VocabQuizAnswerResult {
  index: number;
  correct: boolean;
  choiceIndex: number;
  points: number;
  speedBonus: number;
  streakBonus: number;
  streak: number;
  totalScore: number;
}

/**
 * Full snapshot — the reconnect / late-join payload. One shape covers "quiz is
 * running", "we're between questions" and "it's over", so a refreshing student
 * restores from exactly one event instead of guessing from three.
 */
export interface VocabQuizStateSnapshot {
  gameCode: string;
  active: boolean;
  phase: VocabQuizPhase;
  focus: PracticeFocusSetting;
  paused: boolean;
  index: number;
  total: number;
  serverNow: number;
  /** Present while `phase === 'question'`. */
  question?: VocabQuizQuestionPayload;
  /** Present while `phase === 'reveal'`. */
  reveal?: VocabQuizReveal;
  /** The viewer's own answer for the current question, if they already sent one. */
  myAnswer?: VocabQuizAnswerResult;
  myScore: number;
  myStreak: number;
  standings: VocabQuizStanding[];
}

export interface VocabQuizEnded {
  gameCode: string;
  standings: VocabQuizStanding[];
  totalQuestions: number;
}

// ---------------------------------------------------------------------------
// Client → server payloads
// ---------------------------------------------------------------------------

export interface VocabQuizAnswerPayload {
  /** Which question this answer is for — a late packet for question N-1 is dropped. */
  index: number;
  choiceIndex: number;
}

// ---------------------------------------------------------------------------
// Teacher setup
// ---------------------------------------------------------------------------

/** How many questions each focus can build from the teacher's current lesson. */
export type VocabQuizFocusAvailability = Record<VocabFocus, number>;

export interface VocabQuizSettings {
  focus: PracticeFocusSetting;
  questionCount: number;
  secondsPerQuestion: number;
}

export const VOCAB_QUIZ_DEFAULT_SETTINGS: VocabQuizSettings = {
  focus: 'any',
  questionCount: VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
  secondsPerQuestion: VOCAB_QUIZ_DEFAULT_SECONDS,
};

/** Socket event names, in one place so client and server cannot drift. */
export const VOCAB_QUIZ_EVENTS = {
  question: 'vocabQuiz:question',
  reveal: 'vocabQuiz:reveal',
  state: 'vocabQuiz:state',
  answerResult: 'vocabQuiz:answerResult',
  ended: 'vocabQuiz:ended',
  paused: 'vocabQuiz:paused',
  answer: 'vocabQuiz:answer',
  requestState: 'vocabQuiz:requestState',
} as const;

/**
 * The translate function shape these components accept.
 *
 * Matches how `LanguageContext.t` is actually called with parameters —
 * `t(path, params)` — which is also the prop type the multiplayer shell passes
 * down. The context's own `t` additionally accepts a string fallback in the
 * middle position; this narrower type is the subset every caller here uses.
 */
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;
