/**
 * A finished classroom quiz as the board's results payload, so a quiz or quiz
 * Boss Battle ends on the same projector recap and phone results card as every
 * other classroom mode instead of on a finale of its own.
 */

import { VOCAB_QUIZ_MODE, type VocabQuizBoss } from '@/shared/types/vocabQuiz';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { Language } from '@/shared/types';
import { buildClassroomRoundSummary } from '../modules/classroomRoundSummary';
import type { ClassroomGame } from '../modules/classroomGameTypes';
import { askedWords, quizStandings, type VocabQuizSession } from './vocabQuizEngine';
import { bossFor } from './vocabQuizBoss';

interface QuizRoomView {
  tvMode?: boolean;
  users?: Record<string, { isBot?: boolean } | undefined>;
}

export interface QuizResultRow {
  username: string;
  score: number;
  totalScore: number;
  wordDetails: Array<{ word: string; score: number; validated: boolean }>;
  allWords: Array<{ word: string; score: number; validated: boolean }>;
  wordsFoundCount: number;
  correctCount: number;
  bestStreak: number;
  achievements: never[];
  titles: never[];
  isBot: boolean;
}

export interface QuizResultsPayload {
  scores: QuizResultRow[];
  letterGrid: null;
  duplicateRuleDisabled: false;
  playerCount: number;
  gameMode: typeof VOCAB_QUIZ_MODE;
  gameSessionId?: number | string;
  classroomSummary: ClassroomSummary;
  vocabQuizBoss?: VocabQuizBoss;
  tvMode: boolean;
  isRanked: false;
  mmrChanges: Record<string, never>;
}

export interface BuildQuizResultsArgs {
  session: VocabQuizSession;
  gameCode: string;
  classroomGame: ClassroomGame;
  room: QuizRoomView | null | undefined;
}

/** Null when the lesson has no words to recap; the caller then keeps the quiz finale. */
export async function buildQuizResultsPayload({
  session,
  gameCode,
  classroomGame,
  room,
}: BuildQuizResultsArgs): Promise<QuizResultsPayload | null> {
  const scores: QuizResultRow[] = quizStandings(session).map((standing) => {
    const words = session.players.get(standing.username)?.correctWords ?? [];
    const details = words.map((word) => ({ word, score: 0, validated: true }));
    return {
      username: standing.username,
      score: standing.score,
      totalScore: standing.score,
      wordDetails: details,
      allWords: details,
      wordsFoundCount: words.length,
      correctCount: standing.correctCount,
      bestStreak: standing.bestStreak,
      achievements: [],
      titles: [],
      isBot: !!room?.users?.[standing.username]?.isBot,
    };
  });

  const classroomSummary = await buildClassroomRoundSummary({
    gameCode,
    language: (classroomGame.language ?? 'en') as Language,
    classroomGame,
    participationBonus: 0,
    players: scores.map((row) => ({
      username: row.username,
      totalScore: row.totalScore,
      isBot: row.isBot,
      wordDetails: row.wordDetails,
    })),
    placedWords: askedWords(session),
    gameMode: VOCAB_QUIZ_MODE,
  });
  if (!classroomSummary) return null;

  const boss = bossFor(session);
  return {
    scores,
    letterGrid: null,
    duplicateRuleDisabled: false,
    playerCount: scores.length,
    gameMode: VOCAB_QUIZ_MODE,
    ...(session.shellSessionId ? { gameSessionId: session.shellSessionId } : {}),
    classroomSummary,
    ...(boss ? { vocabQuizBoss: boss } : {}),
    tvMode: room?.tvMode ?? true,
    isRanked: false,
    mmrChanges: {},
  };
}
