/**
 * TDD tests: daily challenge push reminder (BullMQ path)
 * Verifies service delegates to the smart per-user recipient gate
 * (getSmartDailyChallengePushRecipients) — excludes users who PLAYED today,
 * who never played, who already got pushed today, etc. — and sends
 * per-user dynamic copy.
 *
 * Recipient shape carries pre-fetched locale and post-send mark is batched
 * (Sentry 136 / Supabase queue depth fix).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetRecipients = vi.hoisted(() => vi.fn());
const mockMarkBatch = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotify = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockIsSupabaseConfigured = vi.hoisted(() => vi.fn(() => true));

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

import { sendDailyChallengeReminders } from '../dailyChallengeReminder';

const recipient = (userId: string, locale: 'en' | 'he' | 'sv' | 'ja' | 'es' = 'en') => ({
  userId,
  locale,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseConfigured.mockReturnValue(true);
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
});
