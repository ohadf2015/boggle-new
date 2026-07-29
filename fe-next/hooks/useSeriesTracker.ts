/**
 * useSeriesTracker - Tracks accumulated scores across multiple games in a session
 *
 * Maintains a history of round scores for each player, computes accumulated
 * standings, rank changes, and provides data compatible with SessionStatsCard.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PlayerResult } from '@/types/components';
import type { Avatar } from '@/shared/types/game';

type AvatarLike = Avatar;

export const SERIES_TOTAL_GAMES = 5;

export interface SeriesStanding {
  username: string;
  avatar?: AvatarLike;
  totalScore: number;
  roundScores: number[];
  roundWins: number;
  currentRank: number;
  rankChange: number; // positive = climbed, negative = dropped, 0 = no change
}

interface RoundSnapshot {
  scores: Array<{ username: string; score: number; avatar?: AvatarLike }>;
}

const STORAGE_KEY = 'lexiclash:series-rounds';

function loadRounds(): RoundSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRounds(rounds: RoundSnapshot[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (rounds.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
    }
  } catch { /* quota exceeded — non-critical */ }
}

export function useSeriesTracker() {
  const [rounds, setRounds] = useState<RoundSnapshot[]>(loadRounds);

  // Sync to sessionStorage whenever rounds change
  useEffect(() => {
    saveRounds(rounds);
  }, [rounds]);

  const recordRound = useCallback((players: PlayerResult[]) => {
    const snapshot: RoundSnapshot = {
      scores: players.map(p => ({
        username: p.username,
        score: p.score,
        avatar: p.avatar,
      })),
    };

    setRounds(prev => {
      // Duplicate detection: compare by sorted username+score pairs
      // (order-independent, since score arrays may arrive in different order)
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const sortKey = (s: { username: string; score: number }) => `${s.username}:${s.score}`;
        const lastSorted = last.scores.map(sortKey).sort().join('|');
        const snapSorted = snapshot.scores.map(sortKey).sort().join('|');
        if (lastSorted === snapSorted) return prev;
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
      roundWins: number;
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
            roundWins: 0,
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

    // Count round wins — the player with the highest score in each round gets a win
    for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
      const round = rounds[roundIdx];
      let bestScore = -1;
      let winner = '';
      for (const entry of round.scores) {
        if (entry.score > bestScore) {
          bestScore = entry.score;
          winner = entry.username;
        }
      }
      if (winner) {
        const p = playerMap.get(winner);
        if (p) p.roundWins++;
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
        roundWins: player.roundWins,
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

  // Series leader: most round wins, tiebreak by total score
  const seriesLeader = useMemo(() => {
    if (standings.length === 0) return null;
    const sorted = [...standings].sort((a, b) =>
      b.roundWins - a.roundWins || b.totalScore - a.totalScore
    );
    return sorted[0].username;
  }, [standings]);

  return {
    roundNumber: rounds.length,
    totalGames: SERIES_TOTAL_GAMES,
    isSeriesComplete: rounds.length >= SERIES_TOTAL_GAMES,
    hasMultipleRounds: rounds.length >= 2,
    standings,
    sessionStandings,
    seriesLeader,
    recordRound,
    reset,
  };
}
