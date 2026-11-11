import { describe, it, expect } from 'vitest';
import { rankRivals, type Candidate, type MeProfile, type CandidateProfile } from '../rankRivals';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const me: MeProfile = { countryCode: 'IL', language: 'he' };
const prof = (over: Partial<CandidateProfile> = {}): CandidateProfile => ({
  name: 'X', title: null, avatar: null, countryCode: null, language: null, lastSeenAt: daysAgo(10), isStudent: false, ...over,
});
const cand = (key: string, over: Partial<Candidate> = {}): Candidate => ({ key, userId: key, ...over });

function rank(cands: Candidate[], profiles: Record<string, CandidateProfile>, opts: Partial<Parameters<typeof rankRivals>[0]> = {}) {
  return rankRivals({ mode: 'daily', candidates: cands, profiles: new Map(Object.entries(profiles)), me, myScore: 500, now: NOW, ...opts });
}

describe('rankRivals', () => {
  it('Given a friend and a stranger at the same score, Then the friend wins and the reason is "friend"', () => {
    const [top] = rank(
      [cand('s', { skill: { source: 'daily', theirs: 510 } }), cand('f', { skill: { source: 'daily', theirs: 510 }, friend: true })],
      { s: prof({ name: 'Stranger' }), f: prof({ name: 'Friend' }) },
    );
    expect(top.key).toBe('f');
    expect(top.why).toEqual({ kind: 'friend' });
  });

  it('Given repeat co-players, Then more recent shared games rank higher and the count is the reason', () => {
    const [top] = rank(
      [cand('a', { coPlay: { count: 1, lastAt: daysAgo(20) } }), cand('b', { coPlay: { count: 4, lastAt: daysAgo(2) } })],
      { a: prof(), b: prof() },
    );
    expect(top.key).toBe('b');
    expect(top.why).toEqual({ kind: 'playedTogether', count: 4 });
  });

  it('Given only score data, Then the closest score wins, slightly ahead beating slightly behind', () => {
    const ranked = rank(
      [cand('far', { skill: { source: 'daily', theirs: 900 } }), cand('behind', { skill: { source: 'daily', theirs: 490 } }), cand('ahead', { skill: { source: 'daily', theirs: 510 } })],
      { far: prof(), behind: prof(), ahead: prof() },
    );
    expect(ranked.map((r) => r.key)).toEqual(['ahead', 'behind', 'far']);
    expect(ranked[0].why).toEqual({ kind: 'closeScore' });
  });

  it('Given a stale player not on today\'s board, Then they are excluded; on the board they stay', () => {
    const ranked = rank(
      [cand('stale', { skill: { source: 'daily', theirs: 505 } }), cand('board', { skill: { source: 'daily', theirs: 600 }, onTodayBoard: true })],
      { stale: prof({ lastSeenAt: daysAgo(30) }), board: prof({ lastSeenAt: daysAgo(30) }) },
    );
    expect(ranked.map((r) => r.key)).toEqual(['board']);
  });

  it('Given recent activity, Then it breaks a tie in favour of the active player', () => {
    const [top] = rank(
      [cand('old', { skill: { source: 'daily', theirs: 510 } }), cand('fresh', { skill: { source: 'daily', theirs: 510 } })],
      { old: prof({ lastSeenAt: daysAgo(6) }), fresh: prof({ lastSeenAt: daysAgo(0.5) }) },
    );
    expect(top.key).toBe('fresh');
  });

  it('Given same country and language, Then the shared country is the reason over plain closeness when skill is weak', () => {
    const [top] = rank(
      [cand('a', { fof: false }), cand('b')],
      { a: prof({ countryCode: 'IL', language: 'he' }), b: prof() },
    );
    expect(top.key).toBe('a');
    expect(top.why).toEqual({ kind: 'sameCountry' });
  });

  it('Given a friend of a friend, Then they outrank a same-country stranger', () => {
    const [top] = rank([cand('c'), cand('f2', { fof: true })], { c: prof({ countryCode: 'IL' }), f2: prof() });
    expect(top.key).toBe('f2');
    expect(top.why).toEqual({ kind: 'friendOfFriend' });
  });

  it('Given a close head-to-head record, Then it earns the balance reason', () => {
    const [top] = rank([cand('h', { record: { wins: 3, losses: 3, draws: 0 } })], { h: prof() }, { mode: 'multiplayer' });
    expect(top.why?.kind).toBe('playedTogether');
    expect(top.score).toBeGreaterThan(0);
    const [solo] = rank([cand('h', { record: { wins: 0, losses: 0, draws: 1 } })], { h: prof() }, { mode: 'multiplayer' });
    expect(solo.score).toBeGreaterThan(0);
    expect(solo.why).toBeNull();
  });

  it('Given a student, a non-public name or myself, Then they are never picked', () => {
    const ranked = rank(
      [cand('kid'), cand('anon'), cand('me')],
      { kid: prof({ isStudent: true }), me: prof() },
      { myUserId: 'me' },
    );
    expect(ranked).toEqual([]);
  });

  it('Given a guest-only daily row with no profile, Then it is ranked on skill from the board name', () => {
    const [top] = rank([cand('g:x', { userId: undefined, boardName: 'Gil', skill: { source: 'daily', theirs: 520 }, onTodayBoard: true })], {});
    expect(top).toMatchObject({ key: 'g:x', name: 'Gil', why: { kind: 'closeScore' } });
  });
});
