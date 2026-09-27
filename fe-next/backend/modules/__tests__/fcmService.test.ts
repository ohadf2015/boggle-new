/**
 * FCM Service Tests
 * Tests for Firebase Cloud Messaging push notification sending
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { sendToUser, sendToUsers, type FCMPayload } from '../fcmService';

// Mock firebase-admin
const { mockSendEachForMulticast, mockApp } = vi.hoisted(() => {
  const mockSendEachForMulticast = vi.fn();
  const mockApp = {
    messaging: () => ({
      sendEachForMulticast: mockSendEachForMulticast,
    }),
  };
  return { mockSendEachForMulticast, mockApp };
});
vi.mock('firebase-admin', () => ({
  apps: [mockApp], // Non-empty so getFirebaseApp returns existing app
  initializeApp: vi.fn(() => mockApp),
  credential: {
    cert: vi.fn(() => 'mock-credential'),
  },
  app: vi.fn(() => mockApp),
}));

// Mock supabase
const mockFrom = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSelect = vi.fn();

vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: mockFrom,
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} }));

describe('fcmService', () => {
  const mockPayload: FCMPayload = {
    title: 'Game Invite',
    body: 'Ohad wants to play!',
    data: { type: 'game_invite', deepLink: 'lexiclash://multiplayer?join=ABC123' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: supabase returns tokens
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockImplementation((field: string) => {
      if (field === 'is_active') {
        return Promise.resolve({
          data: [
            { id: 'tok-1', token: 'fcm-token-abc', platform: 'ios' },
            { id: 'tok-2', token: 'fcm-token-def', platform: 'android' },
          ],
          error: null,
        });
      }
      // user_id filter returns chainable
      return { eq: mockEq };
    });
  });

  describe('sendToUser', () => {
    it('should send notification to all active tokens for a user', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true },
          { success: true },
        ],
      });

      await sendToUser('user-123', mockPayload);

      expect(mockFrom).toHaveBeenCalledWith('user_push_tokens');
      expect(mockSendEachForMulticast).toHaveBeenCalledWith({
        tokens: ['fcm-token-abc', 'fcm-token-def'],
        notification: {
          title: 'Game Invite',
          body: 'Ohad wants to play!',
        },
        data: { type: 'game_invite', deepLink: 'lexiclash://multiplayer?join=ABC123' },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
        android: {
          priority: 'high' as const,
          notification: { sound: 'default' },
        },
      });
    });

    it('should do nothing when user has no tokens', async () => {
      mockEq.mockImplementation((field: string) => {
        if (field === 'is_active') {
          return Promise.resolve({ data: [], error: null });
        }
        return { eq: mockEq };
      });

      await sendToUser('user-no-tokens', mockPayload);

      expect(mockSendEachForMulticast).not.toHaveBeenCalled();
    });

    it('returns the delivered device count (lets callers confirm real delivery)', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      });

      const delivered = await sendToUser('user-123', mockPayload);

      expect(delivered).toBe(2);
    });

    it('returns 0 when the user has no active tokens (nothing delivered)', async () => {
      mockEq.mockImplementation((field: string) => {
        if (field === 'is_active') {
          return Promise.resolve({ data: [], error: null });
        }
        return { eq: mockEq };
      });

      const delivered = await sendToUser('user-no-tokens', mockPayload);

      expect(delivered).toBe(0);
    });

    it('should deactivate stale tokens on FCM error', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: 'messaging/registration-token-not-registered' },
          },
        ],
      });

      // First call: select tokens. Second call: update stale tokens.
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelect };
        }
        return { update: mockUpdate };
      });
      mockUpdate.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ error: null });

      await sendToUser('user-123', mockPayload);

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockIn).toHaveBeenCalledWith('token', ['fcm-token-def']);
    });

    it('should not throw on supabase query error', async () => {
      mockEq.mockImplementation((field: string) => {
        if (field === 'is_active') {
          return Promise.resolve({ data: null, error: new Error('DB error') });
        }
        return { eq: mockEq };
      });

      // Should not throw — and reports 0 delivered so callers can retry
      await expect(sendToUser('user-123', mockPayload)).resolves.toBe(0);
    });

    it('should not throw on FCM send error', async () => {
      mockSendEachForMulticast.mockRejectedValue(new Error('FCM unavailable'));

      await expect(sendToUser('user-123', mockPayload)).resolves.toBe(0);
    });
  });

  describe('sendToUsers', () => {
    it('should send to multiple users in parallel', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      });

      await sendToUsers(['user-1', 'user-2', 'user-3'], mockPayload);

      // Should query tokens for each user
      expect(mockFrom).toHaveBeenCalledTimes(3);
    });

    it('should handle empty user list', async () => {
      await sendToUsers([], mockPayload);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
