import { describe, it, expect } from 'vitest';
import { enrichLeagueStandings } from './enrichStandings';

const row = (user_id: string, weekly_xp: number, username = user_id) => ({
  user_id,
  weekly_xp,
  profiles: { username, avatar_image: null },
});

describe('enrichLeagueStandings', () => {
  it('assigns 1-based position from descending order', () => {
    const out = enrichLeagueStandings([row('a', 300), row('b', 200), row('c', 100)]);
    expect(out.map((s) => [s.userId, s.position])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('maps camelCase fields the client hook indexes by', () => {
    const [s] = enrichLeagueStandings([row('u1', 150, 'Alice')]);
    expect(s.userId).toBe('u1'); // the field useLeague.find() uses
    expect(s.weeklyXp).toBe(150);
    expect(s.displayName).toBe('Alice');
  });

  it('classifies zones (promo top 10, relegation bottom 5) in a full league', () => {
    const rows = Array.from({ length: 30 }, (_, i) => row(`p${i}`, 1000 - i));
    const out = enrichLeagueStandings(rows);
    expect(out[0].zone).toBe('promotion'); // pos 1
    expect(out[9].zone).toBe('promotion'); // pos 10
    expect(out[10].zone).toBe('safe'); // pos 11
    expect(out[24].zone).toBe('safe'); // pos 25
    expect(out[25].zone).toBe('relegation'); // pos 26
    expect(out[29].zone).toBe('relegation'); // pos 30
  });

  it('handles the Supabase array-shaped embedded profile', () => {
    const [s] = enrichLeagueStandings([
      { user_id: 'x', weekly_xp: 50, profiles: [{ username: 'Bob', avatar_image: 'a.png' }] },
    ]);
    expect(s.displayName).toBe('Bob');
    expect(s.avatar).toBe('a.png');
  });

  it('prefers display_name over username when present', () => {
    const [s] = enrichLeagueStandings([
      { user_id: 'x', weekly_xp: 1, profiles: { username: 'slug_123', display_name: 'Real Name' } },
    ]);
    expect(s.displayName).toBe('Real Name');
  });

  it('returns [] for empty / null input and never throws on missing profile', () => {
    expect(enrichLeagueStandings([])).toEqual([]);
    expect(enrichLeagueStandings(null)).toEqual([]);
    const [s] = enrichLeagueStandings([{ user_id: 'x', weekly_xp: null }]);
    expect(s.weeklyXp).toBe(0);
    expect(s.displayName).toBe('Player');
  });
});
