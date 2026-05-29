import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

/**
 * Tests for POST /api/feedback — in-app "Report a Bug" submissions.
 * Multi-channel delivery (Supabase + Telegram + email); succeeds if ANY lands.
 */

// next/server
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data: Record<string, unknown>, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(),
    })),
  },
}));

// Supabase admin client
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSelectCount = vi.fn();
const mockEqUser = vi.fn();
const mockEqReward = vi.fn();
const mockGte = vi.fn();
const mockRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: mockSelect };
      }
      if (table === 'feedback_reports') {
        return { insert: mockInsert, select: mockSelectCount };
      }
      return { insert: mockInsert };
    },
    rpc: mockRpc,
  }),
}));

// Telegram helper
const mockSendTelegram = vi.fn();
vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: (...args: unknown[]) => mockSendTelegram(...args),
  escapeTelegramMarkdownV2: (s?: string) =>
    !s ? '' : String(s).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&'),
  isTelegramConfigured: () => true,
}));

// Resend email
const mockEmailSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: mockEmailSend } })),
}));

// Rate limiter — allow by default
const mockCheckRateLimit = vi.fn();
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitResponse: () => ({ json: async () => ({ error: 'rate limited' }), status: 429 }),
  addRateLimitHeaders: (res: unknown) => res,
}));

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/lib/email', () => ({
  withTimeout: (p: Promise<unknown>) => p,
  EMAIL_COLORS: {},
}));

import { POST } from '../route';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.RESEND_API_KEY = 'test-resend';
  process.env.RESEND_FROM_EMAIL = 'LexiClash <daily@lexiclash.live>';
});

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    headers: { get: (n: string) => (n === 'x-forwarded-for' ? '127.0.0.1' : null) },
  } as unknown as Parameters<typeof POST>[0];
}

const validBody = {
  message: 'The wheel froze when I dragged the last letter on the results screen',
  page: '/en/multiplayer',
  userAgent: 'Mozilla/5.0 (iPhone)',
  userId: '11111111-2222-3333-4444-555555555555',
  locale: 'en',
  viewport: '390x844',
  appVersion: '0.1.0',
};

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() });
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockSelectCount.mockReturnValue({ eq: mockEqUser });
    mockEqUser.mockReturnValue({ eq: mockEqReward });
    mockEqReward.mockReturnValue({ gte: mockGte });
    mockGte.mockResolvedValue({ count: 0, error: null });
    mockRpc.mockResolvedValue({ data: [{}], error: null });
    mockSendTelegram.mockResolvedValue(true);
    mockEmailSend.mockResolvedValue({ error: null });
  });

  it('rejects an empty / too-short message with 400 and stores nothing', async () => {
    const res = await POST(makeRequest({ message: 'broke' }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSendTelegram).not.toHaveBeenCalled();
  });

  it('stores a valid report and notifies Telegram', async () => {
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.message).toContain('wheel froze');
    expect(inserted.page).toBe('/en/multiplayer');
    expect(inserted.user_id).toBe(validBody.userId);
    expect(inserted.locale).toBe('en');

    expect(mockSendTelegram).toHaveBeenCalledTimes(1);
    const tgText = mockSendTelegram.mock.calls[0][0] as string;
    expect(tgText).toContain('wheel froze');
    // page is escaped MarkdownV2 — the slash chars get backslash-escaped
    expect(tgText).toContain('multiplayer');
  });

  it('still succeeds when the DB insert fails but Telegram lands', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'db down' } });
    const res = await POST(makeRequest(validBody));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSendTelegram).toHaveBeenCalled();
  });

  it('returns 500 when every delivery channel fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'db down' } });
    mockSendTelegram.mockResolvedValue(false);
    mockEmailSend.mockResolvedValue({ error: { message: 'email down' } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it('honors the rate limiter', async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, remaining: 0, resetAt: Date.now() });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('accepts an anonymous report (no userId/email)', async () => {
    const { userId, ...anon } = validBody;
    void userId;
    const res = await POST(makeRequest(anon));
    const json = await res.json();
    expect(json.success).toBe(true);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.user_id ?? null).toBeNull();
  });

  // === CHANGE 1: Username lookup & storage ===
  it('looks up and stores the username from profiles for authenticated reporters', async () => {
    mockSingle.mockResolvedValue({
      data: { username: 'alice_wonder' },
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockSelect).toHaveBeenCalledWith('username');
    expect(mockEq).toHaveBeenCalledWith('id', validBody.userId);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.username).toBe('alice_wonder');
  });

  it('stores null username when profiles lookup returns no data', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(json.success).toBe(true);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.username).toBeNull();
  });

  // === CHANGE 2: Reward granted & XP/coins ===
  it('grants XP + coins to authenticated reporter on first report of the day', async () => {
    mockSingle.mockResolvedValue({
      data: { username: 'bob_builder' },
      error: null,
    });
    mockGte.mockResolvedValue({
      count: 0,
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.rewarded).toBe(true);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.reward_granted).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', expect.any(Object));
  });

  it('does not grant reward on second report same UTC day', async () => {
    mockSingle.mockResolvedValue({
      data: { username: 'charlie_day' },
      error: null,
    });
    // Already rewarded today
    mockGte.mockResolvedValue({
      count: 1,
      error: null,
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.rewarded).toBe(false);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.reward_granted).toBe(false);
  });

  it('does not attempt reward for anonymous reports', async () => {
    const { userId, ...anon } = validBody;
    void userId;
    const res = await POST(makeRequest(anon));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.rewarded).toBe(false);
  });
});
