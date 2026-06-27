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
  notifyAchievementsBatch,
  notifyLevelUp,
  notifyChallengeDeclined,
  notifyChallengeAccepted,
  notifyDirectMessage,
  notifyGiftReceived,
  notifyTurnReminder,
  notifySeasonStart,
  notifyCuratorAssigned,
} from '../pushNotificationTriggers';

// Mock fcmService
const { mockSendToUser } = vi.hoisted(() => {
  const mockSendToUser = vi.fn();
  return { mockSendToUser };
});
vi.mock('../fcmService', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));

// Mock push dedup — Redis-backed in real code; tests control allow/deny.
const { mockShouldSendDM } = vi.hoisted(() => ({
  mockShouldSendDM: vi.fn(),
}));
vi.mock('../pushDedup', () => ({
  shouldSendDirectMessagePush: (...args: unknown[]) => mockShouldSendDM(...args),
  clearDirectMessagePushDedup: vi.fn(),
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
    mockShouldSendDM.mockResolvedValue(true);
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

  describe('notifyCuratorAssigned', () => {
    it('sends a localized push naming the curated language (by autonym) + deep-links to the dashboard', async () => {
      // recipient locale defaults to 'en' (mockMaybeSingle → { language: 'en' })
      await notifyCuratorAssigned('new-curator-id', 'he', 2);

      expect(mockSendToUser).toHaveBeenCalledWith('new-curator-id', expect.objectContaining({
        title: "🎉 You're a Language Curator!",
        // {language} is filled with the curated language's autonym, not its code,
        // so it reads naturally regardless of the recipient's own locale.
        body: expect.stringContaining('עברית'),
        data: expect.objectContaining({
          type: 'curator_assigned',
          deepLink: '/curator',
        }),
      }));
    });

    it('saves an in-app notification row (system type)', async () => {
      await notifyCuratorAssigned('new-curator-id', 'es', 1);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'new-curator-id',
          notification_type: 'system',
          action_url: '/curator',
        })
      );
    });

    it('never throws on FCM failure (fire-and-forget)', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyCuratorAssigned('u', 'sv', 3)).resolves.toBeUndefined();
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
          deepLink: '/daily',
        },
      }));
    });

    it('should NOT save in-app row (push_only — scheduled nudge, no post-open value)', async () => {
      await notifyDailyChallengeReminder('target-user-id');

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('returns true when a device actually received the push', async () => {
      mockSendToUser.mockResolvedValue(1);
      await expect(notifyDailyChallengeReminder('user')).resolves.toBe(true);
    });

    it('returns false when nothing was delivered (no live device) — lets the cron retry', async () => {
      mockSendToUser.mockResolvedValue(0);
      await expect(notifyDailyChallengeReminder('user')).resolves.toBe(false);
    });

    it('returns false (not throw) on FCM failure so the user is not marked as reminded', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyDailyChallengeReminder('user')).resolves.toBe(false);
    });
  });

  describe('policy: milestone events push + save in-app (re-engagement)', () => {
    it('notifyAchievement pushes AND saves in-app row', async () => {
      await notifyAchievement('uid', 'Word Wizard');
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: '🏅 Achievement Unlocked!',
        body: 'Nailed it — Word Wizard is yours!',
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
          deepLink: '/multiplayer?room=ABC123',
        },
      }));
    });
  });

  describe('notifySeasonStart', () => {
    it('sends push with claim copy when prev season provided', async () => {
      await notifySeasonStart('uid', 5, 4);

      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: '🏆 Season 5 is here!',
        body: 'Season 4 ended — claim your rewards now!',
        data: {
          type: 'season_start',
          deepLink: '/leaderboard?seasonModal=1',
        },
      }));
    });

    it('falls back to no-claim copy when prev season missing', async () => {
      await notifySeasonStart('uid', 1);

      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: '🏆 Season 1 is here!',
        body: 'A new season has begun — climb the ranks!',
      }));
    });

    it('saves notification history with system type', async () => {
      await notifySeasonStart('uid', 5, 4);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'uid',
          notification_type: 'system',
          title: '🏆 Season 5 is here!',
        }),
      );
    });

    it('does not throw on FCM failure', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifySeasonStart('uid', 5, 4)).resolves.toBeUndefined();
    });
  });

  describe('notifyAchievement: locale-aware name resolution', () => {
    it('resolves localized achievement name from translation key', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { language: 'he' }, error: null });
      await notifyAchievement('uid', 'WORD_MASTER');

      // Hebrew achievement table: WORD_MASTER → "אדון המילים"
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        body: expect.stringContaining('אדון המילים'),
      }));
    });

    it('falls back to English achievement name when locale missing entry', async () => {
      mockMaybeSingle.mockResolvedValue({ data: { language: 'en' }, error: null });
      await notifyAchievement('uid', 'WORD_MASTER');

      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        body: 'Nailed it — Word Master is yours!',
      }));
    });

    it('humanizes unknown keys (no translation entry)', async () => {
      // Defensive: unknown_test_key → "Unknown Test Key"
      await notifyAchievement('uid', 'UNKNOWN_TEST_KEY');

      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        body: 'Nailed it — UNKNOWN TEST KEY is yours!',
      }));
    });
  });

  describe('notifyAchievementsBatch: coalesce multi-unlock', () => {
    it('no-ops on empty array', async () => {
      await notifyAchievementsBatch('uid', []);
      expect(mockSendToUser).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('falls back to single-push copy for one key', async () => {
      await notifyAchievementsBatch('uid', ['WORD_MASTER']);

      expect(mockSendToUser).toHaveBeenCalledTimes(1);
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: '🏅 Achievement Unlocked!',
        body: 'Nailed it — Word Master is yours!',
      }));
    });

    it('uses two-key copy for exactly two unlocks', async () => {
      await notifyAchievementsBatch('uid', ['WORD_MASTER', 'COMBO_KING']);

      expect(mockSendToUser).toHaveBeenCalledTimes(1);
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: '🏅 2 Achievements in One Go!',
        body: 'You earned: Word Master & Combo King',
      }));
    });

    it('coalesces 3+ unlocks into a single "+N more" push', async () => {
      await notifyAchievementsBatch('uid', [
        'WORD_MASTER',
        'COMBO_KING',
        'PERFECTIONIST',
        'LEXICON',
      ]);

      expect(mockSendToUser).toHaveBeenCalledTimes(1);
      expect(mockSendToUser).toHaveBeenCalledWith('uid', expect.objectContaining({
        title: '🏅 4 Achievements in One Go!',
        body: 'You earned: Word Master, Combo King +2 more',
      }));
    });

    it('writes a single in-app row for the batched push', async () => {
      await notifyAchievementsBatch('uid', ['WORD_MASTER', 'COMBO_KING']);
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyDirectMessage: push coalesce window', () => {
    it('pushes when dedup gate allows (first message in window)', async () => {
      mockShouldSendDM.mockResolvedValue(true);
      await notifyDirectMessage('recipient', 'Sender', 'hi', 'sender-uid');

      expect(mockShouldSendDM).toHaveBeenCalledWith('recipient', 'sender-uid');
      expect(mockSendToUser).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('skips push but still writes in-app row when window holds', async () => {
      mockShouldSendDM.mockResolvedValue(false);
      await notifyDirectMessage('recipient', 'Sender', 'second-msg', 'sender-uid');

      expect(mockSendToUser).not.toHaveBeenCalled();
      // History still written so the in-app messages list reflects every message.
      expect(mockInsert).toHaveBeenCalled();
    });

    it('does not consult dedup when caller already requested in_app_only', async () => {
      // Recipient socket online → caller passes 'in_app_only'. No push attempted,
      // so no need to claim a dedup slot (would block legitimate push if user
      // goes offline mid-burst).
      await notifyDirectMessage('recipient', 'Sender', 'hi', 'sender-uid', 'in_app_only');
      expect(mockShouldSendDM).not.toHaveBeenCalled();
      expect(mockSendToUser).not.toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('skips dedup when senderId not provided (legacy path)', async () => {
      // Without a sender-id we can't key the window; fall back to the prior
      // behaviour (always push) rather than collapsing all anonymous DMs.
      await notifyDirectMessage('recipient', 'Sender', 'hi');
      expect(mockShouldSendDM).not.toHaveBeenCalled();
      expect(mockSendToUser).toHaveBeenCalled();
    });
  });
});
