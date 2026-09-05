/**
 * Live Vocab Quiz — round engine.
 *
 * A pure state machine over ONE round. No sockets, no timers, no Redis: every
 * time-dependent function takes `now`, so the handler owns the wall clock and
 * the tests can drive a whole round deterministically. Keeping the rules here
 * is what makes pause/advance and the reconnect payload testable at all.
 *
 * The engine is the sole authority on scoring. The student UI shows the
 * breakdown using the same pure helpers from `lib/education/vocabQuizScoring`,
 * but it never computes a total of its own — Class 3 in
 * .claude/rules/60-recurring-pitfalls.md is precisely that drift.
 */

import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  buildQuizQuestions,
  type FocusQuestion,
  type VocabFocus,
  type PracticeFocusSetting,
} from '@/lib/education/vocabQuizQuestions';
import { scoreAnswer, sortStandings } from '@/lib/education/vocabQuizScoring';
import {
  VOCAB_QUIZ_REVEAL_MS,
  VOCAB_QUIZ_MIN_SECONDS,
  VOCAB_QUIZ_MAX_SECONDS,
  VOCAB_QUIZ_MIN_QUESTION_COUNT,
  VOCAB_QUIZ_MAX_QUESTION_COUNT,
  type VocabQuizPhase,
  type VocabQuizQuestionPayload,
  type VocabQuizReveal,
  type VocabQuizStanding,
  type VocabQuizStateSnapshot,
  type VocabQuizAnswerResult,
} from '@/shared/types/vocabQuiz';

// ---------------------------------------------------------------------------
// Session shape
// ---------------------------------------------------------------------------

export interface QuizPlayer {
  username: string;
  /** Supabase auth id. Null for a guest — they play, but have no lesson progress. */
  userId: string | null;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  /** Lesson words this player got right, in order. Drives the teacher report. */
  correctWords: string[];
  /** Per-question detail, in order asked. Drives the teacher's report. */
  answers: Array<{ word: string; choiceIndex: number; correct: boolean; ms: number }>;
}

export interface QuizAnswer {
  choiceIndex: number;
  correct: boolean;
  points: number;
  speedBonus: number;
  streakBonus: number;
  elapsedMs: number;
}

export interface VocabQuizSession {
  gameCode: string;
  classroomId: string;
  questions: FocusQuestion[];
  focus: PracticeFocusSetting;
  focusUsed: PracticeFocusSetting | null;
  fallbackFrom: VocabFocus | null;
  limitMs: number;
  index: number;
  phase: VocabQuizPhase;
  /** Wall clock when the current question's timer began (or was last resumed). */
  questionStartedAt: number;
  paused: boolean;
  /** ms already elapsed on the current question when it was paused. */
  pausedElapsedMs: number;
  /** When the current reveal beat ends (absolute wall clock). */
  revealEndsAt: number;
  /** ms still owed on the reveal beat when it was paused. */
  pausedRevealMs: number;
  players: Map<string, QuizPlayer>;
  /** Answers for the CURRENT question only, keyed by username. */
  answers: Map<string, QuizAnswer>;
  startedAt: number;
}

export interface CreateQuizSessionInput {
  gameCode: string;
  classroomId: string;
  words: VocabularyWord[];
  focus: PracticeFocusSetting;
  questionCount: number;
  secondsPerQuestion: number;
  seed: number | string;
  now: number;
  /** Lesson language — improves distractor quality for English lessons. */
  language?: string;
}

const clampInt = (n: number, min: number, max: number, fallback: number): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
};

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function createQuizSession(input: CreateQuizSessionInput): VocabQuizSession {
  const count = clampInt(
    input.questionCount,
    VOCAB_QUIZ_MIN_QUESTION_COUNT,
    VOCAB_QUIZ_MAX_QUESTION_COUNT,
    VOCAB_QUIZ_MIN_QUESTION_COUNT
  );
  const seconds = clampInt(
    input.secondsPerQuestion,
    VOCAB_QUIZ_MIN_SECONDS,
    VOCAB_QUIZ_MAX_SECONDS,
    VOCAB_QUIZ_MIN_SECONDS
  );

  const { questions, focusUsed, fallbackFrom } = buildQuizQuestions(input.words, {
    focus: input.focus,
    count,
    seed: input.seed,
    language: input.language,
  });

  return {
    gameCode: input.gameCode,
    classroomId: input.classroomId,
    questions,
    focus: input.focus,
    focusUsed,
    fallbackFrom,
    limitMs: seconds * 1_000,
    index: 0,
    // A lesson with nothing playable is born finished rather than throwing —
    // the handler turns that into a visible "add definitions" message instead
    // of a socket error nobody sees.
    phase: questions.length === 0 ? 'ended' : 'question',
    questionStartedAt: input.now,
    paused: false,
    pausedElapsedMs: 0,
    revealEndsAt: 0,
    pausedRevealMs: 0,
    players: new Map(),
    answers: new Map(),
    startedAt: input.now,
  };
}

