/**
 * TDD tests: daily challenge push reminder (BullMQ path)
 * Verifies service delegates to the smart per-user recipient gate
 * (getSmartDailyChallengePushRecipients) — excludes users who PLAYED today,
 * who never played, who already got pushed today, etc. — and sends
 * per-user dynamic copy including rival-aware messages when rivals exist.
 *
 * Recipient shape carries pre-fetched locale and post-send mark is batched
 * (Sentry 136 / Supabase queue depth fix).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetRecipients = vi.hoisted(() => vi.fn());
const mockMarkBatch = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
// Default: a device received the push (delivered). The service marks users as
// reminded ONLY when notify reports a real delivery.
const mockNotify = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockIsSupabaseConfigured = vi.hoisted(() => vi.fn(() => true));
const mockFindRivals = vi.hoisted(() => vi.fn());
const mockPickRivalCopy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/pushReminders', () => ({
  getSmartDailyChallengePushRecipients: mockGetRecipients,
  markDailyPushSentBatch: mockMarkBatch,
}));

vi.mock('../../modules/pushNotificationTriggers', () => ({
  notifyDailyChallengeReminder: mockNotify,
}));

vi.mock('../../modules/supabase', () => ({
  isSupabaseConfigured: mockIsSupabaseConfigured,
  getSupabase: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/dailyChallengeRivals', () => ({
  findDailyChallengeRivals: mockFindRivals,
}));

vi.mock('@/lib/rivalReminderCopy', () => ({
  pickRivalReminderCopy: mockPickRivalCopy,
}));

import { sendDailyChallengeReminders } from '../dailyChallengeReminder';

const recipient = (userId: string, locale: 'en' | 'he' | 'sv' | 'ja' | 'es' = 'en') => ({
  userId,
  locale,
});

const mockRival = (overrides = {}) => ({
  username: 'Maya',
  direction: 'above' as const,
  scoreGap: 120,
  mode: 'classic',
  rivalScore: 980,
  rankDelta: 2,
  additionalCount: 0,
  avatarImage: 'https://example.com/avatar.png',
  ...overrides,
});

const mockRivalCopy = (overrides = {}) => ({
  title: 'Maya is ahead!',
  body: 'Close the gap',
  deepLink: '/daily?src=push&rival=1',
  variant: 3,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseConfigured.mockReturnValue(true);
  // Default: no rivals
  mockFindRivals.mockResolvedValue(new Map());
  mockPickRivalCopy.mockReturnValue(mockRivalCopy());
});

describe('sendDailyChallengeReminders', () => {
  it('notifies each recipient returned by the push-recipients gate', async () => {
    mockGetRecipients.mockResolvedValue([recipient('user-1'), recipient('user-2')]);

    await sendDailyChallengeReminders();

    expect(mockNotify).toHaveBeenCalledTimes(2);
    const calledUserIds = mockNotify.mock.calls.map((c) => c[0]);
    expect(calledUserIds).toContain('user-1');
    expect(calledUserIds).toContain('user-2');
  });

  it('passes dynamic witty copy per user (not hardcoded default)', async () => {
    mockGetRecipients.mockResolvedValue([recipient('user-1')]);

    await sendDailyChallengeReminders();

    const override = mockNotify.mock.calls[0][1];
    expect(override).toBeDefined();
    expect(override.title).toBeTruthy();
    expect(override.body).toBeTruthy();
    expect(override.deepLink).toContain('/daily');
    expect(override.deepLink).not.toContain('/daily-challenge');
    expect(override.deepLink).toContain('src=push');
    expect(typeof override.variant).toBe('number');
    expect(override.locale).toBe('en');
  });

  it('gives different users different copy (deterministic variant)', async () => {
    mockGetRecipients.mockResolvedValue([
      recipient('alpha'),
      recipient('bravo'),
      recipient('charlie'),
      recipient('delta'),
      recipient('echo'),
    ]);

    await sendDailyChallengeReminders();

    const variants = mockNotify.mock.calls.map((c) => c[1].variant);
    const unique = new Set(variants);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('batches the post-send mark for all successful recipients', async () => {
    mockGetRecipients.mockResolvedValue([recipient('user-1'), recipient('user-2')]);

    await sendDailyChallengeReminders();

    expect(mockMarkBatch).toHaveBeenCalledTimes(1);
    const sentIds = mockMarkBatch.mock.calls[0][0] as string[];
    expect(sentIds).toEqual(expect.arrayContaining(['user-1', 'user-2']));
    expect(sentIds).toHaveLength(2);
  });

  it('does nothing when no eligible recipients', async () => {
    mockGetRecipients.mockResolvedValue([]);

    await sendDailyChallengeReminders();

    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockMarkBatch).not.toHaveBeenCalled();
  });

  it('skips when Supabase not configured', async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    await sendDailyChallengeReminders();

    expect(mockGetRecipients).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('does not throw when a single user notification fails', async () => {
    mockGetRecipients.mockResolvedValue([recipient('user-1'), recipient('user-2')]);
    mockNotify.mockRejectedValueOnce(new Error('fcm boom'));

    await expect(sendDailyChallengeReminders()).resolves.not.toThrow();
    // still attempts the second user
    expect(mockNotify).toHaveBeenCalledTimes(2);
    // batched mark contains only the successful user
    const sentIds = mockMarkBatch.mock.calls[0][0] as string[];
    expect(sentIds).toEqual(['user-2']);
  });

  it('marks ONLY users whose push actually delivered (undelivered retry next tick)', async () => {
    mockGetRecipients.mockResolvedValue([recipient('user-1'), recipient('user-2')]);
    // user-1 reached a live device; user-2 had none this tick (notify resolves
    // false rather than rejecting — non-delivery is not an error).
    mockNotify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await sendDailyChallengeReminders();

    const sentIds = mockMarkBatch.mock.calls[0][0] as string[];
    expect(sentIds).toEqual(['user-1']);
  });

  it('still sends the general reminder when rival lookup throws', async () => {
    mockGetRecipients.mockResolvedValue([recipient('user-1'), recipient('user-2')]);
    mockFindRivals.mockRejectedValue(new Error('season RPC exploded'));

    await expect(sendDailyChallengeReminders()).resolves.not.toThrow();

    // Baseline notification still fires for everyone; no rival copy attempted.
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockPickRivalCopy).not.toHaveBeenCalled();
    mockNotify.mock.calls.forEach((c) => expect(c[1].kind).toBeUndefined());
  });

  describe('rival-aware push', () => {
    it('uses rival copy when rival found for user', async () => {
      mockGetRecipients.mockResolvedValue([recipient('user-1', 'en')]);
      const rival = mockRival();
      mockFindRivals.mockResolvedValue(new Map([['user-1', rival]]));

      await sendDailyChallengeReminders();

      expect(mockPickRivalCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          locale: 'en',
          rivalUsername: rival.username,
          direction: rival.direction,
          scoreGap: rival.scoreGap,
          mode: rival.mode,
          rivalScore: rival.rivalScore,
          rankDelta: rival.rankDelta,
          additionalCount: rival.additionalCount,
        })
      );
      const override = mockNotify.mock.calls[0][1];
      expect(override.kind).toBe('rival');
      expect(override.imageUrl).toBe(rival.avatarImage);
    });

    it('sends generic copy when no rival found for user', async () => {
      mockGetRecipients.mockResolvedValue([recipient('user-no-rival', 'sv')]);
      mockFindRivals.mockResolvedValue(new Map());

      await sendDailyChallengeReminders();

      expect(mockPickRivalCopy).not.toHaveBeenCalled();
      const override = mockNotify.mock.calls[0][1];
      expect(override.kind).toBeUndefined();
      expect(override.imageUrl).toBeUndefined();
    });

    it('handles mixed batch: rival copy for some, generic for others', async () => {
      mockGetRecipients.mockResolvedValue([
        recipient('has-rival', 'en'),
        recipient('no-rival', 'he'),
      ]);
      mockFindRivals.mockResolvedValue(new Map([['has-rival', mockRival()]]));

      await sendDailyChallengeReminders();

      expect(mockNotify).toHaveBeenCalledTimes(2);
      const rivalCall = mockNotify.mock.calls.find((c) => c[0] === 'has-rival')![1];
      const genericCall = mockNotify.mock.calls.find((c) => c[0] === 'no-rival')![1];
      expect(rivalCall.kind).toBe('rival');
      expect(genericCall.kind).toBeUndefined();
    });

    it('calls findDailyChallengeRivals once with all recipient user IDs', async () => {
      mockGetRecipients.mockResolvedValue([
        recipient('u1'),
        recipient('u2'),
        recipient('u3'),
      ]);

      await sendDailyChallengeReminders();

      expect(mockFindRivals).toHaveBeenCalledTimes(1);
      expect(mockFindRivals).toHaveBeenCalledWith(['u1', 'u2', 'u3']);
    });

    it('skips rival lookup when no recipients', async () => {
      mockGetRecipients.mockResolvedValue([]);

      await sendDailyChallengeReminders();

      expect(mockFindRivals).not.toHaveBeenCalled();
    });
  });
});
