import { vi, type Mock, type MockInstance } from 'vitest';
import { handleGiftSend, clearGiftDedup } from '../giftHandler';

// Mock dependencies
vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../../utils/socialHelpers', () => ({
  getAuthUserId: vi.fn(),
  broadcastToUser: vi.fn(),
  getUserProfile: vi.fn().mockResolvedValue({ username: 'Alice', displayName: null, avatar: { emoji: '👤', color: '#808080' }, isOnline: true }),
}));

vi.mock('../../modules/friendsManager', () => ({
  areFriends: vi.fn(),
  isBlocked: vi.fn().mockResolvedValue(false),
}));

const mockSupabaseSelect = vi.fn();
const mockSupabaseRpc = vi.fn();
vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { coins: 100 }, error: null }),
          gte: mockSupabaseSelect,
        })),
        head: true,
        count: 'exact',
      })),
    })),
    rpc: mockSupabaseRpc,
  })),
}));

import { getAuthUserId } from '../../utils/socialHelpers';
import { areFriends } from '../../modules/friendsManager';

describe('giftHandler', () => {
  const mockSocket = {
    id: 'socket-1',
    emit: vi.fn(),
    authUserId: 'user-1',
    data: { verifiedUserId: 'user-1', username: 'Alice' },
  };

  const mockIo = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearGiftDedup();
    (getAuthUserId as Mock).mockReturnValue('user-1');
    (areFriends as Mock).mockResolvedValue(true);
    mockSupabaseSelect.mockResolvedValue({ count: 0, error: null });
    mockSupabaseRpc.mockResolvedValue({ error: null });
  });

  describe('handleGiftSend', () => {
    test('should reject unauthenticated user', async () => {
      (getAuthUserId as Mock).mockReturnValue(null);

      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-2', giftType: 'hints' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });

    test('should reject sending gift to self', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-1', giftType: 'hints' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('yourself');
    });

    test('should reject gift to non-friend', async () => {
      (areFriends as Mock).mockResolvedValue(false);

      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-2', giftType: 'hints' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('friends');
    });

    test('should allow retry after failed send (dedup commits only on success)', async () => {
      // First attempt fails at friend check
      (areFriends as Mock).mockResolvedValueOnce(false);
      const first = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-2', giftType: 'hints' }
      );
      expect(first.success).toBe(false);
      expect(first.error).toContain('friends');

      // Retry within dedup window must not be blocked by dedup
      (areFriends as Mock).mockResolvedValue(true);
      const second = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-2', giftType: 'hints' }
      );
      expect(second.error).not.toMatch(/already processing/i);
    });

    test('should reject gift when daily limit reached', async () => {
      mockSupabaseSelect.mockResolvedValue({ count: 3, error: null });

      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-2', giftType: 'hints' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });
  });
});
