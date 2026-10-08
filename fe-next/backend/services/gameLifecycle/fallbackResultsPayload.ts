/**
 * Results served when scoring throws. Carries gameSessionId like the normal
 * payload: the classroom chest is matched to the round by that id.
 */
export function buildFallbackResultsPayload(game: {
  gameSessionId?: number;
  letterGrid: unknown;
  gameMode?: string;
  users?: Record<string, unknown>;
  playerScores?: Record<string, number>;
  playerWords?: Record<string, string[]>;
}) {
  const scores = Object.keys(game.users || {}).map((username) => ({
    username,
    totalScore: game.playerScores?.[username] || 0,
    // Key must stay wordDetails: the Supabase mapper reads it.
    wordDetails: (game.playerWords?.[username] || []).map((word) => ({
      word,
      score: 0,
      isValid: true,
      isDuplicate: false,
    })),
    achievements: [],
    titles: [],
  }));
  return {
    scores,
    letterGrid: game.letterGrid,
    duplicateRuleDisabled: false,
    playerCount: Object.keys(game.users || {}).length,
    gameMode: game.gameMode,
    gameSessionId: game.gameSessionId,
  };
}
