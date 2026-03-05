/**
 * useSeriesTracker - Tracks accumulated scores across multiple games in a session
 *
 * Maintains a history of round scores for each player, computes accumulated
 * standings, rank changes, and provides data compatible with SessionStatsCard.
 */
import { useState, useCallback, useMemo } from 'react';
import type { PlayerResult } from '@/types/components';

interface AvatarLike {
  emoji?: string;
  color?: string;
}

export interface SeriesStanding {
  username: string;
  avatar?: AvatarLike;
  totalScore: number;
  roundScores: number[];
  currentRank: number;
  rankChange: number; // positive = climbed, negative = dropped, 0 = no change
}

interface RoundSnapshot {
  scores: Array<{ username: string; score: number; avatar?: AvatarLike }>;
}

export function useSeriesTracker() {
  const [rounds, setRounds] = useState<RoundSnapshot[]>([]);

  const recordRound = useCallback((players: PlayerResult[]) => {
    const snapshot: RoundSnapshot = {
      scores: players.map(p => ({
        username: p.username,
        score: p.score,
        avatar: p.avatar,
      })),
    };

    setRounds(prev => {
      // Duplicate detection: check if last round has identical scores
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const isSame =
          last.scores.length === snapshot.scores.length &&
          last.scores.every((s, i) =>
            s.username === snapshot.scores[i]?.username &&
            s.score === snapshot.scores[i]?.score
          );
        if (isSame) return prev;
      }
      return [...prev, snapshot];
    });
  }, []);

  const reset = useCallback(() => {
    setRounds([]);
  }, []);

  const standings = useMemo((): SeriesStanding[] => {
    if (rounds.length === 0) return [];

    // Collect all unique players across all rounds
    const playerMap = new Map<string, {
      username: string;
      avatar?: AvatarLike;
      roundScores: number[];
      totalScore: number;
    }>();

    for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
      const round = rounds[roundIdx];

      for (const entry of round.scores) {
        let player = playerMap.get(entry.username);
        if (!player) {
          // New player - fill missed rounds with 0
          player = {
            username: entry.username,
            avatar: entry.avatar,
            roundScores: Array(roundIdx).fill(0),
            totalScore: 0,
          };
          playerMap.set(entry.username, player);
        }
        player.roundScores.push(entry.score);
        player.totalScore += entry.score;
        if (entry.avatar) player.avatar = entry.avatar;
      }

      // Fill 0 for players who didn't participate in this round
      for (const [, player] of playerMap) {
        if (player.roundScores.length < roundIdx + 1) {
          player.roundScores.push(0);
        }
      }
    }

    // Sort by total score descending
    const sorted = [...playerMap.values()].sort((a, b) => b.totalScore - a.totalScore);

    // Compute previous ranks (based on totalScore before last round)
    const previousRanks = new Map<string, number>();
    if (rounds.length >= 2) {
      const prevTotals = sorted.map(p => ({
        username: p.username,
        prevTotal: p.totalScore - (p.roundScores[p.roundScores.length - 1] || 0),
      }));
      prevTotals
        .sort((a, b) => b.prevTotal - a.prevTotal)
        .forEach((p, i) => previousRanks.set(p.username, i + 1));
    }

    return sorted.map((player, index) => {
      const currentRank = index + 1;
      const previousRank = previousRanks.get(player.username);
      const rankChange = previousRank ? previousRank - currentRank : 0;

      return {
        username: player.username,
        avatar: player.avatar,
        totalScore: player.totalScore,
        roundScores: player.roundScores,
        currentRank,
        rankChange,
      };
    });
  }, [rounds]);

  // Format compatible with SessionStatsCard / sessionStatsCalculator
  const sessionStandings = useMemo(() =>
    standings.map(s => ({
      username: s.username,
      totalScore: s.totalScore,
      roundScores: s.roundScores,
    })),
    [standings]
  );

  return {
    roundNumber: rounds.length,
    hasMultipleRounds: rounds.length >= 2,
    standings,
    sessionStandings,
    recordRound,
    reset,
  };
}
