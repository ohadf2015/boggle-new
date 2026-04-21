/**
 * TDD tests: daily challenge push reminder (BullMQ path)
 * Verifies service delegates to the HTTP-path recipient gate
 * (getDailyChallengePushRecipients) — excludes users who PLAYED today,
 * not users who STARTED but didn't finish — and sends per-user dynamic copy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetRecipients = vi.hoisted(() => vi.fn());
const mockMarkSent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockNotify = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockIsSupabaseConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock('@/lib/pushReminders', () => ({
  getDailyChallengePushRecipients: mockGetRecipients,
  markDailyPushSent: mockMarkSent,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSupabaseConfigured.mockReturnValue(true);
});

describe('sendDailyChallengeReminders', () => {
  it('notifies each recipient returned by the push-recipients gate', async () => {
    mockGetRecipients.mockResolvedValue(['user-1', 'user-2']);

    await sendDailyChallengeReminders();

    expect(mockNotify).toHaveBeenCalledTimes(2);
    const calledUserIds = mockNotify.mock.calls.map((c) => c[0]);
    expect(calledUserIds).toContain('user-1');
    expect(calledUserIds).toContain('user-2');
  });

  it('passes dynamic witty copy per user (not hardcoded default)', async () => {
    mockGetRecipients.mockResolvedValue(['user-1']);

    await sendDailyChallengeReminders();

    const override = mockNotify.mock.calls[0][1];
    expect(override).toBeDefined();
    expect(override.title).toBeTruthy();
    expect(override.body).toBeTruthy();
    expect(override.deepLink).toContain('/daily-challenge');
    expect(override.deepLink).toContain('src=push');
    expect(typeof override.variant).toBe('number');
  });

  it('gives different users different copy (deterministic variant)', async () => {
    mockGetRecipients.mockResolvedValue(['alpha', 'bravo', 'charlie', 'delta', 'echo']);

    await sendDailyChallengeReminders();

    const variants = mockNotify.mock.calls.map((c) => c[1].variant);
    const unique = new Set(variants);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('marks push as sent for each recipient', async () => {
    mockGetRecipients.mockResolvedValue(['user-1', 'user-2']);

    await sendDailyChallengeReminders();

    expect(mockMarkSent).toHaveBeenCalledWith('user-1');
    expect(mockMarkSent).toHaveBeenCalledWith('user-2');
  });

  it('does nothing when no eligible recipients', async () => {
    mockGetRecipients.mockResolvedValue([]);

    await sendDailyChallengeReminders();

    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockMarkSent).not.toHaveBeenCalled();
  });

  it('skips when Supabase not configured', async () => {
    mockIsSupabaseConfigured.mockReturnValue(false);

    await sendDailyChallengeReminders();

    expect(mockGetRecipients).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('does not throw when a single user notification fails', async () => {
    mockGetRecipients.mockResolvedValue(['user-1', 'user-2']);
    mockNotify.mockRejectedValueOnce(new Error('fcm boom'));

    await expect(sendDailyChallengeReminders()).resolves.not.toThrow();
    // still attempts the second user
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });
});
