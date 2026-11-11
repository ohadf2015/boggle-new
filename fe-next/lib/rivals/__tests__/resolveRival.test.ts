import { describe, it, expect, vi } from 'vitest';
import { resolveRival, type RivalDeps, type RivalProfileRow } from '../resolveRival';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const recent = new Date(NOW - 3_600_000).toISOString();

const profile = (id: string, username: string, extra: Partial<RivalProfileRow> = {}): RivalProfileRow => ({
  id, username, display_name: null, chosen_title: null, current_level: null, avatar_config: null, avatar_image: null,
  country_code: null, language: null, last_seen_at: recent, ...extra,
});

function deps(over: Partial<RivalDeps> = {}): RivalDeps {
  return {
    h2hRows: vi.fn(async () => []),
    friendIds: vi.fn(async () => []),
    friendsOf: vi.fn(async () => []),
    coPlays: vi.fn(async () => []),
    profiles: vi.fn(async () => []),
    excludedIds: vi.fn(async () => []),
    dailyBoard: vi.fn(async () => []),
    quickPlayGhosts: vi.fn(async () => []),
    league: vi.fn(async () => ({ above: null, below: null, player: null })),
    weeklyGhost: vi.fn(async () => null),
    latestPing: vi.fn(async () => null),
    ...over,
  };
}

