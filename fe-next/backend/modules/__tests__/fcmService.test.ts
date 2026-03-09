/**
 * FCM Service Tests
 * Tests for Firebase Cloud Messaging push notification sending
 */

import { sendToUser, sendToUsers, type FCMPayload } from '../fcmService';

// Mock firebase-admin
const mockSendEachForMulticast = jest.fn();
const mockApp = {
  messaging: () => ({
    sendEachForMulticast: mockSendEachForMulticast,
  }),
};
jest.mock('firebase-admin', () => ({
  apps: [mockApp], // Non-empty so getFirebaseApp returns existing app
  initializeApp: jest.fn(() => mockApp),
  credential: {
    cert: jest.fn(() => 'mock-credential'),
  },
  app: jest.fn(() => mockApp),
}));

// Mock supabase
const mockFrom = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockSelect = jest.fn();

jest.mock('../supabase', () => ({
  getSupabase: jest.fn(() => ({
    from: mockFrom,
  })),
  isSupabaseConfigured: jest.fn(() => true),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('fcmService', () => {
  const mockPayload: FCMPayload = {
    title: 'Game Invite',
    body: 'Ohad wants to play!',
    data: { type: 'game_invite', deepLink: 'lexiclash://multiplayer?join=ABC123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

      // Should not throw
      await expect(sendToUser('user-123', mockPayload)).resolves.toBeUndefined();
    });

    it('should not throw on FCM send error', async () => {
      mockSendEachForMulticast.mockRejectedValue(new Error('FCM unavailable'));

      await expect(sendToUser('user-123', mockPayload)).resolves.toBeUndefined();
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