export function addQuizPlayer(
  session: VocabQuizSession,
  { username, userId }: { username: string; userId: string | null }
): QuizPlayer {
  const existing = session.players.get(username);
  if (existing) {
    // A reconnect can arrive with the auth id the first join lacked. Never
    // overwrite a known id with null — that would silently drop the student
    // out of the teacher's report.
    if (userId && !existing.userId) existing.userId = userId;
    return existing;
  }
  const player: QuizPlayer = {
    username,
    userId,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    correctWords: [],
    answers: [],
  };
  session.players.set(username, player);
  return player;
}

export function removeQuizPlayer(session: VocabQuizSession, username: string): void {
  session.players.delete(username);
  session.answers.delete(username);
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

function elapsedMs(session: VocabQuizSession, now: number): number {
  if (session.paused) return session.pausedElapsedMs;
  return Math.max(0, now - session.questionStartedAt);
}

export function questionRemainingMs(session: VocabQuizSession, now: number): number {
  return Math.max(0, session.limitMs - elapsedMs(session, now));
}

export function questionExpired(session: VocabQuizSession, now: number): boolean {
  if (session.paused) return false;
  return elapsedMs(session, now) >= session.limitMs;
}

export function pauseQuiz(session: VocabQuizSession, now: number): boolean {
  if (session.paused || session.phase === 'ended') return false;
  session.pausedElapsedMs = elapsedMs(session, now);
  // The reveal beat is an ABSOLUTE deadline, so freezing the round without
  // banking what it still owes would let a long pause expire it: on resume the
  // deadline is already past and the next question replaces the answer
  // instantly, so the class never sees the reveal they were paused on.
  session.pausedRevealMs =
    session.phase === 'reveal' ? Math.max(0, session.revealEndsAt - now) : 0;
  session.paused = true;
  return true;
}

export function resumeQuiz(session: VocabQuizSession, now: number): boolean {
  if (!session.paused) return false;
  // Rebase both deadlines so each resumes with exactly the time it had left,
  // rather than restarting the full clock or expiring instantly.
  session.questionStartedAt = now - session.pausedElapsedMs;
  if (session.phase === 'reveal') {
    session.revealEndsAt = now + session.pausedRevealMs;
  }
  session.pausedElapsedMs = 0;
  session.pausedRevealMs = 0;
  session.paused = false;
  return true;
}

// ---------------------------------------------------------------------------
// Answering
// ---------------------------------------------------------------------------

export interface SubmitAnswerInput {
  username: string;
  choiceIndex: number;
  /** Which question the client believes it is answering. */
  index: number;
  now: number;
}

/**
 * Score one answer, or return null when it must be ignored.
 *
 * Every rejection here is a normal race, not an error: a packet for the
 * previous question, a double tap, an answer that crossed the timer. The
 * caller tells the sender nothing, because there is nothing to say.
 */
export function submitQuizAnswer(
  session: VocabQuizSession,
  { username, choiceIndex, index, now }: SubmitAnswerInput
): VocabQuizAnswerResult | null {
  if (session.phase !== 'question' || session.paused) return null;
  if (index !== session.index) return null;

  const question = session.questions[session.index];
  if (!question) return null;
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= question.choices.length) return null;

  const player = session.players.get(username);
  if (!player) return null;
  if (session.answers.has(username)) return null;
  if (questionExpired(session, now)) return null;

  const elapsed = elapsedMs(session, now);
  const correct = choiceIndex === question.answerIndex;
  const { points, speedBonus, streakBonus, streakAfter } = scoreAnswer({
    correct,
    elapsedMs: elapsed,
    limitMs: session.limitMs,
    streakBefore: player.streak,
  });

  session.answers.set(username, { choiceIndex, correct, points, speedBonus, streakBonus, elapsedMs: elapsed });

  player.answers.push({ word: question.word, choiceIndex, correct, ms: elapsed });
  player.score += points;
  player.streak = streakAfter;
  player.bestStreak = Math.max(player.bestStreak, streakAfter);
  if (correct) {
    player.correctCount += 1;
    // The LESSON word, not the answer text. On a synonym question the answer
    // is a synonym and matches no lesson vocabulary key downstream.
    player.correctWords.push(question.word);
  }

  return {
    index: session.index,
    correct,
    choiceIndex,
    points,
    speedBonus,
    streakBonus,
    streak: streakAfter,
    totalScore: player.score,
  };
}

