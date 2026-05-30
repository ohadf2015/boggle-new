/**
 * Session Stats Calculator
 *
 * Pure functions that analyze tournament standings across rounds
 * to produce interesting "session facts" for multi-game sessions.
 */

export interface SessionFact {
  type: 'improvement' | 'consistency' | 'comeback' | 'rivalry' | 'record' | 'placement';
  playerName: string;
  playerName2?: string;
  value: number;
  translationKey: string;
  translationParams: Record<string, string | number>;
  icon: string;
  /** True when this fact is about the viewer — card renders "You" instead of the name. */
  isCurrentUser?: boolean;
}

interface StandingWithScores {
  username: string;
  totalScore: number;
  roundScores?: number[];
}

/**
 * Find the player who improved the most from round 1 to the latest round
 * (percentage improvement).
 */
export function getImprovementTrends(
  standings: StandingWithScores[]
): SessionFact | null {
  let bestPlayer = '';
  let bestImprovement = 0;

  for (const player of standings) {
    const scores = player.roundScores;
    if (!scores || scores.length < 2) continue;

    const firstRound = scores[0];
    const lastRound = scores[scores.length - 1];

    if (firstRound <= 0) continue;

    const improvement = ((lastRound - firstRound) / firstRound) * 100;
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestPlayer = player.username;
    }
  }

  if (!bestPlayer || bestImprovement <= 0) return null;

  return {
    type: 'improvement',
    playerName: bestPlayer,
    value: Math.round(bestImprovement),
    translationKey: 'results.sessionStats.improved',
    translationParams: {
      player: bestPlayer,
      percent: Math.round(bestImprovement),
    },
    icon: 'TrendingUp',
  };
}

/**
 * Find the player who placed in the top 3 most consistently across rounds.
 * We rank players per round by score, then count top-3 finishes.
 */
export function getConsistencyStats(
  standings: StandingWithScores[]
): SessionFact | null {
  const playersWithScores = standings.filter(
    (s) => s.roundScores && s.roundScores.length >= 2
  );
  if (playersWithScores.length < 2) return null;

  const roundCount = Math.max(
    ...playersWithScores.map((s) => s.roundScores!.length)
  );

  const top3Counts: Record<string, number> = {};

  for (let r = 0; r < roundCount; r++) {
    const roundResults = playersWithScores
      .filter((s) => s.roundScores![r] !== undefined)
      .map((s) => ({ username: s.username, score: s.roundScores![r] }))
      .sort((a, b) => b.score - a.score);

    const top3 = roundResults.slice(0, 3);
    for (const p of top3) {
      top3Counts[p.username] = (top3Counts[p.username] || 0) + 1;
    }
  }

  let bestPlayer = '';
  let bestCount = 0;
  for (const [username, count] of Object.entries(top3Counts)) {
    if (count > bestCount) {
      bestCount = count;
      bestPlayer = username;
    }
  }

  if (!bestPlayer || bestCount < 2) return null;

  return {
    type: 'consistency',
    playerName: bestPlayer,
    value: bestCount,
    translationKey: 'results.sessionStats.consistent',
    translationParams: { player: bestPlayer, count: bestCount },
    icon: 'Target',
  };
}

/**
 * Find the player who climbed the most positions from round 1 placement
 * to current overall placement.
 */
export function getComebackDetection(
  standings: StandingWithScores[]
): SessionFact | null {
  const playersWithScores = standings.filter(
    (s) => s.roundScores && s.roundScores.length >= 2
  );
  if (playersWithScores.length < 2) return null;

  // Round 1 ranking (by round 1 score)
  const round1Ranked = [...playersWithScores]
    .sort((a, b) => b.roundScores![0] - a.roundScores![0])
    .map((s, i) => ({ username: s.username, rank: i + 1 }));

  // Current ranking (by totalScore)
  const currentRanked = [...playersWithScores]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((s, i) => ({ username: s.username, rank: i + 1 }));

  let bestPlayer = '';
  let bestClimb = 0;

  for (const current of currentRanked) {
    const round1 = round1Ranked.find((r) => r.username === current.username);
    if (!round1) continue;
    const climb = round1.rank - current.rank;
    if (climb > bestClimb) {
      bestClimb = climb;
      bestPlayer = current.username;
    }
  }

  if (!bestPlayer || bestClimb <= 0) return null;

  return {
    type: 'comeback',
    playerName: bestPlayer,
    value: bestClimb,
    translationKey: 'results.sessionStats.comeback',
    translationParams: { player: bestPlayer, positions: bestClimb },
    icon: 'ArrowUp',
  };
}

