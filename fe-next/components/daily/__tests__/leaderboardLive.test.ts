/**
 * Pure helpers behind the "fun to watch" layer of the daily leaderboard:
 * who moved since the last poll, which countries are on the board today, and
 * the identity key shared by every merge in TabbedDailyLeaderboard.
 */

import { describe, it, expect } from 'vitest';
import {
  participantKey,
  computeRankMovements,
  collectCountries,
  MOVEMENT_TTL_MS,
} from '../leaderboardLive';

describe('participantKey', () => {
  it('keys signed-in players by id and guests by fingerprint', () => {
    expect(participantKey({ player_id: 'u1', guest_fingerprint: null })).toBe('u:u1');
    expect(participantKey({ player_id: null, guest_fingerprint: 'fp' })).toBe('g:fp');
    expect(participantKey({ player_id: null, guest_fingerprint: null })).toBeNull();
  });
});

describe('computeRankMovements', () => {
  const now = 1_000_000;
  const rows = (pairs: Array<[string, number]>) =>
    pairs.map(([id, rank]) => ({ player_id: id, guest_fingerprint: null, rank_position: rank }));

  it('records nothing on the first snapshot (no previous ranks to compare)', () => {
    const { movements, ranks } = computeRankMovements(new Map(), new Map(), rows([['a', 1], ['b', 2]]), now);
    expect(movements.size).toBe(0);
    expect(ranks.get('u:a')).toBe(1);
    expect(ranks.get('u:b')).toBe(2);
  });

  it('reports climbs as positive deltas and drops as negative ones', () => {
    const prev = new Map([['u:a', 1], ['u:b', 2], ['u:c', 3]]);
    const { movements } = computeRankMovements(prev, new Map(), rows([['c', 1], ['a', 2], ['b', 3]]), now);
    expect(movements.get('u:c')).toMatchObject({ delta: 2, at: now });
    expect(movements.get('u:a')).toMatchObject({ delta: -1 });
    expect(movements.get('u:b')).toMatchObject({ delta: -1 });
  });

  it('flags a player who was not on the previous snapshot as new', () => {
    const prev = new Map([['u:a', 1]]);
    const { movements } = computeRankMovements(prev, new Map(), rows([['a', 1], ['b', 2]]), now);
    expect(movements.get('u:b')).toMatchObject({ isNew: true, delta: 0, at: now });
    expect(movements.has('u:a')).toBe(false);
  });

  it('keeps a recent movement alive across an unchanged poll, then lets it expire', () => {
    const prev = new Map([['u:a', 1], ['u:b', 2]]);
    const live = new Map([['u:b', { delta: 3, isNew: false, at: now - MOVEMENT_TTL_MS + 1 }]]);
    const same = rows([['a', 1], ['b', 2]]);
    const { movements } = computeRankMovements(prev, live, same, now);
    expect(movements.get('u:b')?.delta).toBe(3);

    const later = computeRankMovements(prev, movements, same, now + MOVEMENT_TTL_MS);
    expect(later.movements.has('u:b')).toBe(false);
  });
});

describe('collectCountries', () => {
  it('lists distinct countries, most represented first, ignoring unknowns', () => {
    const rows = [
      { country_code: 'IL' },
      { country_code: 'us' },
      { country_code: null },
      { country_code: 'IL' },
      { country_code: 'SE' },
      { country_code: '' },
      { country_code: 'US' },
      { country_code: 'IL' },
    ];
    expect(collectCountries(rows)).toEqual(['IL', 'US', 'SE']);
  });
});
