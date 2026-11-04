/**
 * The lesson recap for one finished classroom round, from any mode.
 *
 * Board rounds (gameScores) and quiz rounds (vocabQuizResults) both end here,
 * so the projector recap and every phone's results card read one shape and a
 * quiz round counts toward the period's standings like any other round.
 */

import type { Language } from '@/shared/types';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { clampTeamCount, reconcileTeams } from '@/shared/utils/teamBattle';
import { buildClassroomSummary } from './classroomSummary';
import { buildClassroomPodium, splitNeverPlacedWords } from './classroomResultsExtras';
import { accumulateSessionScores, toSessionStandings } from './classroomSessionScores';
import { saveClassroomSessionScores } from './classroomGameManager';
import type { ClassroomGame } from './classroomGameTypes';
import logger from '../utils/logger';

export interface ClassroomRoundPlayer {
  username: string;
  totalScore: number;
  isBot: boolean;
  wordDetails: Array<{ word: string; validated: boolean; isDuplicate?: boolean }>;
}

export interface BuildClassroomRoundSummaryArgs {
  gameCode: string;
  language: Language;
  classroomGame: ClassroomGame;
  /** Final rows in podium order (highest score first). */
  players: ClassroomRoundPlayer[];
  participationBonus: number;
  /** Lesson words the round could have produced; defaults to the board's placed set. */
  placedWords?: string[];
}

export async function buildClassroomRoundSummary({
  gameCode,
  language,
  classroomGame,
  players,
  participationBonus,
  placedWords = classroomGame.placedVocabulary,
}: BuildClassroomRoundSummaryArgs): Promise<ClassroomSummary | undefined> {
  const classroomSettings = classroomGame.settings;
  const summary = buildClassroomSummary({
    language,
    teacherName: classroomGame.teacherName,
    lessonNames: classroomGame.lessonNames,
    lessonIds: classroomGame.lessonIds,
    vocabularyWords: classroomGame.vocabularyWords,
    // A bot finding a lesson word must not take it off the teacher's reteach list.
    players: players.map((p) => ({ username: p.username, isBot: p.isBot, wordDetails: p.wordDetails })),
  });
  if (!summary) return undefined;

  if (classroomSettings?.playStyle === 'teams') {
    const humanNames = players.filter((p) => !p.isBot).map((p) => p.username);
    // Prefer the deal the round started with: re-dealing here would recolour the
    // class between the board and the podium when someone dropped mid-round.
    if (!classroomGame.teams?.length) {
      logger.warn(
        'CLASSROOM_GAME',
        `No stored team deal for ${gameCode} at results — re-dealing from the finishing roster`
      );
    }
    summary.teamBattle = {
      teamCount: clampTeamCount(classroomSettings.teamCount),
      teams: reconcileTeams(classroomGame.teams, humanNames, classroomSettings.teamCount ?? 2, gameCode),
    };
  }
  if (participationBonus > 0) summary.participationBonus = participationBonus;

  const scoreRows = players.map((p) => ({ username: p.username, totalScore: p.totalScore, isBot: p.isBot }));
  summary.podium = buildClassroomPodium({
    players: scoreRows,
    masteryByPlayer: summary.masteryByPlayer,
    // The teacher holds a socket but never plays; their zero must not take a plinth.
    exclude: [classroomGame.teacherName],
  });

  // Rematches reset the room's scores, so the period total is folded here.
  const sessionScores = accumulateSessionScores(classroomGame.sessionScores, scoreRows, [classroomGame.teacherName]);
  const roundsPlayed = (classroomGame.roundsPlayed ?? 0) + 1;
  summary.roundsPlayed = roundsPlayed;
  if (roundsPlayed > 1) summary.sessionStandings = toSessionStandings(sessionScores);
  if (summary.teamBattle) {
    summary.teamBattle.scores = toSessionStandings(sessionScores).map((row) => ({
      username: row.username,
      score: row.totalScore,
    }));
  }
  // Awaited: the next round's start rewrites this Redis record whole, and a
  // fire-and-forget write here loses the race and drops the period standings.
  await saveClassroomSessionScores(gameCode, sessionScores, roundsPlayed);

  const neverPlaced = splitNeverPlacedWords({ missedWords: summary.missedWords, placedWords, language });
  if (neverPlaced.length > 0) summary.neverPlacedWords = neverPlaced;
  const accessibility = classroomSettings?.accessibility;
  if (accessibility?.largeText || accessibility?.audioCues) {
    summary.accessibility = { largeText: !!accessibility.largeText, audioCues: !!accessibility.audioCues };
  }
  return summary;
}