/** True once every player in the room has answered — the cue to reveal early. */
export function everyoneAnswered(session: VocabQuizSession): boolean {
  if (session.players.size === 0) return false;
  return session.answers.size >= session.players.size;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export function quizStandings(session: VocabQuizSession): VocabQuizStanding[] {
  return sortStandings(
    [...session.players.values()].map((p) => ({
      username: p.username,
      score: p.score,
      streak: p.streak,
      bestStreak: p.bestStreak,
      correctCount: p.correctCount,
    }))
  );
}

/**
 * The live question as students see it. `answerIndex` is deliberately absent:
 * it only ships in the reveal, so the answer is never sitting in a student's
 * devtools while the clock runs.
 */
export function buildQuestionPayload(session: VocabQuizSession, now: number): VocabQuizQuestionPayload {
  const question = session.questions[session.index];
  return {
    gameCode: session.gameCode,
    index: session.index,
    total: session.questions.length,
    focus: question.focus,
    prompt: question.prompt,
    choices: question.choices,
    limitMs: session.limitMs,
    remainingMs: questionRemainingMs(session, now),
    serverNow: now,
  };
}

export function buildReveal(session: VocabQuizSession): VocabQuizReveal {
  const question = session.questions[session.index];
  const distribution = new Array<number>(question.choices.length).fill(0);
  for (const answer of session.answers.values()) {
    if (answer.choiceIndex >= 0 && answer.choiceIndex < distribution.length) {
      distribution[answer.choiceIndex] += 1;
    }
  }

  return {
    gameCode: session.gameCode,
    index: session.index,
    total: session.questions.length,
    answerIndex: question.answerIndex,
    answer: question.answer,
    word: question.word,
    definition: question.definition,
    distribution,
    standings: quizStandings(session),
    nextInMs: VOCAB_QUIZ_REVEAL_MS,
    isLast: session.index >= session.questions.length - 1,
  };
}

/**
 * Move to the next question, or end the round. Clears the previous question's
 * votes and restarts the clock — a reset that must run for every question, not
 * behind a per-path branch (Class 2 in the recurring-pitfalls rules).
 */
export function advanceQuiz(session: VocabQuizSession, now: number): VocabQuizPhase {
  if (session.index >= session.questions.length - 1) {
    session.phase = 'ended';
    return 'ended';
  }

  session.index += 1;
  session.phase = 'question';
  session.answers.clear();
  session.questionStartedAt = now;
  session.paused = false;
  session.pausedElapsedMs = 0;
  session.pausedRevealMs = 0;
  session.revealEndsAt = 0;
  return 'question';
}

export function endQuiz(session: VocabQuizSession): void {
  session.phase = 'ended';
}

/**
 * Everything a reconnecting or late-joining client needs, in ONE event.
 *
 * The reconnect bug this avoids is Class 3 in the recurring-pitfalls rules:
 * two paths into the same state that carry different fields. There is exactly
 * one snapshot shape, so "fresh join", "mid-question refresh", "refresh during
 * the reveal" and "arrived after it ended" all restore identically.
 */
export function snapshotFor(
  session: VocabQuizSession,
  username: string,
  now: number
): VocabQuizStateSnapshot {
  const player = session.players.get(username);
  const ownAnswer = session.answers.get(username);
  const isQuestion = session.phase === 'question' && session.questions.length > 0;
  const isReveal = session.phase === 'reveal' && session.questions.length > 0;

  return {
    gameCode: session.gameCode,
    active: session.phase !== 'ended',
    phase: session.phase,
    focus: session.focusUsed ?? session.focus,
    paused: session.paused,
    index: session.index,
    total: session.questions.length,
    serverNow: now,
    question: isQuestion ? buildQuestionPayload(session, now) : undefined,
    reveal: isReveal ? buildReveal(session) : undefined,
    myAnswer: ownAnswer
      ? {
          index: session.index,
          correct: ownAnswer.correct,
          choiceIndex: ownAnswer.choiceIndex,
          points: ownAnswer.points,
          speedBonus: ownAnswer.speedBonus,
          streakBonus: ownAnswer.streakBonus,
          streak: player?.streak ?? 0,
          totalScore: player?.score ?? 0,
        }
      : undefined,
    myScore: player?.score ?? 0,
    myStreak: player?.streak ?? 0,
    standings: quizStandings(session),
  };
}

/**
 * Lesson words each student answered correctly, keyed by Supabase auth id —
 * the exact `wordsFound` shape `persistClassroomGameScores` consumes. Guests
 * and bots are dropped: neither has lesson progress to write.
 */
/**
 * The lesson words this round actually ASKED, in order.
 *
 * Without this the shared persistence path splits the lesson's FULL list into
 * found/missed, so every word a 10-question round never showed lands in the
 * teacher's reteach column.
 */
export function askedWords(session: VocabQuizSession): string[] {
  return session.questions.map((q) => q.word);
}

export type QuizAnswerRecord = { word: string; choiceIndex: number; correct: boolean; ms: number };

/** Per-question answers keyed by Supabase auth id. Guests are dropped. */
export function answersByUser(session: VocabQuizSession): Record<string, QuizAnswerRecord[]> {
  const out: Record<string, QuizAnswerRecord[]> = {};
  for (const player of session.players.values()) {
    if (!player.userId) continue;
    out[player.userId] = [...player.answers];
  }
  return out;
}

export function correctWordsByUser(session: VocabQuizSession): Map<string, string[]> {
  const byUser = new Map<string, string[]>();
  for (const player of session.players.values()) {
    if (!player.userId) continue;
    byUser.set(player.userId, [...player.correctWords]);
  }
  return byUser;
}
