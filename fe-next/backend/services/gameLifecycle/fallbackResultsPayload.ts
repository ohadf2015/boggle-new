/**
 * Results served when scoring throws. Carries gameSessionId like the normal
 * payload: the classroom chest is matched to the round by that id.
 */
/**
 * Signed-in humans only, never in a classroom: anonymous students carry an
 * auth id too, and classmates must not receive it.
 */
export function scoreRowUserId(user: unknown, isClassroom = false): { userId?: string } {
  const u = user as { isBot?: boolean; authUserId?: string | null } | undefined;
  return !isClassroom && u && !u.isBot && typeof u.authUserId === 'string' && u.authUserId ? { userId: u.authUserId } : {};
}

export function buildFallbackResultsPayload(game: {
  gameSessionId?: number;
  letterGrid: unknown;
  gameMode?: string;
  isClassroom?: boolean;
  users?: Record<string, unknown>;
  playerScores?: Record<string, number>;
  playerWords?: Record<string, string[]>;
}) {
  const scores = Object.entries(game.users || {}).map(([username, user]) => ({
    username,
    isBot: !!(user as { isBot?: boolean } | undefined)?.isBot,
    isHost: !!(user as { isHost?: boolean } | undefined)?.isHost,
    ...scoreRowUserId(user, !!game.isClassroom),
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
