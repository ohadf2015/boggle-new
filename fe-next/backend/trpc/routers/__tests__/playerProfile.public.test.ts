import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../cache/redisCache', () => ({ cacheAside: vi.fn() }));
vi.mock('../../../modules/supabaseServer', () => ({ getSupabase: vi.fn(), isSupabaseConfigured: () => false }));

import { toPublicProfile, PUBLIC_PROFILE_COLUMNS } from '../playerProfile';

const row = {
  id: 'u1',
  username: 'ron',
  display_name: 'Ron',
  avatar_config: { base: 'round' },
  country_code: 'IL',
  current_level: 7,
  total_xp: 900,
  total_games: 20,
  total_score: 5000,
  total_words: 300,
  casual_wins: 4,
  ranked_wins: 1,
  longest_word: 'QUIXOTIC',
  longest_word_length: 8,
  achievement_counts: { RARE_GEM: 1 },
  created_at: '2025-03-04T00:00:00Z',
  premium_avatar_parts: ['accessory:crown', 'eyes:heartEye'],
};

describe('toPublicProfile', () => {
  it('Given a row, When mapped, Then exposes total wins and owned avatar parts (cosmetic, public-safe)', () => {
    const p = toPublicProfile(row, { higherCount: 9, totalPlayers: 100 });
    expect(p.totalWins).toBe(5);
    expect(p.winRate).toBe(25);
    expect(p.ownedAvatarParts).toEqual(['accessory:crown', 'eyes:heartEye']);
    expect(p.percentile).toBe(10);
    expect(p.memberSince).toBe('2025-03');
  });

  it('Given junk in premium_avatar_parts, Then only string keys survive', () => {
    const p = toPublicProfile({ ...row, premium_avatar_parts: ['a:b', 3, null] as unknown as string[] }, { higherCount: 0, totalPlayers: 1 });
    expect(p.ownedAvatarParts).toEqual(['a:b']);
    expect(toPublicProfile({ ...row, premium_avatar_parts: null }, { higherCount: 0, totalPlayers: 1 }).ownedAvatarParts).toEqual([]);
  });

  it('Never selects or returns private columns', () => {
    for (const col of ['email', 'total_coins', 'is_admin', 'email_unsubscribe_token', 'utm_source']) {
      expect(PUBLIC_PROFILE_COLUMNS).not.toContain(col);
    }
    const p = toPublicProfile({ ...row, email: 'x@y.z', total_coins: 50 } as typeof row, { higherCount: 0, totalPlayers: 1 });
    expect(JSON.stringify(p)).not.toContain('x@y.z');
    expect(p).not.toHaveProperty('totalCoins');
  });
});
