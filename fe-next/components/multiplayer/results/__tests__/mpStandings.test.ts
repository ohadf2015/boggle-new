import { describe, it, expect } from 'vitest';
import { buildMpStandings } from '../mpStandings';

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

describe('buildMpStandings', () => {
  it('keeps the server order and the server score on every row (the live leaderboard numbers)', () => {
    // Given the server's sorted final scores
    const sorted = [
      { username: 'Maya', score: 312 },
      { username: 'Leo', score: 268 },
      { username: 'You', score: 120 },
    ];
    // When the standings are built
    const rows = buildMpStandings({ sortedScores: sorted, username: 'You', normalizeUsername: norm });
    // Then the order, the rank and the number are exactly the payload's
    expect(rows.map((r) => [r.username, r.rank, r.score])).toEqual([
      ['Maya', 1, 312],
      ['Leo', 2, 268],
      ['You', 3, 120],
    ]);
  });

  it('marks me with the same normalisation the rank uses (trim + case)', () => {
    const rows = buildMpStandings({
      sortedScores: [{ username: 'PlayerOne', score: 5 }, { username: 'B', score: 1 }],
      username: ' playerone ',
      normalizeUsername: norm,
    });
    expect(rows[0].isMe).toBe(true);
    expect(rows[1].isMe).toBe(false);
  });

  it('adds no series line on the first round', () => {
    const rows = buildMpStandings({
      sortedScores: [{ username: 'A', score: 10 }],
      username: 'A',
      normalizeUsername: norm,
      series: { roundNumber: 1, standings: [{ username: 'A', totalScore: 10, roundScores: [10], rankChange: 0 }] },
    });
    expect(rows[0].seriesTotal).toBeNull();
    expect(rows[0].seriesDelta).toBe(0);
  });

  it('from round 2 carries the series total built on THIS round\'s server score', () => {
    // Given the tracker kept an earlier (pre-validation) snapshot of this round: 40
    // and the server now says 55 for this round
    const rows = buildMpStandings({
      sortedScores: [{ username: 'A', score: 55 }, { username: 'B', score: 30 }],
      username: 'A',
      normalizeUsername: norm,
      series: {
        roundNumber: 2,
        standings: [
          { username: 'A', totalScore: 140, roundScores: [100, 40], rankChange: 0 },
          { username: 'B', totalScore: 80, roundScores: [50, 30], rankChange: 1 },
        ],
      },
    });
    // Then the total is previous rounds + the live number, never the stale one
    expect(rows[0].seriesTotal).toBe(155);
    expect(rows[1].seriesTotal).toBe(80);
    expect(rows[1].seriesDelta).toBe(1);
  });

  it('a player new to the series gets their round score as total', () => {
    const rows = buildMpStandings({
      sortedScores: [{ username: 'New', score: 20 }],
      username: 'x',
      normalizeUsername: norm,
      series: { roundNumber: 3, standings: [] },
    });
    expect(rows[0].seriesTotal).toBe(20);
  });

  it('treats a missing score as 0 and never produces NaN', () => {
    const rows = buildMpStandings({
      sortedScores: [{ username: 'A' } as { username: string; score: number }],
      username: 'A',
      normalizeUsername: norm,
    });
    expect(rows[0].score).toBe(0);
  });
});
