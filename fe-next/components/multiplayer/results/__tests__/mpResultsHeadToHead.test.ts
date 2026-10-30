import { describe, it, expect } from 'vitest';
import { resultCallout, calloutRival } from '../mpResultsStory';
import { buildMpStandings, type MpStandingRow } from '../mpStandings';

const row = (username: string, rank: number, score: number, extra: Partial<MpStandingRow> = {}): MpStandingRow => ({
  username, rank, score, isMe: false, seriesTotal: null, seriesDelta: 0, ...extra,
});
const me = (username: string, rank: number, score: number, extra: Partial<MpStandingRow> = {}) => row(username, rank, score, { isMe: true, ...extra });

const rows = [row('Maya', 1, 300, { userId: 'u-maya' }), me('Me', 2, 200, { userId: 'u-me' }), row('Leo', 3, 100)];
const record = (over: Partial<{ name: string; myWins: number; theirWins: number; meetings: number }> = {}) => ({
  name: 'Maya', myWins: 4, theirWins: 2, meetings: 6, ...over,
});

describe('buildMpStandings carries the server user id', () => {
  it('Given a signed-in row with userId and a guest row without, Then only the signed-in row has it', () => {
    const out = buildMpStandings({
      sortedScores: [{ username: 'Maya', score: 3, userId: 'u-maya' }, { username: 'Guest', score: 1 }],
      username: 'Guest',
      normalizeUsername: (n) => (n ?? '').toLowerCase(),
    });
    expect(out[0].userId).toBe('u-maya');
    expect(out[1].userId).toBeUndefined();
  });
});

describe('calloutRival (whose record the callout may quote)', () => {
  it('Given I trail Maya, Then the rival is Maya with her user id', () => {
    expect(calloutRival(rows)).toEqual({ username: 'Maya', userId: 'u-maya' });
  });

  it('Given the rival is a guest (no user id), Then there is no rival to look up', () => {
    expect(calloutRival([me('Me', 1, 300), row('Leo', 2, 100)])).toBeNull();
  });

  it('Given the rival is a bot, Then there is no rival to look up', () => {
    expect(calloutRival([me('Me', 1, 300), row('Bot', 2, 100, { isBot: true, userId: 'x' })])).toBeNull();
  });

  it('Given I am not in the room, Then there is no rival', () => {
    expect(calloutRival([row('A', 1, 3, { userId: 'a' }), row('B', 2, 1, { userId: 'b' })])).toBeNull();
  });
});

describe('resultCallout with a head-to-head record', () => {
  it('Given 6 meetings with Maya and I lead 4-2, Then the callout is the record', () => {
    expect(resultCallout({ rows, uniqueCount: 3, h2h: record() })).toEqual({ kind: 'h2h', name: 'Maya', mine: 4, theirs: 2 });
  });

  it('Given only 1 prior meeting, Then the record is not quoted', () => {
    expect(resultCallout({ rows, uniqueCount: 0, h2h: record({ myWins: 1, theirWins: 0, meetings: 1 }) })?.kind).toBe('lost');
  });

  it('Given zero history (no record), Then the usual callout stands', () => {
    expect(resultCallout({ rows, uniqueCount: 0, h2h: null })?.kind).toBe('lost');
  });

  it('Given a record for someone other than the callout rival, Then it is ignored', () => {
    expect(resultCallout({ rows, uniqueCount: 0, h2h: record({ name: 'Leo' }) })?.kind).toBe('lost');
  });

  it('Given a photo finish, Then the photo finish still wins over the record', () => {
    const close = [row('Maya', 1, 205, { userId: 'u-maya' }), me('Me', 2, 200)];
    expect(resultCallout({ rows: close, uniqueCount: 0, h2h: record() })?.kind).toBe('photoFinish');
  });

  it('Given a series comeback, Then the record still comes first', () => {
    const climbed = [row('Maya', 1, 300, { userId: 'u-maya' }), me('Me', 2, 200, { seriesDelta: 2 })];
    expect(resultCallout({ rows: climbed, uniqueCount: 0, h2h: record() })?.kind).toBe('h2h');
  });
});
