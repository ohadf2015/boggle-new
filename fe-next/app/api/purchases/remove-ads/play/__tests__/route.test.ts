import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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

const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mockGetUser } }) }));
const mockRpc = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mockRpc }) }));

const mockIsConfigured = vi.fn();
const mockGetToken = vi.fn();
const mockVerify = vi.fn();
vi.mock('@/lib/purchases/playBillingVerify', () => ({
  isPlayBillingConfigured: () => mockIsConfigured(),
  getPlayAccessToken: () => mockGetToken(),
  verifyPlayPurchase: (...a: unknown[]) => mockVerify(...a),
}));

import { POST } from '../route';

const USER_ID = '11111111-2222-3333-4444-555555555555';
const req = (body: unknown = { purchaseToken: 'tok', productId: 'remove_ads' }) =>
  ({ url: 'https://www.lexiclash.live/api/purchases/remove-ads/play', json: async () => body } as unknown as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_PLAY_PACKAGE_NAME = 'live.lexiclash.app';
  mockIsConfigured.mockReturnValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  mockGetToken.mockResolvedValue('ya29.fake');
  mockVerify.mockResolvedValue({ valid: true, purchaseState: 0, orderId: 'GPA.999' });
  mockRpc.mockResolvedValue({ data: [{ success: true, deduped: false, ads_removed: true }], error: null });
});
afterEach(() => { delete process.env.GOOGLE_PLAY_PACKAGE_NAME; });

describe('POST /api/purchases/remove-ads/play', () => {
  it('returns 503 when Play Billing is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    expect((await POST(req())).status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns 401 with no authenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(req())).status).toBe(401);
  });

  it('returns 400 when purchaseToken/productId are missing', async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('grants the entitlement (play_<orderId>, provider google_play) on a valid purchase', async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('grant_remove_ads', expect.objectContaining({
      p_transaction_id: 'play_GPA.999',
      p_user_id: USER_ID,
      p_provider: 'google_play',
    }));
  });

  it('returns 400 when the purchase fails verification (never trusts the client token)', async () => {
    mockVerify.mockResolvedValueOnce({ error: 'play_api_410' });
    expect((await POST(req())).status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns 400 when the purchase is valid-shape but not Purchased', async () => {
    mockVerify.mockResolvedValueOnce({ valid: false, purchaseState: 2, orderId: '' });
    expect((await POST(req())).status).toBe(400);
  });

  it('returns 500 when the SA token cannot be minted', async () => {
    mockGetToken.mockResolvedValueOnce('');
    expect((await POST(req())).status).toBe(500);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns 500 on an RPC error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    expect((await POST(req())).status).toBe(500);
  });

  it('acks a deduped grant with 200', async () => {
    mockRpc.mockResolvedValueOnce({ data: [{ success: true, deduped: true, ads_removed: true }], error: null });
    expect((await POST(req())).status).toBe(200);
  });
});
