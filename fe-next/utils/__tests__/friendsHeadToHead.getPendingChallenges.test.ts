import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const results: Record<string, { data: unknown; error: unknown }> = {};
const tablesRead: string[] = [];

function makeQuery(table: string) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of ['eq', 'in', 'order']) builder[method] = chain;
  builder.select = (cols: string) => {
    tablesRead.push(table);
    if (table === 'friend_challenges') expect(cols).not.toMatch(/profiles/);
    return builder;
  };
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve);
  return builder;
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => makeQuery(table),
  }),
}));

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getPendingChallenges } from '@/utils/friendsHeadToHead';

const challenge = (id: string, challengerId: string) => ({
  id,
  challenger_id: challengerId,
  challenge_id: 'ROOMCODE',
  challenge_type: 'join_room',
  status: 'pending',
  created_at: '2026-11-22T10:00:00Z',
});

describe('getPendingChallenges — challenger profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tablesRead.length = 0;
    for (const k of Object.keys(results)) delete results[k];
    mockGetUser.mockResolvedValue({ data: { user: { id: 'me-123' } } });
  });

  it('reads the challenger from public_profiles, since profiles only returns the caller own row', async () => {
    const built = {
      gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18',
      eyes: 'round', eyeColor: '#4A6FA5', noseStyle: 'button', eyebrows: 'none', mouth: 'smile',
      accessory: 'none', accessoryColor: '#000000', bgColor: '#1a1a2e', shirtColor: '#4A90D9',
    };
    results.friend_challenges = { data: [challenge('c1', 'milo-1')], error: null };
    results.public_profiles = {
      data: [{
        id: 'milo-1', username: 'milo', display_name: 'Milo', avatar_emoji: '🧙',
        avatar_color: '#BFFF00', avatar_image: 'https://x/a.png', avatar_config: built,
      }],
      error: null,
    };

    const [c] = await getPendingChallenges();

    expect(tablesRead).toContain('public_profiles');
    expect(tablesRead).not.toContain('profiles');
    expect(c.challengerUsername).toBe('milo');
    expect(c.challengerDisplayName).toBe('Milo');
    expect(c.challengerAvatarEmoji).toBe('🧙');
    expect(c.challengerAvatarImage).toBe('https://x/a.png');
    expect(c.challengerCustomAvatar).toEqual(built);
  });

  it('leaves the name empty when the profile is missing so the toast shows its translated fallback', async () => {
    results.friend_challenges = { data: [challenge('c2', 'ghost')], error: null };

    const [c] = await getPendingChallenges();

    expect(c.challengerUsername).toBe('');
    expect(c.challengerAvatarEmoji).toBe('😊');
  });
});
