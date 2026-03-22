import { handleGiftSend } from '../giftHandler';

// Mock dependencies
jest.mock('../../utils/logger', () => {
  const l = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  return { __esModule: true, default: l, ...l };
});

jest.mock('../../utils/socialHelpers', () => ({
  getAuthUserId: jest.fn(),
  broadcastToUser: jest.fn(),
  getUserProfile: jest.fn().mockResolvedValue({ username: 'Alice', displayName: null, avatar: { emoji: '👤', color: '#808080' }, isOnline: true }),
}));

jest.mock('../../modules/friendsManager', () => ({
  areFriends: jest.fn(),
}));

const mockSupabaseSelect = jest.fn();
const mockSupabaseRpc = jest.fn();
jest.mock('../../modules/supabaseServer', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { coins: 100 }, error: null }),
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
    emit: jest.fn(),
    authUserId: 'user-1',
    data: { verifiedUserId: 'user-1', username: 'Alice' },
  };

  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthUserId as jest.Mock).mockReturnValue('user-1');
    (areFriends as jest.Mock).mockResolvedValue(true);
    mockSupabaseSelect.mockResolvedValue({ count: 0, error: null });
    mockSupabaseRpc.mockResolvedValue({ error: null });
  });

  describe('handleGiftSend', () => {
    test('should reject unauthenticated user', async () => {
      (getAuthUserId as jest.Mock).mockReturnValue(null);

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
      (areFriends as jest.Mock).mockResolvedValue(false);

      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        { recipientId: 'user-2', giftType: 'hints' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('friends');
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
