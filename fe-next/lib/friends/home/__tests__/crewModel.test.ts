import { describe, it, expect } from 'vitest';
import { crewStatus, crewAction, sortCrew, h2hLine, statusLine, homeCrew, HOME_CREW_CAP } from '../crewModel';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const person = (userId: string, lastSeenMsAgo: number | null, wins = 0, losses = 0) => ({
  userId,
  lastSeenAt: lastSeenMsAgo == null ? null : ago(lastSeenMsAgo),
  wins,
  losses,
});

describe('crewStatus', () => {
  it('Given a friend in a public lobby, Then in_lobby wins over last-seen', () => {
    expect(crewStatus(person('a', 86_400_000), { userId: 'a', status: 'in_lobby', gameCode: 'X' }, NOW)).toBe('in_lobby');
  });
  it('Given a friend in a private room, Then they read as playing', () => {
    expect(crewStatus(person('a', 0), { userId: 'a', status: 'private' }, NOW)).toBe('playing');
  });
  it('Given no room but seen 2 minutes ago, Then online; an hour ago, offline', () => {
    expect(crewStatus(person('a', 120_000), undefined, NOW)).toBe('online');
    expect(crewStatus(person('a', 3_600_000), undefined, NOW)).toBe('offline');
  });
});

describe('crewAction', () => {
  it('Given a joinable room, Then Join with its code', () => {
    expect(crewAction('in_lobby', { userId: 'a', status: 'in_lobby', gameCode: 'ROOM' })).toEqual({ kind: 'join', code: 'ROOM' });
    expect(crewAction('playing', { userId: 'a', status: 'playing', gameCode: 'ROOM' })).toEqual({ kind: 'join', code: 'ROOM' });
  });
  it('Given an online friend with no open room, Then Invite', () => {
    expect(crewAction('online', undefined)).toEqual({ kind: 'invite' });
  });
  it('Given an offline friend, Then a ping with free-time lines, never a dead row', () => {
    expect(crewAction('offline', undefined)).toEqual({ kind: 'ping', situation: 'friendFree' });
  });
  it('Given a friend in a private game, Then a ping with in-game lines', () => {
    expect(crewAction('playing', { userId: 'a', status: 'private' })).toEqual({ kind: 'ping', situation: 'friendPlaying' });
  });
});

describe('sortCrew', () => {
  it('Given mixed states, Then rooms first, then online, then most recently seen', () => {
    const people = [person('old', 86_400_000 * 3), person('recent', 3_600_000 * 2), person('online', 60_000), person('lobby', 86_400_000 * 9)];
    const presence = new Map([['lobby', { userId: 'lobby', status: 'in_lobby' as const, gameCode: 'X' }]]);
    expect(sortCrew(people, presence, NOW).map((p) => p.userId)).toEqual(['lobby', 'online', 'recent', 'old']);
  });
});

describe('h2hLine', () => {
  it('Given records, Then the right sentence and score', () => {
    expect(h2hLine(3, 1)).toEqual({ key: 'homePlay.crew.youLead', params: { score: '\u20663–1\u2069' } });
    expect(h2hLine(1, 2)).toEqual({ key: 'homePlay.crew.theyLead', params: { score: '\u20662–1\u2069' } });
    expect(h2hLine(2, 2)).toEqual({ key: 'homePlay.crew.tied', params: { score: '\u20662–2\u2069' } });
    expect(h2hLine(0, 0)).toEqual({ key: 'homePlay.crew.firstMatch', params: {} });
  });
});

describe('statusLine', () => {
  it('Given each status, Then a short line', () => {
    expect(statusLine('in_lobby', null, NOW)).toEqual({ key: 'homePlay.crew.inLobby', params: {} });
    expect(statusLine('playing', null, NOW)).toEqual({ key: 'homePlay.crew.playingNow', params: {} });
    expect(statusLine('online', null, NOW)).toEqual({ key: 'friends.status.online', params: {} });
    expect(statusLine('offline', ago(2 * 3_600_000), NOW)).toEqual({ key: 'homePlay.crew.seen', params: {}, when: { key: 'friends.status.hoursAgo', params: { count: 2 } } });
    expect(statusLine('offline', null, NOW)).toEqual({ key: 'friends.status.offline', params: {} });
  });
});

describe('homeCrew', () => {
  const DAY = 86_400_000;
  it('Given friends unseen for weeks, Then they stay off home while active friends exist', () => {
    const people = [person('fresh', DAY), person('stale', 30 * DAY), person('never', null)];
    const { shown, more } = homeCrew(people, new Map(), NOW);
    expect(shown.map((p) => p.userId)).toEqual(['fresh']);
    expect(more).toEqual([]);
  });
  it('Given a stale friend sitting in a live room, Then they still show', () => {
    const presence = new Map([['stale', { userId: 'stale', status: 'in_lobby' as const, gameCode: 'X' }]]);
    expect(homeCrew([person('stale', 40 * DAY)], presence, NOW).shown.map((p) => p.userId)).toEqual(['stale']);
  });
  it('Given more active friends than the cap, Then the first ones show and the rest wait behind See more', () => {
    const people = Array.from({ length: 7 }, (_, i) => person(`f${i}`, (i + 1) * 3_600_000));
    const { shown, more } = homeCrew(people, new Map(), NOW);
    expect(HOME_CREW_CAP).toBe(4);
    expect(shown.map((p) => p.userId)).toEqual(['f0', 'f1', 'f2', 'f3']);
    expect(more.map((p) => p.userId)).toEqual(['f4', 'f5', 'f6']);
  });
  it('Given every friend is stale, Then the most recent few show so the card still has someone to ping', () => {
    const people = [person('a', 60 * DAY), person('b', 20 * DAY), person('c', null)];
    const { shown } = homeCrew(people, new Map(), NOW);
    expect(shown.map((p) => p.userId)).toEqual(['b', 'a', 'c']);
  });
});
