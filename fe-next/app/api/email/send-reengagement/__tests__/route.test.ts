// @ts-nocheck
import { vi } from 'vitest';

/**
 * Guards the one asymmetry between this cron route and its sibling
 * /api/cron/daily-challenge-reminders (which this job mirrors per the migration
 * comment in 20260824120000_schedule_reengagement_email_cron.sql): the sibling
 * logs an unauthorized attempt (logger.debug), this route silently 401'd. If the
 * vault `cron_secret` used by pg_cron is ever missing/wrong, every hourly
 * invocation fails closed with zero trace in app logs — see .claude/rules/
 * 60-recurring-pitfalls.md Class 4 (reengagement emails sent ZERO for 7 weeks).
 */

const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => mockJson(...args) },
}));

const { mockDebug, mockLog, mockError } = vi.hoisted(() => ({
  mockDebug: vi.fn(),
  mockLog: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: mockLog, error: mockError, debug: mockDebug, warn: vi.fn() },
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const { mockIsEmailServiceConfigured } = vi.hoisted(() => ({
  mockIsEmailServiceConfigured: vi.fn(() => true),
}));
vi.mock('@/lib/email', () => ({
  isEmailServiceConfigured: (...a: unknown[]) => mockIsEmailServiceConfigured(...a),
}));

const { mockGetRecipients } = vi.hoisted(() => ({
  mockGetRecipients: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/lib/reengagementEmail', () => ({
  getReengagementRecipients: (...a: unknown[]) => mockGetRecipients(...a),
  resolveUserLanguage: vi.fn(),
  getFirstLetterForLanguage: vi.fn(),
  sendReengagementEmail: vi.fn(),
}));

import { POST } from '../route';

const CRON_SECRET = 'test-secret-reengagement';

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as any;
}

describe('/api/email/send-reengagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsEmailServiceConfigured.mockReturnValue(true);
    mockGetRecipients.mockResolvedValue([]);
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it('rejects an unauthorized request and logs the attempt', async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(mockGetRecipients).not.toHaveBeenCalled();
    expect(mockDebug).toHaveBeenCalledWith(
      expect.stringContaining('Unauthorized')
    );
  });

  it('processes on a valid bearer secret', async () => {
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(mockGetRecipients).toHaveBeenCalledTimes(1);
  });
});
