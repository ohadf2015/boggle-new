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
            direction: 'ahead',
            scoreGap: 50,
            mode: 'puzzle',
            rivalScore: 100,
            rankDelta: 1,
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
});
