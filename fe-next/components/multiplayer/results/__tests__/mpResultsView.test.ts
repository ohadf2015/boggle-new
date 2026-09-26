import { describe, it, expect } from 'vitest';
import { pickVisibleRows, mascotFor, pickBestWord, rivalGap, nextModeForViewer, seriesPlacing, seriesLadder } from '../mpResultsView';
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
  it('no points means no trophy: a shared 0-point "1st" gets the oops face', () => {
    expect(mascotFor(1, 4, 0)).toBe('oops');
    expect(mascotFor(2, 4, 0)).toBe('oops');
    expect(mascotFor(2, 4, 12)).toBe('cheer');
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
  it('behind: measured to the nearest HIGHER score, never to a tied row above', () => {
    // Given Host 28, then P / Me / H all on 0 (shared rank 2)
    const tiedRows = [row('Host', 1, 28), row('P', 2, 0), row('Me', 2, 0, true), row('H', 2, 0)];
    // Then my gap is to the tie's leader-above, not "tied with P"
    expect(rivalGap(tiedRows)).toEqual({ kind: 'behind', name: 'Host', points: 28 });
  });
  it('tied at the top: names one co-leader and counts the rest', () => {
    const tiedTop = [row('A', 1, 10), row('Me', 1, 10, true), row('B', 1, 10), row('C', 4, 2)];
    expect(rivalGap(tiedTop)).toEqual({ kind: 'tied', name: 'A', more: 1 });
    expect(rivalGap([row('Me', 1, 7, true), row('B', 1, 7)])).toEqual({ kind: 'tied', name: 'B', more: 0 });
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

describe('nextModeForViewer', () => {
  it('the host sees the mode they picked (random included — each round re-rolls)', () => {
    expect(nextModeForViewer({ isHost: true, hostPick: 'classic' })).toBe('classic');
    expect(nextModeForViewer({ isHost: true, hostPick: 'random' })).toBe('random');
  });

  it('a joiner never sees a guessed mode: the server does not send the host pick, so their store holds its "random" default', () => {
    // Round-1 capture: host card read CLASSIC while every joiner read SURPRISE MODE.
    expect(nextModeForViewer({ isHost: false, hostPick: 'random' })).toBeNull();
    expect(nextModeForViewer({ isHost: false, hostPick: 'classic' })).toBeNull();
  });
});

describe('seriesPlacing (final screen of a series)', () => {
  const sRow = (username: string, rank: number, score: number, seriesTotal: number | null, isMe = false): MpStandingRow => ({
    username, rank, score, isMe, seriesTotal, seriesDelta: 0,
  });

  it('r4 capture: round 5 all on 0, host 94 over the series -> a 0-total joiner is 2nd of 4, 94 behind the champion (never "#1 tied")', () => {
    // Given the last round's server order (everyone 0) and the series totals
    const rows = [
      sRow('Host', 1, 0, 94),
      sRow('P', 1, 0, 0),
      sRow('T', 1, 0, 0, true),
      sRow('H', 1, 0, 0),
    ];
    // When the series placing is read for me
    const out = seriesPlacing(seriesLadder(rows)!);
    // Then it speaks about the series, not the tied last round
    expect(out).toEqual({
      rank: 2,
      total: 4,
      seriesTotal: 0,
      champions: ['Host'],
      gap: { kind: 'behind', name: 'Host', points: 94 },
    });
  });

  it('the champion reads 1st with the margin over the runner-up, whatever the last round order was', () => {
    const rows = [sRow('A', 1, 40, 120), sRow('Me', 2, 10, 150, true), sRow('B', 3, 0, 90)];
    expect(seriesPlacing(seriesLadder(rows)!)).toMatchObject({ rank: 1, seriesTotal: 150, champions: ['Me'], gap: { kind: 'ahead', name: 'A', points: 30 } });
  });

  it('shares 1st on equal totals (competition rank), naming every champion', () => {
    const rows = [sRow('A', 1, 5, 80, true), sRow('B', 2, 3, 80), sRow('C', 3, 1, 20)];
    expect(seriesPlacing(seriesLadder(rows)!)).toMatchObject({ rank: 1, champions: ['A', 'B'], gap: { kind: 'tied', name: 'B', more: 0 } });
  });

  it('crowns no series champion when nobody scored all series', () => {
    const rows = [sRow('A', 1, 0, 0), sRow('Me', 1, 0, 0, true)];
    expect(seriesPlacing(seriesLadder(rows)!)?.champions).toEqual([]);
  });

  it('is null without me in the room', () => {
    expect(seriesPlacing(seriesLadder([sRow('A', 1, 5, 5), sRow('B', 2, 1, 1)])!)).toBeNull();
  });
});

describe('seriesLadder (the final board of a series ranks the SERIES)', () => {
  const sRow = (username: string, rank: number, score: number, seriesTotal: number | null, seriesDelta = 0): MpStandingRow => ({
    username, rank, score, isMe: false, seriesTotal, seriesDelta,
  });

  it('r4 capture: a 0-point last round never ranks everyone #1 -- the champion leads, the rest share 2nd', () => {
    // Given round 5 all on 0 (server ranks 1,1,1,1) and series totals 94/0/0/0
    const rows = [sRow('P', 1, 0, 0), sRow('Host', 1, 0, 94), sRow('T', 1, 0, 0), sRow('H', 1, 0, 0)];
    // When the ladder is built
    const ladder = seriesLadder(rows)!;
    // Then the big number and rank are the series', the round points ride along
    expect(ladder.map((r) => r.username)).toEqual(['Host', 'P', 'T', 'H']);
    expect(ladder.map((r) => r.rank)).toEqual([1, 2, 2, 2]);
    expect(ladder.map((r) => r.score)).toEqual([94, 0, 0, 0]);
    expect(ladder.map((r) => r.roundScore)).toEqual([0, 0, 0, 0]);
  });

  it('the round-5 winner who lost the series sits 2nd, carrying its round points', () => {
    const rows = [sRow('P', 1, 30, 60), sRow('Host', 2, 5, 120), sRow('T', 3, 0, 0)];
    const ladder = seriesLadder(rows)!;
    expect(ladder.map((r) => [r.username, r.rank, r.score, r.roundScore])).toEqual([
      ['Host', 1, 120, 5],
      ['P', 2, 60, 30],
      ['T', 3, 0, 0],
    ]);
  });

  it('rank movement is derived from the totals shown (before vs after this round), never a stale tracker copy', () => {
    // Given A led 50-40 before the last round and B out-scored A 30-5 in it,
    // while the tracker still says nobody moved
    const rows = [sRow('B', 1, 30, 70, 0), sRow('A', 2, 5, 55, 0), sRow('C', 3, 0, 10, 0)];
    // When the ladder is built
    const ladder = seriesLadder(rows)!;
    // Then B climbed one, A dropped one, C held
    expect(ladder.map((r) => [r.username, r.seriesDelta])).toEqual([['B', 1], ['A', -1], ['C', 0]]);
  });

  it('a tie broken by the last round counts as a climb for the breaker only', () => {
    // Before: A 40, B 40 (both 1st). After: A 40, B 45.
    const rows = [sRow('B', 1, 5, 45), sRow('A', 2, 0, 40)];
    expect(seriesLadder(rows)!.map((r) => [r.username, r.rank, r.seriesDelta])).toEqual([['B', 1, 0], ['A', 2, -1]]);
  });

  it('is null without series totals (round 1 / no series)', () => {
    expect(seriesLadder([sRow('A', 1, 5, null)])).toBeNull();
    expect(seriesLadder([])).toBeNull();
  });
});
