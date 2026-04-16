/**
 * Pure helper for building the POST /api/adventure/complete JSON body.
 * Split from ProgressionContext.tsx so it is unit-testable without mocking
 * useAuth/fetch/provider state.
 *
 * Keep in sync with server validation in app/api/adventure/complete/validation.ts.
 */

export interface CompleteLevelBodyParams {
  world: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
  words: number;
  goldEarned?: number;
  longWords?: number;
  wordsFound?: string[];
  flashChallengeGold?: number;
  /** Seconds of real gameplay. Server rejects < 10 (anti-cheat). */
  timePlayed?: number;
}

export function buildCompleteLevelBody(params: CompleteLevelBodyParams): string {
  const {
    world, level, stars, score, words,
    goldEarned, longWords, wordsFound, flashChallengeGold, timePlayed,
  } = params;

  return JSON.stringify({
    world,
    level,
    stars,
    score,
    words,
    ...(goldEarned !== undefined && { goldEarned }),
    ...(longWords !== undefined && { longWords }),
    ...(wordsFound && wordsFound.length > 0 && { wordsFound }),
    ...(flashChallengeGold !== undefined && flashChallengeGold > 0 && { flashChallengeGold }),
    ...(typeof timePlayed === 'number' && { timePlayed }),
  });
}
