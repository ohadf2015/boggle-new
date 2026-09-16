/**
 * Who won the LESSON, not who won the last round.
 *
 * Every classroom rematch runs `resetScoresForNewRound`
 * (`gameStateManager.ts:332`), so each round's podium is its own reset-to-zero
 * contest and nothing anywhere adds them up. A teacher who ran three rounds in
 * one period reported, 2026-09-14: "by the end we weren't sure who had actually
 * won." She was right — no screen could tell her.
 *
 * Pure so the arithmetic is testable without Redis: the caller owns the read
 * and the write, this owns the sum and the order.
 */
import { describe, it, expect } from 'vitest';
import {
  accumulateSessionScores,
  toSessionStandings,
} from '../classroomSessionScores';

const round = (...pairs: [string, number][]) =>
  pairs.map(([username, totalScore]) => ({ username, totalScore }));

describe('accumulateSessionScores', () => {
  it('starts a session from the first round', () => {
    expect(accumulateSessionScores(undefined, round(['ana', 30], ['bo', 10]))).toEqual({
      ana: { name: 'ana', score: 30, rounds: 1 },
      bo: { name: 'bo', score: 10, rounds: 1 },
    });
  });

  it('adds a second round onto the running totals', () => {
    const after1 = accumulateSessionScores(undefined, round(['ana', 30], ['bo', 10]));
    expect(accumulateSessionScores(after1, round(['ana', 5], ['bo', 40]))).toEqual({
      ana: { name: 'ana', score: 35, rounds: 2 },
      bo: { name: 'bo', score: 50, rounds: 2 },
    });
  });

  /** Arriving late is normal in a classroom — it must not erase the round. */
  it('admits a student who joins for round two only', () => {
    const after1 = accumulateSessionScores(undefined, round(['ana', 30]));
    const after2 = accumulateSessionScores(after1, round(['ana', 5], ['cy', 20]));
    expect(after2).toEqual({
      ana: { name: 'ana', score: 35, rounds: 2 },
      cy: { name: 'cy', score: 20, rounds: 1 },
    });
  });

  /** A student who sits a round out keeps their total and their round count. */
  it('leaves an absent student untouched', () => {
    const after1 = accumulateSessionScores(undefined, round(['ana', 30], ['bo', 10]));
    expect(accumulateSessionScores(after1, round(['ana', 5]))).toEqual({
      ana: { name: 'ana', score: 35, rounds: 2 },
      bo: { name: 'bo', score: 10, rounds: 1 },
    });
  });

  /**
   * The teacher holds a socket but never plays, and bots are not the class.
   * Both sorted onto real podiums before `buildClassroomPodium` excluded them.
   */
  it('excludes the teacher and any bot', () => {
    const players = [
      { username: 'ana', totalScore: 30 },
      { username: 'Ms. G', totalScore: 0 },
      { username: 'RoboBot', totalScore: 99, isBot: true },
    ];
    expect(accumulateSessionScores(undefined, players, ['Ms. G'])).toEqual({
      ana: { name: 'ana', score: 30, rounds: 1 },
    });
  });

  /**
   * A guest student retypes their nickname on every join, so capitalisation
   * drifts between rounds. Two half-scored rows for one child is the bug.
   */
  it('treats a nickname retyped with different capitalisation as one student', () => {
    const after1 = accumulateSessionScores(undefined, round(['Ana', 30]));
    const after2 = accumulateSessionScores(after1, round(['ana', 5]));
    expect(toSessionStandings(after2)).toEqual([
      { username: 'Ana', totalScore: 35, roundsPlayed: 2, rank: 1 },
    ]);
  });

  it('matches the excluded name regardless of case or padding', () => {
    const players = [{ username: 'ana', totalScore: 30 }, { username: 'Ms. G', totalScore: 0 }];
    expect(accumulateSessionScores(undefined, players, ['  ms. g  '])).toEqual({
      ana: { name: 'ana', score: 30, rounds: 1 },
    });
  });
});

describe('toSessionStandings', () => {
  it('ranks the class best-first', () => {
    const standings = toSessionStandings({
      ana: { name: 'ana', score: 35, rounds: 2 },
      bo: { name: 'bo', score: 50, rounds: 2 },
      cy: { name: 'cy', score: 20, rounds: 1 },
    });
    expect(standings).toEqual([
      { username: 'bo', totalScore: 50, roundsPlayed: 2, rank: 1 },
      { username: 'ana', totalScore: 35, roundsPlayed: 2, rank: 2 },
      { username: 'cy', totalScore: 20, roundsPlayed: 1, rank: 3 },
    ]);
  });

  /** Two names on one projector must not swap places between renders. */
  it('breaks a tie by name so the order is stable', () => {
    const standings = toSessionStandings({
      zoe: { name: 'zoe', score: 10, rounds: 1 },
      abe: { name: 'abe', score: 10, rounds: 1 },
    });
    expect(standings.map((s) => s.username)).toEqual(['abe', 'zoe']);
    expect(standings.map((s) => s.rank)).toEqual([1, 2]);
  });

  it('is empty for a session that has not scored', () => {
    expect(toSessionStandings(undefined)).toEqual([]);
  });
});