/**
 * Find the pair of players with the closest cumulative scores
 * (diff < 10% of leader's score).
 */
export function getRivalries(
  standings: StandingWithScores[]
): SessionFact | null {
  if (standings.length < 2) return null;

  const sorted = [...standings].sort((a, b) => b.totalScore - a.totalScore);
  const leaderScore = sorted[0].totalScore;
  if (leaderScore <= 0) return null;

  let closestDiff = Infinity;
  let player1 = '';
  let player2 = '';

  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const diff = Math.abs(sorted[i].totalScore - sorted[j].totalScore);
      if (diff < closestDiff) {
        closestDiff = diff;
        player1 = sorted[i].username;
        player2 = sorted[j].username;
      }
    }
  }

  const threshold = leaderScore * 0.1;
  if (closestDiff > threshold) return null;

  return {
    type: 'rivalry',
    playerName: player1,
    playerName2: player2,
    value: closestDiff,
    translationKey: 'results.sessionStats.rivalry',
    translationParams: { player1, player2, diff: closestDiff },
    icon: 'Swords',
  };
}

/**
 * Find the highest single-round score across all players.
 */
export function getBiggestSingleRound(
  standings: StandingWithScores[]
): SessionFact | null {
  let bestPlayer = '';
  let bestScore = 0;
  let bestRound = 0;

  for (const player of standings) {
    if (!player.roundScores) continue;
    for (let i = 0; i < player.roundScores.length; i++) {
      if (player.roundScores[i] > bestScore) {
        bestScore = player.roundScores[i];
        bestPlayer = player.username;
        bestRound = i + 1;
      }
    }
  }

  if (!bestPlayer || bestScore <= 0) return null;

  return {
    type: 'record',
    playerName: bestPlayer,
    value: bestScore,
    translationKey: 'results.sessionStats.bigRound',
    translationParams: { player: bestPlayer, score: bestScore, round: bestRound },
    icon: 'Zap',
  };
}

/**
 * Best personal insight for ONE player (the viewer), in priority order:
 * comeback (climbed) → improvement → consistency (top-3) → record (best round).
 * Returns null only if the player has no flattering stat at all.
 */
function getPersonalInsight(
  standings: StandingWithScores[],
  username: string
): SessionFact | null {
  const me = standings.find((s) => s.username === username);
  if (!me) return null;
  const scores = me.roundScores ?? [];

  // Comeback: climbed positions from round-1 placement to current total.
  if (scores.length >= 2) {
    const ranked = (key: (s: StandingWithScores) => number) =>
      [...standings]
        .filter((s) => (s.roundScores?.length ?? 0) >= 1)
        .sort((a, b) => key(b) - key(a))
        .findIndex((s) => s.username === username) + 1;
    const round1Rank = ranked((s) => s.roundScores?.[0] ?? 0);
    const currentRank = ranked((s) => s.totalScore);
    const climb = round1Rank - currentRank;
    if (climb > 0) {
      return {
        type: 'comeback',
        playerName: username,
        value: climb,
        translationKey: 'results.sessionStats.comeback',
        translationParams: { player: username, positions: climb },
        icon: 'ArrowUp',
        isCurrentUser: true,
      };
    }
  }

  // Improvement: grew from round 1 to the latest round.
  if (scores.length >= 2 && scores[0] > 0) {
    const improvement = ((scores[scores.length - 1] - scores[0]) / scores[0]) * 100;
    if (improvement > 0) {
      return {
        type: 'improvement',
        playerName: username,
        value: Math.round(improvement),
        translationKey: 'results.sessionStats.improved',
        translationParams: { player: username, percent: Math.round(improvement) },
        icon: 'TrendingUp',
        isCurrentUser: true,
      };
    }
  }

  // Consistency: top-3 finishes across rounds.
  if (scores.length >= 2) {
    let top3 = 0;
    for (let r = 0; r < scores.length; r++) {
      const rank =
        [...standings]
          .filter((s) => s.roundScores?.[r] !== undefined)
          .sort((a, b) => (b.roundScores![r]) - (a.roundScores![r]))
          .findIndex((s) => s.username === username) + 1;
      if (rank >= 1 && rank <= 3) top3++;
    }
    if (top3 >= 2) {
      return {
        type: 'consistency',
        playerName: username,
        value: top3,
        translationKey: 'results.sessionStats.consistent',
        translationParams: { player: username, count: top3 },
        icon: 'Target',
        isCurrentUser: true,
      };
    }
  }

  // Record: the viewer's own biggest single round.
  if (scores.length >= 1) {
    let best = 0;
    let bestRound = 0;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > best) {
        best = scores[i];
        bestRound = i + 1;
      }
    }
    if (best > 0) {
      return {
        type: 'record',
        playerName: username,
        value: best,
        translationKey: 'results.sessionStats.bigRound',
        translationParams: { player: username, score: best, round: bestRound },
        icon: 'Zap',
        isCurrentUser: true,
      };
    }
  }

  return null;
}

