/**
 * Session Stats Calculator
 *
 * Pure functions that analyze tournament standings across rounds
 * to produce interesting "session facts" for multi-game sessions.
 */

export interface SessionFact {
  type: 'improvement' | 'consistency' | 'comeback' | 'rivalry' | 'record';
  playerName: string;
  playerName2?: string;
  value: number;
  translationKey: string;
  translationParams: Record<string, string | number>;
  icon: string;
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
 * Aggregate all session facts, filter nulls, return up to 4.
 */
export function getAllSessionFacts(
  standings: StandingWithScores[]
): SessionFact[] {
  const facts = [
    getImprovementTrends(standings),
    getConsistencyStats(standings),
    getComebackDetection(standings),
    getRivalries(standings),
    getBiggestSingleRound(standings),
  ].filter((f): f is SessionFact => f !== null);

  return facts.slice(0, 4);
}
