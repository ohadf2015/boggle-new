import { describe, it, expect } from 'vitest';
import { dailyStandingRows, placedWords, standingFloors, type DailyBoardRow } from '../dailyRails';

const row = (rank: number, username: string, bestHeightM: number, isYou = false): DailyBoardRow => ({ rank, username, bestHeightM, isYou });

describe('placedWords', () => {
  it('lists the standing floors in build order', () => {
    const labels = new Map([['a', 'stone'], ['b', 'roof'], ['c', 'tower']]);
    expect(placedWords(labels, null)).toEqual(['stone', 'roof', 'tower']);
  });

  it('leaves out the word still hanging on the crane', () => {
    const labels = new Map([['a', 'stone'], ['b', 'roof']]);
    expect(placedWords(labels, 'b')).toEqual(['stone']);
  });
});

describe('dailyStandingRows', () => {
  it('returns nothing while the board has not loaded', () => {
    expect(dailyStandingRows(null, 4, 'You')).toEqual([]);
  });

  it('stays empty before anyone has climbed, so a lone "You 0" never reads as first place', () => {
    expect(dailyStandingRows([], 0, 'You')).toEqual([]);
    expect(dailyStandingRows([row(1, 'ohad', 0, true)], 0.4, 'You')).toEqual([]);
  });

  it('shows me alone once I have grown', () => {
    expect(dailyStandingRows([], 2, 'You')).toEqual([{ id: 'me', name: 'You', score: 2, isMe: true }]);
  });

  it('adds me with my live growth when the board is short', () => {
    const rows = dailyStandingRows([row(1, 'dana', 12)], 3.6, 'You');
    expect(rows).toEqual([
      { id: 'r1-dana', name: 'dana', score: 12 },
      { id: 'me', name: 'You', score: 4, isMe: true },
    ]);
  });

  it('uses my live growth over a stale server score, keeping my name', () => {
    const rows = dailyStandingRows([row(1, 'dana', 12), row(2, 'ohad', 5, true)], 15.2, 'You');
    expect(rows.find((r) => r.isMe)).toEqual({ id: 'me', name: 'ohad', score: 15, isMe: true });
    expect(rows).toHaveLength(2);
  });

  it('keeps the server score when it is higher than this session', () => {
    const rows = dailyStandingRows([row(1, 'ohad', 9, true)], 2, 'You');
    expect(rows).toEqual([{ id: 'me', name: 'ohad', score: 9, isMe: true }]);
  });

  it('shows the top five and leaves me out when I am below them, so the row number never lies', () => {
    const board = [row(1, 'a', 30), row(2, 'b', 25), row(3, 'c', 20), row(4, 'd', 15), row(5, 'e', 10), row(6, 'f', 8), row(40, 'ohad', 1, true)];
    const rows = dailyStandingRows(board, 1, 'You');
    expect(rows.map((r) => r.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(rows.some((r) => r.isMe)).toBe(false);
  });

  it('puts me back in once my live growth reaches the fifth place', () => {
    const board = [row(1, 'a', 30), row(2, 'b', 25), row(3, 'c', 20), row(4, 'd', 15), row(5, 'e', 10), row(40, 'ohad', 1, true)];
    const rows = dailyStandingRows(board, 10, 'You');
    expect(rows).toHaveLength(6);
    expect(rows.at(-1)).toEqual({ id: 'me', name: 'ohad', score: 10, isMe: true });
  });
});

describe('standingFloors', () => {
  it('counts the floors the tower stands at, not every drop of the run', () => {
    expect(standingFloors(0)).toBe(0);
    expect(standingFloors(3)).toBe(1);
    expect(standingFloors(5.5)).toBe(1);
    expect(standingFloors(5.9)).toBe(2);
  });
});
