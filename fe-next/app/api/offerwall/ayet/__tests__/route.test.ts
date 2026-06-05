import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeAyetSignature, AYET_SIGNATURE_HEADER } from '@/lib/ads/ayetOfferwallPostback';

// next/server shim — mirror the cron route tests.
const mockJson = vi.fn((data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
}));
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: { json: (...args: unknown[]) => (mockJson as (...a: unknown[]) => unknown)(...args) },
}));

vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const mockCapture = vi.fn();
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: mockCapture }) }));

const mockRpc = vi.fn();
const mockCreateAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

import { GET } from '../route';

const SECRET = 'test-publisher-api-key';
const USER_ID = '11111111-2222-3333-4444-555555555555';

/** Build a request whose query string + signature header are internally consistent. */
function makeRequest(params: Record<string, string>, opts: { sign?: boolean; badSig?: boolean } = {}) {
  const qs = new URLSearchParams(params).toString();
  const headers: Record<string, string> = {};
  if (opts.sign !== false) {
    headers[AYET_SIGNATURE_HEADER] = opts.badSig
      ? 'deadbeef'.repeat(8)
      : computeAyetSignature(params, SECRET);
  }
  return {
    url: `https://www.lexiclash.live/api/offerwall/ayet?${qs}`,
    headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    method: 'GET',
  } as unknown as Parameters<typeof GET>[0];
}

const VALID = {
  transaction_id: 'tx_abc123',
  external_identifier: USER_ID,
  amount: '500',
  payout_usd: '0.42',
  offer_id: 'off_9',
  offer_name: 'Install App',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AYET_POSTBACK_SECRET = SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc-key';
  mockRpc.mockResolvedValue({ data: [{ success: true, deduped: false, new_balance: 1500 }], error: null });
  mockCreateAdminClient.mockReturnValue({ rpc: mockRpc });
});
afterEach(() => {
  delete process.env.AYET_POSTBACK_SECRET;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe('GET /api/offerwall/ayet', () => {
  it('credits coins via grant_offerwall_coins and returns 200 on a valid signed postback', async () => {
    const res = await GET(makeRequest(VALID));
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('grant_offerwall_coins', expect.objectContaining({
      p_transaction_id: 'tx_abc123',
      p_user_id: USER_ID,
      p_amount: 500,
      p_is_chargeback: false,
    }));
  });

  it('rejects a bad signature with 403 and never touches the DB', async () => {
    const res = await GET(makeRequest(VALID, { badSig: true }));
    expect(res.status).toBe(403);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects a missing signature header with 403', async () => {
    const res = await GET(makeRequest(VALID, { sign: false }));
    expect(res.status).toBe(403);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns 503 (dark) when AYET_POSTBACK_SECRET is unset — and does not credit', async () => {
    delete process.env.AYET_POSTBACK_SECRET;
    const res = await GET(makeRequest(VALID, { sign: false }));
    expect(res.status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns 400 on a validly-signed but malformed postback (missing external_identifier)', async () => {
    const params = { transaction_id: 'tx_x', amount: '10' };
    const res = await GET(makeRequest(params));
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('passes is_chargeback through to the RPC for reversals', async () => {
    await GET(makeRequest({ ...VALID, transaction_id: 'r-tx_abc123', is_chargeback: '1', payout_usd: '-0.42' }));
    expect(mockRpc).toHaveBeenCalledWith('grant_offerwall_coins', expect.objectContaining({
      p_is_chargeback: true,
      p_transaction_id: 'r-tx_abc123',
    }));
  });

  it('acks a duplicate (deduped) postback with 200 so ayeT stops retrying', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: true, deduped: true, new_balance: 1500 }], error: null });
    const res = await GET(makeRequest(VALID));
    expect(res.status).toBe(200);
  });

  it('returns 500 on an RPC error so ayeT retries the transient failure', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    const res = await GET(makeRequest(VALID));
    expect(res.status).toBe(500);
  });

  it('acks profile-not-found with 200 (permanent, non-retryable)', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: false, deduped: false, new_balance: 0, error_message: 'Profile not found' }], error: null });
    const res = await GET(makeRequest(VALID));
    expect(res.status).toBe(200);
  });

  it('emits a PostHog offerwall_conversion event on a credited postback', async () => {
    await GET(makeRequest(VALID));
    expect(mockCapture).toHaveBeenCalledWith(expect.objectContaining({
      event: 'offerwall_conversion',
      distinctId: USER_ID,
    }));
  });
});
