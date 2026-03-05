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

      // Should still be round 1 since scores are identical
      expect(result.current.roundNumber).toBe(1);
    });
  });
});
