import { describe, it, expect } from 'vitest';
import { resultCallout } from '../mpResultsStory';
import type { MpStandingRow } from '../mpStandings';

const row = (username: string, rank: number, score: number, extra: Partial<MpStandingRow> = {}): MpStandingRow => ({
  username, rank, score, isMe: false, seriesTotal: null, seriesDelta: 0, ...extra,
});
const me = (username: string, rank: number, score: number, extra: Partial<MpStandingRow> = {}) => row(username, rank, score, { isMe: true, ...extra });

describe('resultCallout (one rivalry line under my card)', () => {
  it('Given no rows, Then there is no callout', () => {
    expect(resultCallout({ rows: [], uniqueCount: 0 })).toBeNull();
  });

  it('Given I played alone, Then there is no rival to talk about', () => {
    expect(resultCallout({ rows: [me('Me', 1, 40)], uniqueCount: 0 })).toBeNull();
  });

  it('Given I am not in the room, Then there is no callout', () => {
    expect(resultCallout({ rows: [row('A', 1, 30), row('B', 2, 20)], uniqueCount: 2 })).toBeNull();
  });

  it('Given I won by 8 points, Then it is a photo finish I won', () => {
    const out = resultCallout({ rows: [me('Me', 1, 108), row('Leo', 2, 100)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'photoFinish', won: true, name: 'Leo', points: 8 });
  });

  it('Given I lost by 4% of a big score, Then it is a photo finish I lost', () => {
    const out = resultCallout({ rows: [row('Maya', 1, 500), me('Me', 2, 480)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'photoFinish', won: false, name: 'Maya', points: 20 });
  });

  it('Given the photo finish is between two other players, Then my own gap is told instead', () => {
    const out = resultCallout({ rows: [row('A', 1, 100), row('B', 2, 98), me('Me', 3, 40)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'lost', name: 'B', points: 58 });
  });

  it('Given a tie on top, Then it reads as a tie, never a photo finish', () => {
    const out = resultCallout({ rows: [me('Me', 1, 50), row('Leo', 1, 50), row('Kai', 3, 10)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'tied', name: 'Leo', more: 0 });
  });

  it('Given an all-zero room, Then no photo finish (and a tie on zero)', () => {
    const out = resultCallout({ rows: [me('Me', 1, 0), row('Leo', 1, 0)], uniqueCount: 0 });
    expect(out?.kind).toBe('tied');
  });

  it('Given I climbed the series ladder, Then the comeback beats a plain win', () => {
    const out = resultCallout({ rows: [me('Me', 1, 300, { seriesDelta: 2 }), row('Leo', 2, 200)], uniqueCount: 3 });
    expect(out).toEqual({ kind: 'comeback', places: 2 });
  });

  it('Given a photo finish AND a climb, Then the photo finish wins the slot', () => {
    const out = resultCallout({ rows: [me('Me', 1, 105, { seriesDelta: 1 }), row('Leo', 2, 100)], uniqueCount: 0 });
    expect(out?.kind).toBe('photoFinish');
  });

  it('Given a clear win, Then "you beat X by N"', () => {
    const out = resultCallout({ rows: [me('Me', 1, 90), row('Leo', 2, 40)], uniqueCount: 5 });
    expect(out).toEqual({ kind: 'beat', name: 'Leo', points: 50 });
  });

  it('Given a clear loss with words only I found, Then the unique find is the consolation', () => {
    const out = resultCallout({ rows: [row('Leo', 1, 90), me('Me', 2, 40)], uniqueCount: 3 });
    expect(out).toEqual({ kind: 'unique', count: 3 });
  });

  it('Given a clear loss and no unique words, Then "X edged you by N"', () => {
    const out = resultCallout({ rows: [row('Leo', 1, 90), me('Me', 2, 40)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'lost', name: 'Leo', points: 50 });
  });

  it('Given a tie for 2nd below a leader, Then the chase to the leader is told', () => {
    const out = resultCallout({ rows: [row('A', 1, 90), me('Me', 2, 30), row('B', 2, 30)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'lost', name: 'A', points: 60 });
  });

  it('Given a tie with more players, Then the tie counts the others', () => {
    const out = resultCallout({ rows: [me('Me', 1, 20), row('A', 1, 20), row('B', 1, 20)], uniqueCount: 0 });
    expect(out).toEqual({ kind: 'tied', name: 'A', more: 1 });
  });
});
