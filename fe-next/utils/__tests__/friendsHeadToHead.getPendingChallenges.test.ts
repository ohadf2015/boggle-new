import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase browser client
const mockGetUser = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: mockOrder,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getPendingChallenges } from '@/utils/friendsHeadToHead';

describe('getPendingChallenges — challenger profile embed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'me-123' } } });
  });

  it('resolves challengerUsername from the embedded profile object (PostgREST many-to-one shape)', async () => {
    // PostgREST returns a FORWARD foreign-key embed as a single OBJECT, not an array.
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'challenge-uuid-1',
          challenger_id: 'rival-456',
          challenge_id: 'ROOMCODE',
          message: undefined,
          status: 'pending',
          created_at: '2026-05-14T10:00:00Z',
          profiles: {
            username: 'WordWizard',
            avatar_emoji: '🧙',
            avatar_color: '#BFFF00',
          },
        },
      ],
      error: null,
    });

    const result = await getPendingChallenges();

    expect(result).toHaveLength(1);
    expect(result[0].challengerUsername).toBe('WordWizard');
    expect(result[0].challengerAvatarEmoji).toBe('🧙');
    expect(result[0].challengerAvatarColor).toBe('#BFFF00');
  });

  it('falls back to "Unknown" only when the embedded profile is genuinely missing', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'challenge-uuid-2',
          challenger_id: 'ghost-789',
          challenge_id: 'ROOMCODE2',
          status: 'pending',
          created_at: '2026-05-14T11:00:00Z',
          profiles: null,
        },
      ],
      error: null,
    });

    const result = await getPendingChallenges();

    expect(result).toHaveLength(1);
    expect(result[0].challengerUsername).toBe('Unknown');
  });

  it('maps the challenger built avatar (avatar_config) onto the pending challenge', async () => {
    const built = {
      gender: 'male',
      base: 'round',
      skinColor: '#FFDBB4',
      hair: 'spiky',
      hairColor: '#2C1B18',
      eyes: 'round',
      eyeColor: '#4A6FA5',
      noseStyle: 'button',
      eyebrows: 'none',
      mouth: 'smile',
      accessory: 'none',
      accessoryColor: '#000000',
      bgColor: '#1a1a2e',
      shirtColor: '#4A90D9',
    };
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'challenge-uuid-3',
          challenger_id: 'milo-1',
          challenge_id: 'RHCA28',
          challenge_type: 'join_room',
          status: 'pending',
          created_at: '2026-11-18T12:00:00Z',
          profiles: {
            username: 'Milo',
            display_name: 'Milo',
            avatar_emoji: '😊',
            avatar_color: '#4F46E5',
            avatar_image: null,
            avatar_config: built,
          },
        },
      ],
      error: null,
    });

    const result = await getPendingChallenges();
    expect(result[0].challengerCustomAvatar).toEqual(built);
    expect(result[0].challengerUsername).toBe('Milo');
  });
});
