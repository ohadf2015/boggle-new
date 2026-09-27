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

const h = vi.hoisted(() => ({
  listLive: [] as unknown[],
  listInactive: [] as unknown[],
  listError: null as null | Error,
  redisRaw: null as string | null,
  redisSet: vi.fn(async () => 'OK'),
  telegramOk: true,
  sendTelegram: vi.fn(async () => true),
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/polar', () => ({
  getProProductId: () => 'prod_teacher_pro',
  getPolarClient: () => ({
    listSubscriptions: async ({ active }: { active?: boolean }) => {
      if (h.listError) throw h.listError;
      return { items: active === false ? h.listInactive : h.listLive };
    },
  }),
}));
vi.mock('@/lib/telegram', () => ({
  escapeTelegramMarkdownV2: (t?: string) => t ?? '',
  sendTelegramMessage: (...args: unknown[]) => h.sendTelegram(...args),
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: (...args: unknown[]) => h.sendEmail(...args) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/redis/locking', () => ({
  withCronLock: async (_n: string, _ms: number, fn: () => Promise<unknown>) => ({
    status: 'ran',
    result: await fn(),
  }),
}));
vi.mock('@/backend/redis/connection', () => ({
  isRedisAvailable: () => true,
  getRedisClient: () => ({
    get: async () => h.redisRaw,
    set: h.redisSet,
  }),
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { POST } from '../route';

const CRON_SECRET = 'test-secret-churn';

function makeRequest({ authorization, dry = false }: { authorization?: string; dry?: boolean } = {}) {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    nextUrl: { searchParams: new URLSearchParams(dry ? 'dry=1' : '') },
  } as any;
}

const liveSub = {
  id: 'sub_1',
  status: 'active',
  cancel_at_period_end: false,
  amount: 900,
  currency: 'usd',
  current_period_end: '2026-10-09T00:00:00.000Z',
  started_at: '2026-09-09T00:00:00.000Z',
  customer: { email: 'lessons.wings@example.com' },
};

describe('/api/cron/teacher-pro-churn-watch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    h.listLive = [liveSub];
    h.listInactive = [];
    h.listError = null;
    h.redisRaw = null;
    h.telegramOk = true;
    h.sendTelegram.mockResolvedValue(true);
    h.sendEmail.mockResolvedValue({ ok: true });
  });

  it('rejects request without Authorization header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(h.sendTelegram).not.toHaveBeenCalled();
  });

  it('baselines a healthy first run without Telegram', async () => {
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.shouldNotify).toBe(false);
    expect(h.sendTelegram).not.toHaveBeenCalled();
    expect(h.redisSet).toHaveBeenCalled();
  });

  it('dry run reports past_due without notifying or writing redis', async () => {
    h.listLive = [];
    h.listInactive = [{ ...liveSub, status: 'past_due' }];
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}`, dry: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dry).toBe(true);
    expect(body.shouldNotify).toBe(true);
    expect(h.sendTelegram).not.toHaveBeenCalled();
    expect(h.redisSet).not.toHaveBeenCalled();
  });

  it('Telegrams on active → past_due', async () => {
    h.redisRaw = JSON.stringify([
      {
        id: 'sub_1',
        status: 'active',
        cancelAtPeriodEnd: false,
        email: 'lessons.wings@example.com',
        amount: 900,
        currency: 'usd',
        currentPeriodEnd: '2026-10-09T00:00:00.000Z',
        startedAt: '2026-09-09T00:00:00.000Z',
      },
    ]);
    h.listLive = [];
    h.listInactive = [{ ...liveSub, status: 'past_due' }];
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shouldNotify).toBe(true);
    expect(body.telegram).toBe(true);
    expect(h.sendTelegram).toHaveBeenCalledTimes(1);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('falls back to email when Telegram fails', async () => {
    h.listLive = [];
    h.listInactive = [{ ...liveSub, status: 'canceled' }];
    h.sendTelegram.mockResolvedValue(false);
    const res = await POST(makeRequest({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailed).toBe(true);
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
  });
});
