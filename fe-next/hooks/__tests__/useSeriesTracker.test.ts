/**
 * Tests for useSeriesTracker hook
 *
 * Tracks accumulated scores across multiple games in a multiplayer session.
 */
import { renderHook, act } from '@testing-library/react';
import { useSeriesTracker } from '../useSeriesTracker';
import type { PlayerResult } from '@/types/components';

const makePlayer = (username: string, score: number, avatar?: { emoji: string; color: string }): PlayerResult => ({
  username,
  score,
  avatar: avatar || { emoji: '🎮', color: '#FF0000' },
  allWords: [],
  wordsFoundCount: 0,
});

describe('useSeriesTracker', () => {
  describe('initial state', () => {
    it('should start with empty history and round 0', () => {
      const { result } = renderHook(() => useSeriesTracker());

      expect(result.current.roundNumber).toBe(0);
      expect(result.current.standings).toEqual([]);
      expect(result.current.hasMultipleRounds).toBe(false);
    });
  });

  describe('recording rounds', () => {
    it('should record a single round', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      expect(result.current.roundNumber).toBe(1);
      expect(result.current.hasMultipleRounds).toBe(false);
      expect(result.current.standings).toHaveLength(2);
      expect(result.current.standings[0].username).toBe('Alice');
      expect(result.current.standings[0].totalScore).toBe(100);
    });

    it('should accumulate scores across multiple rounds', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 50),
          makePlayer('Bob', 120),
        ]);
      });

      expect(result.current.roundNumber).toBe(2);
      expect(result.current.hasMultipleRounds).toBe(true);

      // Bob should be #1 now (80 + 120 = 200 vs Alice's 100 + 50 = 150)
      expect(result.current.standings[0].username).toBe('Bob');
      expect(result.current.standings[0].totalScore).toBe(200);
      expect(result.current.standings[0].currentRank).toBe(1);

      expect(result.current.standings[1].username).toBe('Alice');
      expect(result.current.standings[1].totalScore).toBe(150);
      expect(result.current.standings[1].currentRank).toBe(2);
    });

    it('should track round scores array', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 50),
          makePlayer('Bob', 120),
        ]);
      });

      const bob = result.current.standings.find(s => s.username === 'Bob')!;
      expect(bob.roundScores).toEqual([80, 120]);

      const alice = result.current.standings.find(s => s.username === 'Alice')!;
      expect(alice.roundScores).toEqual([100, 50]);
    });

    it('should track position changes', () => {
      const { result } = renderHook(() => useSeriesTracker());

      // Round 1: Alice leads
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
          makePlayer('Charlie', 60),
        ]);
      });

      // Round 2: Charlie surges to 1st
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 20),
          makePlayer('Bob', 30),
          makePlayer('Charlie', 200),
        ]);
      });

      // Totals: Charlie=260, Alice=120, Bob=110
      const charlie = result.current.standings.find(s => s.username === 'Charlie')!;
      expect(charlie.currentRank).toBe(1);
      expect(charlie.rankChange).toBe(2); // climbed 2 positions (from 3rd to 1st)

      const alice = result.current.standings.find(s => s.username === 'Alice')!;
      expect(alice.currentRank).toBe(2);
      expect(alice.rankChange).toBe(-1); // dropped 1 position (1st to 2nd)
    });
  });

  describe('handling new players joining mid-series', () => {
    it('should add new players with zero scores for missed rounds', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      // Dave joins in round 2
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 50),
          makePlayer('Bob', 60),
          makePlayer('Dave', 90),
        ]);
      });

      const dave = result.current.standings.find(s => s.username === 'Dave')!;
      expect(dave.totalScore).toBe(90);
      expect(dave.roundScores).toEqual([0, 90]); // 0 for missed round
    });
  });

  describe('reset', () => {
    it('should clear all data on reset', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([makePlayer('Alice', 100)]);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.roundNumber).toBe(0);
      expect(result.current.standings).toEqual([]);
      expect(result.current.hasMultipleRounds).toBe(false);
    });
  });

  describe('sessionStandings format', () => {
    it('should provide data compatible with SessionStatsCard', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
        result.current.recordRound([
          makePlayer('Alice', 50),
          makePlayer('Bob', 120),
        ]);
      });

      // sessionStandings should match the StandingWithScores interface
      const sessionStandings = result.current.sessionStandings;
      expect(sessionStandings).toHaveLength(2);
      expect(sessionStandings[0]).toHaveProperty('username');
      expect(sessionStandings[0]).toHaveProperty('totalScore');
      expect(sessionStandings[0]).toHaveProperty('roundScores');
    });
  });

  describe('round wins tracking', () => {
    it('should track round wins for each player', () => {
      const { result } = renderHook(() => useSeriesTracker());

      // Round 1: Alice wins
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      // Round 2: Bob wins
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 50),
          makePlayer('Bob', 120),
        ]);
      });

      // Round 3: Alice wins
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 90),
          makePlayer('Bob', 70),
        ]);
      });

      const alice = result.current.standings.find(s => s.username === 'Alice')!;
      const bob = result.current.standings.find(s => s.username === 'Bob')!;
      expect(alice.roundWins).toBe(2);
      expect(bob.roundWins).toBe(1);
    });

    it('should determine series leader by round wins, not total score', () => {
      const { result } = renderHook(() => useSeriesTracker());

      // Round 1: Alice wins with modest score
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 60),
          makePlayer('Bob', 50),
        ]);
      });

      // Round 2: Alice wins again
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 55),
          makePlayer('Bob', 50),
        ]);
      });

      // Round 3: Bob wins with huge blowout
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 30),
          makePlayer('Bob', 200),
        ]);
      });

      // Alice: 2 wins, 145 total. Bob: 1 win, 300 total.
      // Series leader should be Alice (more wins)
      expect(result.current.seriesLeader).toBe('Alice');
    });

    it('should break ties in round wins by total score', () => {
      const { result } = renderHook(() => useSeriesTracker());

      // Round 1: Alice wins
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      // Round 2: Bob wins
      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 50),
          makePlayer('Bob', 120),
        ]);
      });

      // Tied at 1 win each. Bob total = 200, Alice total = 150.
      expect(result.current.seriesLeader).toBe('Bob');
    });
  });

  describe('series length', () => {
    it('should expose totalGames constant', () => {
      const { result } = renderHook(() => useSeriesTracker());
      expect(result.current.totalGames).toBeGreaterThan(0);
    });

    it('should report isSeriesComplete when all games played', () => {
      const { result } = renderHook(() => useSeriesTracker());
      const total = result.current.totalGames;

      for (let i = 0; i < total; i++) {
        act(() => {
          result.current.recordRound([
            makePlayer('Alice', 100 + i),
            makePlayer('Bob', 80 + i),
          ]);
        });
      }

      expect(result.current.isSeriesComplete).toBe(true);
    });

    it('should not be complete before all games played', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([
          makePlayer('Alice', 100),
          makePlayer('Bob', 80),
        ]);
      });

      expect(result.current.isSeriesComplete).toBe(false);
    });
  });

  describe('duplicate round prevention', () => {
    it('should not record the same scores twice if called with identical data', () => {
      const { result } = renderHook(() => useSeriesTracker());
      const scores = [makePlayer('Alice', 100), makePlayer('Bob', 80)];

      act(() => {
        result.current.recordRound(scores);
      });

      act(() => {
        result.current.recordRound(scores);
      });

      // Should still be round 1 — same array reference = a double-fired effect
      expect(result.current.roundNumber).toBe(1);
    });

    it('should count two DISTINCT rounds that happen to have identical scores (vs-bots bug)', () => {
      const { result } = renderHook(() => useSeriesTracker());

      // Vs bots: human always 0, deterministic bots produce the SAME scores
      // every round. These are genuinely different rounds (different roundId)
      // and must both count, otherwise the series never reaches completion.
      act(() => {
        result.current.recordRound([makePlayer('You', 0), makePlayer('Bitsy', 120)], 1);
      });
      act(() => {
        result.current.recordRound([makePlayer('You', 0), makePlayer('Bitsy', 120)], 2);
      });

      expect(result.current.roundNumber).toBe(2);
    });

    it('should dedup by roundId when the same server round is re-emitted', () => {
      const { result } = renderHook(() => useSeriesTracker());

      act(() => {
        result.current.recordRound([makePlayer('Alice', 100), makePlayer('Bob', 80)], 7);
      });
      // Same gameSessionId re-broadcast (reconnect / late validation update)
      act(() => {
        result.current.recordRound([makePlayer('Alice', 110), makePlayer('Bob', 90)], 7);
      });

      expect(result.current.roundNumber).toBe(1);
    });

    it('completes a vs-bots series of identical-score rounds with distinct roundIds', () => {
      const { result } = renderHook(() => useSeriesTracker());
      const total = result.current.totalGames;

      for (let i = 0; i < total; i++) {
        act(() => {
          result.current.recordRound([makePlayer('You', 0), makePlayer('Bitsy', 120)], i + 1);
        });
      }

      expect(result.current.roundNumber).toBe(total);
      expect(result.current.isSeriesComplete).toBe(true);
    });
  });
});
