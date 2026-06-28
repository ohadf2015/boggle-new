import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase browser client — getThreads now calls a single rpc()
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}));

vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getThreads } from '@/utils/friendMessages';

const FRESH = new Date(Date.now() - 60 * 1000).toISOString(); // seen 1 min ago → online
const STALE = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // seen 1h ago → offline

describe('getThreads — single-RPC mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'me-123' } } });
  });

  it('calls get_friend_threads once and maps rows to MessageThread', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          friend_id: 'eden-1',
          username: 'Eden',
          display_name: 'Eden D',
          avatar_emoji: '🦊',
          avatar_color: '#BFFF00',
          avatar_image: null,
          avatar_config: null,
          last_seen_at: FRESH,
          last_message: 'hello',
          last_message_at: '2026-05-24T21:35:53.319Z',
          last_message_sender_id: 'eden-1',
          unread_count: 2,
        },
        {
          friend_id: 'ron-2',
          username: 'Ron',
          display_name: null,
          avatar_emoji: null,
          avatar_color: null,
          avatar_image: null,
          avatar_config: null,
          last_seen_at: STALE,
          last_message: 'works?',
          last_message_at: '2026-04-26T08:48:46.947Z',
          last_message_sender_id: 'ron-2',
          unread_count: 0,
        },
      ],
      error: null,
    });

    const result = await getThreads('me-123');

    // ONE round-trip, not N+1
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('get_friend_threads', { p_user_id: 'me-123' });

    expect(result).toHaveLength(2);

    // newest first
    expect(result[0].friendUserId).toBe('eden-1');
    expect(result[0].conversationId).toBe(['me-123', 'eden-1'].sort().join('_'));
    expect(result[0].friendUsername).toBe('Eden');
    expect(result[0].friendDisplayName).toBe('Eden D');
    expect(result[0].friendAvatar.emoji).toBe('🦊');
    expect(result[0].lastMessage).toBe('hello');
    expect(result[0].unreadCount).toBe(2);
    expect(result[0].isOnline).toBe(true); // seen 1 min ago

    // defaults applied when profile fields are null
    expect(result[1].friendAvatar.emoji).toBe('👤');
    expect(result[1].friendAvatar.color).toBe('#808080');
    expect(result[1].friendDisplayName).toBeUndefined();
    expect(result[1].isOnline).toBe(false); // seen 1h ago
  });

  it('returns [] when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await getThreads();
    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns [] on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const result = await getThreads('me-123');
    expect(result).toEqual([]);
  });
});
