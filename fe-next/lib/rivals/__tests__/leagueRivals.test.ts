import { describe, it, expect } from 'vitest';
import { pickLeagueNeighbors, type LeagueMemberRow } from '../leagueRivals';

const m = (user_id: string, weekly_xp: number, username: string, joined_at = '2026-11-10T00:00:00Z'): LeagueMemberRow => ({
  user_id, weekly_xp, joined_at, display_name: null, profiles: { username, avatar_image: '' },
});

describe('pickLeagueNeighbors', () => {
  it('Given a league, Then the nearest public-named players above and below are picked at their true positions', () => {
    const r = pickLeagueNeighbors([
      m('a', 500, 'Ann'),
      m('b', 400, 'Player_bbbb2222'),
      m('me', 300, 'Me'),
      m('c', 200, 'shit'),
      m('d', 100, 'Dov'),
    ], 'me');
    expect(r.player).toEqual({ position: 3, score: 300 });
    expect(r.above).toMatchObject({ userId: 'a', username: 'Ann', position: 1, score: 500 });
    expect(r.below).toMatchObject({ userId: 'd', username: 'Dov', position: 5, score: 100 });
  });

  it('Given equal XP, Then the earlier joiner ranks higher', () => {
    const r = pickLeagueNeighbors([m('me', 100, 'Me', '2026-11-10T02:00:00Z'), m('x', 100, 'Xen', '2026-11-10T01:00:00Z')], 'me');
    expect(r.player?.position).toBe(2);
    expect(r.above?.userId).toBe('x');
  });

  it('Given the player is not in the league, Then nothing is returned', () => {
    expect(pickLeagueNeighbors([m('a', 1, 'Ann')], 'me')).toEqual({ above: null, below: null, player: null });
  });
});
