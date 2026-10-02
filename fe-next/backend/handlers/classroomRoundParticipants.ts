import logger from '../utils/logger.js';

export type PlayerScore = { userId: string; score: number; wordsFound?: string[]; username?: string };

type RoundResult = {
  username: string;
  totalScore: number;
  wordDetails?: Array<{ word: string; validated: boolean; isDuplicate?: boolean }>;
};

type RoomUsers = Record<string, { authUserId?: string | null; isBot?: boolean } | undefined>;

/**
 * Adapter for the server-side game-end path (gameLifecycle/gameScores.ts):
 * turns the validated results payload + the room's user map into the
 * `playerScores` shape `persistClassroomGameScores` consumes. Bots and
 * guests (no auth user id) are dropped — neither has lesson progress.
 * A duplicate word scores zero but the student DID find it, so it counts;
 * only the validator's rejection means "not found".
 */
export function playerScoresFromGameResults(
  results: RoundResult[],
  users: RoomUsers,
  gameCode?: string
): PlayerScore[] {
  const scores: PlayerScore[] = [];
  let unrecorded = 0;
  for (const result of results) {
    const user = users[result.username];
    if (!user || user.isBot) continue;
    if (!user.authUserId) {
      unrecorded += 1;
      continue;
    }
    scores.push({
      userId: user.authUserId,
      username: result.username,
      score: result.totalScore,
      wordsFound: (result.wordDetails ?? []).filter((d) => d.validated).map((d) => d.word),
    });
  }
  if (unrecorded > 0) {
    logger.warn('CLASSROOM_GAME', `Game ${gameCode ?? '?'}: ${unrecorded} player(s) had no account and cannot be recorded`);
  }
  return scores;
}

/** False for the teacher's bot Practice Round: nobody but the teacher and bots played. */
export function roundHasStudents(results: RoundResult[], users: RoomUsers, teacherId: string): boolean {
  return results.some((result) => {
    const user = users[result.username];
    if (user?.isBot) return false;
    return user?.authUserId !== teacherId;
  });
}
