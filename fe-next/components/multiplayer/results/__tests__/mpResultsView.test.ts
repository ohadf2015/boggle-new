import { describe, it, expect } from 'vitest';
import { pickVisibleRows, mascotFor, pickBestWord, rivalGap } from '../mpResultsView';
import type { MpStandingRow } from '../mpStandings';

const row = (username: string, rank: number, score: number, isMe = false): MpStandingRow => ({
  username, rank, score, isMe, seriesTotal: null, seriesDelta: 0,
});

describe('pickVisibleRows', () => {
  it('shows everyone when the room fits', () => {
    const rows = [row('a', 1, 9), row('b', 2, 8), row('c', 3, 7)];
    expect(pickVisibleRows(rows, 8)).toEqual({ rows, hiddenCount: 0 });
  });

  it('keeps me visible in a big room: top (max-1) plus my row, counting the hidden', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`p${i + 1}`, i + 1, 100 - i, i === 10));
    const out = pickVisibleRows(rows, 8);
    expect(out.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 11]);
    expect(out.hiddenCount).toBe(4);
  });

  it('when I am in the top slice, it is just the top slice', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`p${i + 1}`, i + 1, 100 - i, i === 2));
    const out = pickVisibleRows(rows, 8);
    expect(out.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out.hiddenCount).toBe(2);
  });
});

describe('mascotFor', () => {
  it('trophy for the winner, cheer for the top half, think below, oops for last in a real room', () => {
    expect(mascotFor(1, 4)).toBe('victory');
    expect(mascotFor(2, 4)).toBe('cheer');
    expect(mascotFor(3, 4)).toBe('think');
    expect(mascotFor(4, 4)).toBe('oops');
    expect(mascotFor(2, 2)).toBe('think');
    expect(mascotFor(1, 1)).toBe('victory');
  });
});

describe('pickBestWord', () => {
  it('picks the highest-scoring valid, non-duplicate word (longest breaks ties)', () => {
    expect(pickBestWord([
      { word: 'cat', score: 3, validated: true },
      { word: 'quartz', score: 24, validated: true, isDuplicate: true },
      { word: 'jumble', score: 18, validated: true },
      { word: 'zebra', score: 18, validated: true },
      { word: 'xyzzy', score: 40, validated: false },
    ])).toEqual({ word: 'jumble', score: 18 });
  });

  it('returns null when nothing counted', () => {
    expect(pickBestWord([])).toBeNull();
    expect(pickBestWord(undefined)).toBeNull();
  });
});

describe('rivalGap', () => {
  const rows = [row('Maya', 1, 312), row('Me', 2, 300, true), row('Leo', 3, 120)];
  it('behind: how far to the player above', () => {
    expect(rivalGap(rows)).toEqual({ kind: 'behind', name: 'Maya', points: 12 });
  });
  it('winner: the margin over 2nd', () => {
    expect(rivalGap([row('Me', 1, 50, true), row('B', 2, 20)])).toEqual({ kind: 'ahead', name: 'B', points: 30 });
  });
  it('solo or not ranked: nothing', () => {
    expect(rivalGap([row('Me', 1, 50, true)])).toBeNull();
    expect(rivalGap([row('A', 1, 50)])).toBeNull();
  });
});

describe('readyTally', () => {
  it('counts non-host players; bots are always ready; the host is never counted (host starts, not readies)', async () => {
    const { readyTally } = await import('../mpResultsView');
    const players = [
      { username: 'Host', isHost: true },
      { username: 'Ann' },
      { username: 'Bob' },
      { username: 'Bot1', isBot: true },
    ];
    expect(readyTally(players, ['Ann'])).toEqual({ ready: 2, total: 3, readySet: new Set(['Ann', 'Bot1']) });
  });

  it('a room with only the host still reports a sane total', async () => {
    const { readyTally } = await import('../mpResultsView');
    expect(readyTally([{ username: 'Host', isHost: true }], [])).toEqual({ ready: 0, total: 0, readySet: new Set() });
  });
});
