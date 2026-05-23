import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock references (accessible inside vi.mock factories) ──
const {
  mockGetUser,
  mockProfileSelect,
  mockAdminListUsers,
  mockAdminFrom,
  mockSendToPlayer,
  mockCaptureError,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockProfileSelect: vi.fn(),
  mockAdminListUsers: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockSendToPlayer: vi.fn().mockResolvedValue({ success: true }),
  mockCaptureError: vi.fn(),
}));

// ── Module mocks ───────────────────────────────────────────────────
vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }) };
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: mockProfileSelect }) }) };
      }
      return {};
    },
  })),
}));

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockAdminFrom,
    auth: { admin: { listUsers: mockAdminListUsers } },
  })),
  isEmailServiceConfigured: vi.fn(() => true),
  generateUnsubscribeToken: vi.fn(() => 'mock-unsub-token'),
  getSubscriberRecipients: vi.fn(),
  CAMPAIGN_SUBSCRIPTION_COLUMN: 'daily_email_subscribed',
  isUnsubscribedFromCampaigns: (p: { daily_email_subscribed?: boolean | null }) =>
    p?.daily_email_subscribed === false,
}));

vi.mock('@/lib/reengagementEmail', () => ({
  resolveUserLanguage: vi.fn(async () => 'en'),
  getFirstLetterForLanguage: vi.fn(async () => ({ letter: 'A' })),
  sendReengagementEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock('@/lib/gameModeAnnouncementEmail', () => ({
  sendGameModeAnnouncementToPlayer: mockSendToPlayer,
  generateGameModeAnnouncementHtml: vi.fn(async () => ({
    subject: 'Test Subject',
    html: '<html>test</html>',
  })),
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: mockCaptureError }));
vi.mock('@/backend/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from '../../send-bulk-email/route';
import { getSubscriberRecipients } from '@/lib/email';
import { generateGameModeAnnouncementHtml } from '@/lib/gameModeAnnouncementEmail';

// ── Helpers ────────────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/send-bulk-email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
  mockProfileSelect.mockResolvedValue({ data: { is_admin: true } });
}

function setupPlayers(
  players: { id: string; email: string; daily_email_subscribed?: boolean | null }[]
) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          neq: () => Promise.resolve({
            data: players.map(p => ({
              id: p.id,
              display_name: 'Player',
              username: 'player',
              timezone: null,
              country_code: null,
              email_unsubscribe_token: 'tok',
              // NULL/true = subscribed; explicit false = unsubscribed.
              daily_email_subscribed: p.daily_email_subscribed ?? true,
            })),
            error: null,
          }),
        }),
        update: () => ({ eq: vi.fn() }),
      };
    }
    if (table === 'email_subscribers') {
      return {
        update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
    }
    return {};
  });

  mockAdminListUsers.mockResolvedValue({
    data: { users: players.map(p => ({ id: p.id, email: p.email })) },
    error: null,
  });
}

// ── Tests ──────────────────────────────────────────────────────────
describe('POST /api/admin/send-bulk-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 'fake-key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'noreply@lexiclash.live');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://lexiclash.live');
  });

  it('rejects includeSubscribers for reengagement emails', async () => {
    setupAdminAuth();
    setupPlayers([]);

    const res = await POST(makeRequest({
      emailType: 'reengagement',
      includeSubscribers: true,
    }));

    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/subscriber.*reengagement|not.*valid/i);
  });

  it('sends game-mode-announcement to subscribers when includeSubscribers=true', async () => {
    setupAdminAuth();
    setupPlayers([{ id: 'p1', email: 'player@test.com' }]);

    (getSubscriberRecipients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, email: 'sub@test.com', language: 'en', unsubscribe_token: 'sub-tok-1' },
      { id: 2, email: 'sub2@test.com', language: 'he', unsubscribe_token: 'sub-tok-2' },
    ]);

    const res = await POST(makeRequest({
      emailType: 'game-mode-announcement',
      mode: 'blast',
      includeSubscribers: true,
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.subscribersSent).toBe(2);
    expect(getSubscriberRecipients).toHaveBeenCalledTimes(1);
    expect(generateGameModeAnnouncementHtml).toHaveBeenCalled();
  });

  it('does not fetch subscribers when includeSubscribers is false', async () => {
    setupAdminAuth();
    setupPlayers([{ id: 'p1', email: 'player@test.com' }]);

    const res = await POST(makeRequest({
      emailType: 'game-mode-announcement',
      mode: 'blast',
      includeSubscribers: false,
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(getSubscriberRecipients).not.toHaveBeenCalled();
    expect(json.subscribersSent).toBeUndefined();
  });

  it('NEVER emails a profile that has unsubscribed, even if it slips past the DB query', async () => {
    // Defense-in-depth: the mock query returns BOTH an unsubscribed row and a
    // subscribed one (simulating query drift). The route must still suppress the
    // unsubscribed recipient in-memory — the unsubscribe guarantee for ALL bulk
    // email types must not rely on the DB filter alone.
    setupAdminAuth();
    setupPlayers([
      { id: 'p-sub', email: 'subscribed@test.com', daily_email_subscribed: true },
      { id: 'p-unsub', email: 'unsubscribed@test.com', daily_email_subscribed: false },
    ]);

    const res = await POST(makeRequest({ emailType: 'game-mode-announcement', mode: 'blast' }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.total).toBe(1); // only the subscribed player is a recipient
    expect(json.sent).toBe(1);
    expect(mockSendToPlayer).toHaveBeenCalledTimes(1);
    expect(mockSendToPlayer).toHaveBeenCalledWith('subscribed@test.com', 'blast');
    expect(mockSendToPlayer).not.toHaveBeenCalledWith('unsubscribed@test.com', 'blast');
  });

  it('dryRun includes subscriber count when includeSubscribers=true', async () => {
    setupAdminAuth();
    setupPlayers([{ id: 'p1', email: 'player@test.com' }]);

    (getSubscriberRecipients as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, email: 'sub@test.com', language: 'en', unsubscribe_token: 'sub-tok' },
    ]);

    const res = await POST(makeRequest({
      emailType: 'game-mode-announcement',
      mode: 'blast',
      includeSubscribers: true,
      dryRun: true,
    }));

    const json = await res.json();
    expect(json.dryRun).toBe(true);
    expect(json.subscriberTotal).toBe(1);
  });
});