describe('resolveRival', () => {
  it('Given a friend and a lopsided h2h stranger, Then the friend is the rival, with why, title and ping', async () => {
    const d = deps({
      friendIds: vi.fn(async () => ['f']),
      h2hRows: vi.fn(async () => [{ player1_id: 'me', player2_id: 's', player1_wins: 9, player2_wins: 0, draws: 0, last_game_at: '2026-01-01T00:00:00Z' }]),
      profiles: vi.fn(async () => [profile('me', 'Me'), profile('f', 'Fay', { chosen_title: null, current_level: 1 }), profile('s', 'Sam')]),
      latestPing: vi.fn(async () => '2026-11-12T10:00:00Z'),
    });
    const r = await resolveRival(d, { mode: 'multiplayer', userId: 'me', now: NOW });
    expect(r).toMatchObject({ kind: 'related', userId: 'f', name: 'Fay', why: { kind: 'friend' }, pingedMeAt: '2026-11-12T10:00:00Z' });
    expect(d.latestPing).toHaveBeenCalledWith('me', 'f');
  });

  it('Given an h2h opponent, Then the record comes from my side', async () => {
    const d = deps({
      h2hRows: vi.fn(async () => [{ player1_id: 'b', player2_id: 'me', player1_wins: 3, player2_wins: 2, draws: 0, last_game_at: recent }]),
      profiles: vi.fn(async () => [profile('b', 'Bea')]),
    });
    expect(await resolveRival(d, { mode: 'multiplayer', userId: 'me', now: NOW }))
      .toMatchObject({ kind: 'h2h', userId: 'b', record: { wins: 2, losses: 3, draws: 0 }, why: { kind: 'playedTogether', count: 5 } });
  });

  it('Given a guest on the daily, Then the closest public score is the rival, skill only', async () => {
    const d = deps({
      dailyBoard: vi.fn(async () => [
        { identity: 'g:other', name: 'Gil', total: 520, publicName: true, customAvatar: null },
        { identity: 'u:hidden', name: 'Sneaky Potato', total: 505, publicName: false, customAvatar: null },
        { identity: 'g:fp1', name: 'Me', total: 500, publicName: false, customAvatar: null },
      ]),
    });
    const r = await resolveRival(d, { mode: 'daily', userId: null, guestFp: 'fp1', date: '2026-11-12', now: NOW });
    expect(r).toMatchObject({ kind: 'daily', name: 'Gil', theirScore: 520, myScore: 500, gap: 20, why: { kind: 'closeScore' } });
    expect(r?.userId).toBeUndefined();
    expect(d.friendIds).not.toHaveBeenCalled();
  });

  it('Given one shared game and a shared country, Then the country is the reason (one game earns no chip)', async () => {
    const d = deps({
      coPlays: vi.fn(async () => [{ userId: 'c', gameCode: 'G', at: '2026-10-20T00:00:00Z' }]),
      profiles: vi.fn(async () => [profile('me', 'Me', { country_code: 'IL' }), profile('c', 'Cleo', { country_code: 'IL' })]),
    });
    const r = await resolveRival(d, { mode: 'blast', userId: 'me', now: NOW });
    expect(r?.userId).toBe('c');
    expect(r?.why).toEqual({ kind: 'sameCountry', country: 'IL' });
  });

  it('Given a student candidate, Then they are skipped', async () => {
    const d = deps({
      friendIds: vi.fn(async () => ['kid']),
      profiles: vi.fn(async () => [profile('kid', 'Kid')]),
      excludedIds: vi.fn(async () => ['kid']),
    });
    expect(await resolveRival(d, { mode: 'single', userId: 'me', now: NOW })).toBeNull();
    expect(d.excludedIds).toHaveBeenCalledWith('me', ['kid']);
  });

  it('Given the shared country is the strongest reason, Then why carries the country code for the chip', async () => {
    const d = deps({
      league: vi.fn(async () => ({ above: { userId: 'c', username: 'Cleo', avatar: '', score: 900, position: 1 }, below: null, player: { position: 2, score: 100 } })),
      profiles: vi.fn(async () => [profile('me', 'Me', { country_code: 'IL' }), profile('c', 'Cleo', { country_code: 'IL' })]),
    });
    expect((await resolveRival(d, { mode: 'blast', userId: 'me', now: NOW }))?.why).toEqual({ kind: 'sameCountry', country: 'IL' });
  });

  it('Given a daily friend who did not play today versus a close stranger, Then the active friend still wins (relation over skill, by design)', async () => {
    const d = deps({
      friendIds: vi.fn(async () => ['f']),
      dailyBoard: vi.fn(async () => [
        { identity: 'u:s', name: 'Sam', total: 510, publicName: true, customAvatar: null },
        { identity: 'u:me', name: 'Me', total: 500, publicName: true, customAvatar: null },
      ]),
      profiles: vi.fn(async () => [profile('f', 'Fay'), profile('s', 'Sam')]),
    });
    const r = await resolveRival(d, { mode: 'daily', userId: 'me', date: '2026-11-12', now: NOW });
    expect(r).toMatchObject({ userId: 'f', kind: 'related', why: { kind: 'friend' } });
    expect(r?.gap).toBeUndefined();
  });

  it('Given the minors/blocks check fails, Then no signed-in player is offered', async () => {
    const d = deps({
      friendIds: vi.fn(async () => ['f']),
      profiles: vi.fn(async () => [profile('f', 'Fay')]),
      excludedIds: vi.fn(async () => { throw new Error('down'); }),
    });
    expect(await resolveRival(d, { mode: 'single', userId: 'me', now: NOW })).toBeNull();
  });

  it('Given a friend of a friend among co-players, Then they are marked', async () => {
    const d = deps({
      friendIds: vi.fn(async () => ['f']),
      friendsOf: vi.fn(async () => ['x']),
      coPlays: vi.fn(async () => [{ userId: 'x', gameCode: 'G', at: '2026-10-01T00:00:00Z' }]),
      profiles: vi.fn(async () => [profile('x', 'Xen')]),
    });
    expect((await resolveRival(d, { mode: 'tower', userId: 'me', now: NOW }))?.why).toEqual({ kind: 'friendOfFriend' });
  });

  it('Given failing sources, Then the others still produce a rival', async () => {
    const onError = vi.fn();
    const d = deps({
      onError,
      h2hRows: vi.fn(async () => { throw new Error('boom'); }),
      friendIds: vi.fn(async () => { throw new Error('boom'); }),
      weeklyGhost: vi.fn(async () => ({ rivalId: 'w', rivalScore: 900, playerScore: 800 })),
      profiles: vi.fn(async () => [profile('w', 'Wes')]),
    });
    expect(await resolveRival(d, { mode: 'single', userId: 'me', now: NOW })).toMatchObject({ kind: 'ghost', userId: 'w', gap: 100 });
    expect(onError).toHaveBeenCalledWith('h2h', expect.any(Error));
  });

  it('Given nobody, Then my previous best is the rival; without one, none', async () => {
    expect(await resolveRival(deps(), { mode: 'tower', userId: null, score: 40, previousBest: 55, now: NOW }))
      .toEqual({ kind: 'self', name: '', theirScore: 55, myScore: 40, gap: 15 });
    expect(await resolveRival(deps(), { mode: 'tower', userId: null, score: 40, now: NOW })).toBeNull();
  });

  it('Given edu, Then no lookup runs', async () => {
    const d = deps();
    expect(await resolveRival(d, { mode: 'edu', userId: 'me' })).toBeNull();
    expect(d.profiles).not.toHaveBeenCalled();
  });
});
