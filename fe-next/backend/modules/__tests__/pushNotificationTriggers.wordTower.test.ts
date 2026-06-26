/**
 * Word Tower Push Notification Triggers Tests
 * Tests for word tower wreck/pass events
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyWordTowerWreck,
  notifyWordTowerPass,
} from '../pushNotificationTriggers';

// Mock fcmService
const { mockSendToUser } = vi.hoisted(() => {
  const mockSendToUser = vi.fn();
  return { mockSendToUser };
});
vi.mock('../fcmService', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));

// Mock supabase for notification history + profile locale lookup
const { mockInsert, mockMaybeSingle } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));
vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        };
      }
      return { insert: mockInsert };
    }),
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

describe('wordTowerPushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: { language: 'en' }, error: null });
    mockSendToUser.mockResolvedValue(undefined);
  });

  describe('notifyWordTowerWreck', () => {
    it('should send push with correct payload for wreck notification', async () => {
      await notifyWordTowerWreck('defender-id', 'Ohad', 25);

      expect(mockSendToUser).toHaveBeenCalledWith('defender-id', expect.objectContaining({
        title: '💥 Tower Wrecked!',
        body: expect.stringContaining('Ohad'),
        body: expect.stringContaining('25'),
        data: {
          type: 'word_tower_wreck',
          deepLink: '/word-tower',
        },
      }));
    });

    it('should save notification to history with social type', async () => {
      await notifyWordTowerWreck('defender-id', 'Ohad', 25);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'defender-id',
          notification_type: 'social',
          title: expect.stringContaining('Wrecked'),
        })
      );
    });

    it('should interpolate attacker name and damage in body', async () => {
      await notifyWordTowerWreck('defender-id', 'Alice', 42);

      const call = mockSendToUser.mock.calls[0][1];
      expect(call.body).toContain('Alice');
      expect(call.body).toContain('42');
    });

    it('should not throw on FCM failure (fire-and-forget)', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyWordTowerWreck('user', 'Alice', 25)).resolves.toBeUndefined();
    });
  });

  describe('notifyWordTowerPass', () => {
    it('should send push with correct payload for pass notification', async () => {
      await notifyWordTowerPass('rival-id', 'Bob');

      expect(mockSendToUser).toHaveBeenCalledWith('rival-id', expect.objectContaining({
        title: '🏗️ Tower Topped!',
        body: expect.stringContaining('Bob'),
        data: {
          type: 'word_tower_pass',
          deepLink: '/word-tower',
        },
      }));
    });

    it('should save notification to history with social type', async () => {
      await notifyWordTowerPass('rival-id', 'Bob');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'rival-id',
          notification_type: 'social',
          title: expect.stringContaining('Tower Topped'),
        })
      );
    });

    it('should interpolate passer name in body', async () => {
      await notifyWordTowerPass('rival-id', 'Charlie');

      const call = mockSendToUser.mock.calls[0][1];
      expect(call.body).toContain('Charlie');
    });

    it('should not throw on FCM failure', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyWordTowerPass('user', 'Bob')).resolves.toBeUndefined();
    });
  });
});
