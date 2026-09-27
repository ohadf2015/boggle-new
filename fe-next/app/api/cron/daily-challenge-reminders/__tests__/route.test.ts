// @ts-nocheck
import { vi } from 'vitest';

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => mockJson(...args) },
}));

const {
  mockGetRecipients,
  mockMarkBatch,
  mockNotify,
  mockPickDaily,
  mockPickRival,
  mockFindRivals,
  mockCaptureMessage,
} = vi.hoisted(() => ({
  mockGetRecipients: vi.fn(),
  mockMarkBatch: vi.fn(),
  mockNotify: vi.fn(),
  mockPickDaily: vi.fn(() => ({
    title: 'T',
    body: 'B',
    deepLink: '/daily',
    variant: 'daily-default',
  })),
  mockPickRival: vi.fn(() => ({
    title: 'rT',
    body: 'rB',
    deepLink: '/daily',
    variant: 'rival-default',
  })),
  mockFindRivals: vi.fn(),
  mockCaptureMessage: vi.fn(),
}));

vi.mock('@/lib/pushReminders', () => ({
  getSmartDailyChallengePushRecipients: (...a: unknown[]) => mockGetRecipients(...a),
  markDailyPushSentBatch: (...a: unknown[]) => mockMarkBatch(...a),
}));
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({
  notifyDailyChallengeReminder: (...a: unknown[]) => mockNotify(...a),
}));
vi.mock('@/lib/dailyReminderCopy', () => ({
  pickDailyReminderCopy: (...a: unknown[]) => mockPickDaily(...a),
}));
vi.mock('@/lib/dailyChallengeRivals', () => ({
  findDailyChallengeRivals: (...a: unknown[]) => mockFindRivals(...a),
}));
vi.mock('@/lib/rivalReminderCopy', () => ({
  pickRivalReminderCopy: (...a: unknown[]) => mockPickRival(...a),
}));
vi.mock('@/lib/email', () => ({
  getLocalHour: () => 18,
  getTodayDate: () => '2026-05-19',
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...a: unknown[]) => mockCaptureMessage(...a),
}));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_n: string, _ms: number, fn: () => Promise<unknown>) => ({
    status: 'ok',
    result: await fn(),
  }),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { POST } from '../route';

const CRON_SECRET = 'test-secret-x';

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as any;
}

describe('/api/cron/daily-challenge-reminders no-rival telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it('sends reminder to recipients with NO rival and reports noRivalSent count', async () => {
    mockGetRecipients.mockResolvedValueOnce([
      { userId: 'u1', locale: 'en' },
      { userId: 'u2', locale: 'en' },
      { userId: 'u3', locale: 'en' },
    ]);
    mockFindRivals.mockResolvedValueOnce(
      new Map([
        [
          'u1',
          {
            username: 'rival1',
            mode: 'wordHunt',
            additionalCount: 0,
            avatarImage: null,
          },
        ],
      ])
    );
    mockNotify.mockResolvedValue(undefined);
    mockMarkBatch.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(3);
    expect(body.rivalSent).toBe(1);
    expect(body.noRivalSent).toBe(2);
    expect(mockNotify).toHaveBeenCalledTimes(3);
    expect(mockPickDaily).toHaveBeenCalledTimes(2);
    expect(mockPickRival).toHaveBeenCalledTimes(1);
  });

  it('does not report a successful run to Sentry (kept out of the Issues view)', async () => {
    mockGetRecipients.mockResolvedValueOnce([
      { userId: 'u1', locale: 'en' },
      { userId: 'u2', locale: 'en' },
    ]);
    mockFindRivals.mockResolvedValueOnce(new Map());
    mockNotify.mockResolvedValue(undefined);
    mockMarkBatch.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    // Counts are still surfaced in the JSON response …
    expect(res.status).toBe(200);
    expect(body.sent).toBe(2);
    expect(body.noRivalSent).toBe(2);
    // … but the run is no longer an info-level Sentry event (was noise that
    // dominated the Issues view — Sentry JAVASCRIPT-NEXTJS-1HF).
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('skips Sentry telemetry when no recipients (avoid noise)', async () => {
    mockGetRecipients.mockResolvedValueOnce([]);

    await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));

    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('marks ONLY recipients whose push actually delivered (others retry next tick)', async () => {
    mockGetRecipients.mockResolvedValueOnce([
      { userId: 'u1', locale: 'en' },
      { userId: 'u2', locale: 'en' },
      { userId: 'u3', locale: 'en' },
    ]);
    mockFindRivals.mockResolvedValueOnce(new Map());
    // u1 + u3 reached a live device; u2 had no live device this tick.
    mockNotify
      .mockResolvedValueOnce(true) // u1
      .mockResolvedValueOnce(false) // u2 — not delivered
      .mockResolvedValueOnce(true); // u3
    mockMarkBatch.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.delivered).toBe(2);
    // Only the delivered users get last_daily_push_sent_at stamped — so u2 is
    // still eligible on the next hourly tick instead of silenced all day.
    const marked = mockMarkBatch.mock.calls[0][0] as string[];
    expect(marked).toEqual(['u1', 'u3']);
  });

  it('completes cleanly when NOTHING delivered (mass FCM outage hour)', async () => {
    mockGetRecipients.mockResolvedValueOnce([
      { userId: 'u1', locale: 'en' },
      { userId: 'u2', locale: 'en' },
    ]);
    mockFindRivals.mockResolvedValueOnce(new Map());
    mockNotify.mockResolvedValue(false); // no live device this hour
    mockMarkBatch.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.delivered).toBe(0);
    // Nobody marked → the whole cohort retries next tick. Marker call (if made)
    // gets an empty list, which markDailyPushSentBatch no-ops on.
    const marked = mockMarkBatch.mock.calls[0]?.[0] ?? [];
    expect(marked).toEqual([]);
  });

  it('still sends the general reminder to everyone when rival lookup throws', async () => {
    mockGetRecipients.mockResolvedValueOnce([
      { userId: 'u1', locale: 'en' },
      { userId: 'u2', locale: 'en' },
    ]);
    // Rival enrichment is optional — a failure must NOT suppress the baseline.
    mockFindRivals.mockRejectedValueOnce(new Error('season RPC exploded'));
    mockNotify.mockResolvedValue(true);
    mockMarkBatch.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockNotify).toHaveBeenCalledTimes(2);
    // Everyone gets the general copy, nobody the rival copy.
    expect(mockPickDaily).toHaveBeenCalledTimes(2);
    expect(mockPickRival).not.toHaveBeenCalled();
  });
});
