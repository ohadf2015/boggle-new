/**
 * Classroom crossword: deal the grid from the teacher's lesson words before the
 * round is announced, so a lesson too small for a grid leaves the room in the
 * lobby with a reason instead of starting a broken or off-lesson puzzle.
 */

import type { Server } from 'socket.io';
import type { GameState } from './gameState/types';
import { getClassroomGame, setClassroomGamePlacedVocabulary } from './classroomGameManager';
import { loadLessonVocabulary } from '../services/vocabQuizLessonWords';
import { buildLessonCrossword, lessonClueOf } from '@/lib/crossword/lessonCrossword';
import type { PuzzleLocale } from '@/lib/crossword/types';
import { fnv1aHash } from '@/lib/rng/seededRandom';
import { CROSSWORD_CLASSROOM_EVENTS, type CrosswordStartRefused } from '@/shared/types/crosswordClassroom';
import { getGameRoom } from '../utils/socketHelpers';
import logger from '../utils/logger';

const LOCALES: readonly PuzzleLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export async function stageClassroomCrossword(io: Server, gameCode: string, game: GameState): Promise<'staged' | 'refused' | false> {
  if (!game.isClassroom) return false;
  const record = await getClassroomGame(gameCode);
  if (!record) return false;

  const { words, language } = await loadLessonVocabulary(record.lessonIds ?? []);
  const inRound = new Set((record.vocabularyWords ?? []).map((w) => w.trim().toLowerCase()));
  const roundWords = inRound.size > 0 ? words.filter((w) => inRound.has(w.word.trim().toLowerCase())) : words;
  const lang = record.language ?? language ?? game.language ?? 'en';
  const locale = (LOCALES as readonly string[]).includes(lang) ? (lang as PuzzleLocale) : 'en';
  const roundKey = `${gameCode}:${Date.now()}`;

  const result = buildLessonCrossword({
    entries: roundWords.map((w) => ({ word: w.word, clue: lessonClueOf(w) })),
    locale,
    seed: fnv1aHash(roundKey),
    id: `lesson-${roundKey}`,
  });

  if (!result.ok) {
    logger.warn('CROSSWORD', `Refusing classroom crossword ${gameCode}: ${result.usableWords} usable lesson words of ${roundWords.length}`);
    const refusal: CrosswordStartRefused = { gameCode, reason: result.reason, usableWords: result.usableWords };
    io.to(getGameRoom(gameCode)).emit(CROSSWORD_CLASSROOM_EVENTS.startRefused, refusal);
    return 'refused';
  }

  game.lessonCrossword = { puzzle: result.puzzle, lessonWordBySlot: result.lessonWordBySlot };
  await setClassroomGamePlacedVocabulary(gameCode, Object.values(result.lessonWordBySlot)).catch((err: Error) => {
    logger.warn('CROSSWORD', `placedVocabulary write failed for ${gameCode}: ${err.message}`);
  });
  return 'staged';
}
