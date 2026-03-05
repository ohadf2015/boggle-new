import { handleGiftSend } from '../giftHandler';

// Mock dependencies
jest.mock('../../utils/logger', () => {
  const l = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  return { __esModule: true, default: l, ...l };
});

describe('giftHandler', () => {
  const mockSocket = {
    id: 'socket-1',
    emit: jest.fn(),
    data: { userId: 'user-1', username: 'Alice' },
  };

  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGiftSend', () => {
    test('should reject gift when daily limit reached', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        {
          recipientId: 'user-2',
          giftType: 'hints',
          giftsToday: 3,
          senderBalance: 100,
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    test('should reject gift when sender has insufficient balance', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        {
          recipientId: 'user-2',
          giftType: 'hints',
          giftsToday: 0,
          senderBalance: 5,
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('balance');
    });

    test('should process valid hints gift', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        {
          recipientId: 'user-2',
          giftType: 'hints',
          giftsToday: 0,
          senderBalance: 100,
        }
      );

      expect(result.success).toBe(true);
      expect(result.costDeducted).toBe(10);
      expect(result.xpAwarded).toBe(5);
    });

    test('should process valid coins gift with amount', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        {
          recipientId: 'user-2',
          giftType: 'coins',
          amount: 20,
          giftsToday: 1,
          senderBalance: 100,
        }
      );

      expect(result.success).toBe(true);
      expect(result.costDeducted).toBe(20);
      expect(result.xpAwarded).toBe(5);
    });

    test('should reject coins gift without amount', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        {
          recipientId: 'user-2',
          giftType: 'coins',
          giftsToday: 0,
          senderBalance: 100,
        }
      );

      expect(result.success).toBe(false);
    });

    test('should reject sending gift to self', async () => {
      const result = await handleGiftSend(
        mockSocket as any,
        mockIo as any,
        {
          recipientId: 'user-1',
          giftType: 'hints',
          giftsToday: 0,
          senderBalance: 100,
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('yourself');
    });
  });
});
