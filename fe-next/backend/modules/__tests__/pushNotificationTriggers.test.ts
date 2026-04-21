/**
 * Push Notification Triggers Tests
 * Tests for game event → push notification wiring
 */

import { vi } from 'vitest';
import {
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyGameInvite,
  notifyDailyChallengeReminder,
  notifyAchievement,
  notifyLevelUp,
  notifyChallengeDeclined,
  notifyChallengeAccepted,
  notifyDirectMessage,
  notifyGiftReceived,
  notifyTurnReminder,
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

describe('pushNotificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: { language: 'en' }, error: null });
    mockSendToUser.mockResolvedValue(undefined);
  });

  describe('notifyFriendRequest', () => {
    it('should send push with correct payload', async () => {
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: 'Friend Request',
        body: 'Ohad sent you a friend request!',
        data: {
          type: 'friend_request',
          deepLink: '/friends?tab=requests',
        },
      }));
    });

    it('should save notification to history', async () => {
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'target-user-id',
          notification_type: 'social',
          title: 'Friend Request',
          body: 'Ohad sent you a friend request!',
        })
      );
    });

    it('should not throw on FCM failure', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyFriendRequest('user', 'Ohad')).resolves.toBeUndefined();
    });
  });

  describe('notifyFriendAccepted', () => {
    it('should send push with correct payload', async () => {
      await notifyFriendAccepted('original-sender-id', 'Maya');

      expect(mockSendToUser).toHaveBeenCalledWith('original-sender-id', expect.objectContaining({
        title: 'Friend Request Accepted',
        body: 'Maya accepted your friend request!',
        data: {
          type: 'friend_accepted',
          deepLink: '/friends?tab=friends',
        },
      }));
    });
  });

  describe('notifyDailyChallengeReminder', () => {
    it('should send push with daily_challenge deep link', async () => {
      await notifyDailyChallengeReminder('target-user-id');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: '🎯 Daily Challenge awaits',
        body: 'Keep your streak alive — 60 seconds to play!',
        data: {
          type: 'daily_challenge',
          deepLink: '/daily-challenge',
        },
      }));
    });

    it('should NOT save in-app row (push_only — scheduled nudge, no post-open value)', async () => {
      await notifyDailyChallengeReminder('target-user-id');

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should not throw on FCM failure', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyDailyChallengeReminder('user')).resolves.toBeUndefined();
    });
  });

  describe('policy: milestone events push + save in-app (re-engagement)', () => {
    it('notifyAchievement pushes AND saves in-app row', async () => {
      await notifyAchievement('uid', 'Word Wizard');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: 'Achievement Unlocked!',
        body: 'You earned: Word Wizard',
      }));
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'uid', notification_type: 'achievement' })
      );
    });

    it('notifyLevelUp pushes AND saves in-app row', async () => {
      await notifyLevelUp('uid', 7);
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: 'Level 7!',
      }));
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'uid', notification_type: 'achievement' })
      );
    });
  });

  describe('policy: in_app_only (negative UX on lock screen)', () => {
    it('notifyChallengeDeclined saves in-app row but does NOT push', async () => {
      await notifyChallengeDeclined('uid', 'Maya');
      expect(mockSendToUser).not.toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'uid', notification_type: 'social' })
      );
    });
  });

  describe('locale resolution', () => {
    it('uses Hebrew strings when profile language is he', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { language: 'he' }, error: null });
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: 'בקשת חברות',
        body: '!שלח/ה לך בקשת חברות Ohad',
      }));
    });

    it('falls back to English when profile lookup fails', async () => {
      mockMaybeSingle.mockRejectedValue(new Error('db down'));
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: 'Friend Request',
        body: 'Ohad sent you a friend request!',
      }));
    });

    it('falls back to English for unknown locale', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { language: 'xx' }, error: null });
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: 'Friend Request',
      }));
    });
  });

  describe('mascot imagery (FCM notification.image)', () => {
    // Each caller attaches a semantic mascot GIF from /public/mascot/<mood>.gif.
    // Android renders as big picture, iOS as attachment. Missing imageUrl =
    // silent regression (notification looks sterile), so assert presence + mood.
    const expectMascot = (mood: string) =>
      expect.objectContaining({
        imageUrl: expect.stringContaining(`/mascot/${mood}.gif`),
      });

    it('notifyFriendRequest → waving', async () => {
      await notifyFriendRequest('uid', 'Ohad');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('waving'));
    });

    it('notifyFriendAccepted → waving', async () => {
      await notifyFriendAccepted('uid', 'Maya');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('waving'));
    });

    it('notifyGameInvite → play', async () => {
      await notifyGameInvite('uid', 'Ohad', 'ABC');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('play'));
    });

    it('notifyTurnReminder → encouraging', async () => {
      await notifyTurnReminder('uid', 'Rival', 'ABC');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('encouraging'));
    });

    it('notifyAchievement → mindblown', async () => {
      await notifyAchievement('uid', 'First Win');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('mindblown'));
    });

    it('notifyLevelUp → celebration', async () => {
      await notifyLevelUp('uid', 3);
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('celebration'));
    });

    it('notifyChallengeAccepted → play', async () => {
      await notifyChallengeAccepted('uid', 'Rival', 'ABC');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('play'));
    });

    it('notifyDirectMessage → spectating', async () => {
      await notifyDirectMessage('uid', 'Rival', 'hey');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('spectating'));
    });

    it('notifyGiftReceived → celebration', async () => {
      await notifyGiftReceived('uid', 'Rival', 'hints');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('celebration'));
    });

    it('notifyDailyChallengeReminder → encouraging', async () => {
      await notifyDailyChallengeReminder('uid');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expectMascot('encouraging'));
    });
  });

  describe('notifyGameInvite', () => {
    it('should send push with room code deep link', async () => {
      await notifyGameInvite('target-user-id', 'Ohad', 'ABC123');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: 'Game Invite',
        body: 'Ohad invited you to play!',
        data: {
          type: 'game_invite',
          deepLink: '/join/ABC123',
        },
      }));
    });
  });
});