/**
 * Fallback when the viewer has no flattering stat: show their current placement.
 * Never renders someone else's name on the viewer's card.
 */
function getPlacementFact(
  standings: StandingWithScores[],
  username: string
): SessionFact | null {
  const sorted = [...standings].sort((a, b) => b.totalScore - a.totalScore);
  const rank = sorted.findIndex((s) => s.username === username) + 1;
  if (rank < 1) return null;
  return {
    type: 'placement',
    playerName: username,
    value: rank,
    translationKey: 'results.sessionStats.placement',
    translationParams: { player: username, rank },
    icon: 'Flag',
    isCurrentUser: true,
  };
}

/**
 * The viewer's NEAREST rival: the score-adjacent neighbour in the standings
 * (not the global closest pair). "Its closer rival."
 */
function getNeighbourRival(
  standings: StandingWithScores[],
  username: string
): SessionFact | null {
  const sorted = [...standings].sort((a, b) => b.totalScore - a.totalScore);
  const idx = sorted.findIndex((s) => s.username === username);
  if (idx < 0 || sorted.length < 2) return null;

  const above = idx > 0 ? sorted[idx - 1] : null;
  const below = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const me = sorted[idx];

  const candidates = [above, below].filter(
    (c): c is StandingWithScores => c !== null
  );
  if (candidates.length === 0) return null;

  let rival = candidates[0];
  let bestDiff = Math.abs(me.totalScore - rival.totalScore);
  for (const c of candidates.slice(1)) {
    const diff = Math.abs(me.totalScore - c.totalScore);
    if (diff < bestDiff) {
      bestDiff = diff;
      rival = c;
    }
  }

  return {
    type: 'rivalry',
    playerName: username,
    playerName2: rival.username,
    value: bestDiff,
    translationKey: 'results.sessionStats.rivalry',
    translationParams: { player1: username, player2: rival.username, diff: bestDiff },
    icon: 'Swords',
    isCurrentUser: true,
  };
}

/**
 * Aggregate session facts, capped at 2 rows.
 *
 * Player surface (currentUsername present & in standings): row 1 = the viewer's
 * own best insight (placement fallback), row 2 = the viewer's nearest rival.
 * Host / TV surface (no currentUsername): session-MVP framing — the most
 * impressive stat across all players + the global closest pair, named.
 */
export function getAllSessionFacts(
  standings: StandingWithScores[],
  currentUsername?: string
): SessionFact[] {
  if (standings.length === 0) return [];

  const isViewer =
    !!currentUsername && standings.some((s) => s.username === currentUsername);

  if (isViewer) {
    const row1 =
      getPersonalInsight(standings, currentUsername!) ??
      getPlacementFact(standings, currentUsername!);
    const row2 = getNeighbourRival(standings, currentUsername!);
    return [row1, row2].filter((f): f is SessionFact => f !== null).slice(0, 2);
  }

  // Host / MVP mode — most impressive across the room + global rivalry.
  const mvp = [
    getImprovementTrends(standings),
    getComebackDetection(standings),
    getConsistencyStats(standings),
    getBiggestSingleRound(standings),
  ].find((f): f is SessionFact => f !== null);
  const rivalry = getRivalries(standings);

  return [mvp, rivalry].filter((f): f is SessionFact => f !== null).slice(0, 2);
}
