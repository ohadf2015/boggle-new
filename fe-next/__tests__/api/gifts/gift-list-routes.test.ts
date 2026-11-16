import { vi } from 'vitest';

const { mockGetAuthedUser, mockCreateRequestClient, mockCreateClient } = vi.hoisted(() => ({
  mockGetAuthedUser: vi.fn(),
  mockCreateRequestClient: vi.fn(),
  mockCreateClient: vi.fn(),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: mockGetAuthedUser }));
vi.mock('@/utils/supabase/server', () => ({ createRequestClient: mockCreateRequestClient, createClient: mockCreateClient }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { GET as listGifts } from '@/app/api/player/gifts/route';
import { GET as unclaimedCount } from '@/app/api/player/gifts/unclaimed-count/route';
import { GET as giftById } from '@/app/api/player/gifts/[id]/route';

const DISMISSED = '2026-01-10T10:00:00Z';
const OLD_GIFT = { id: 'old', claimed: false, created_at: '2026-01-05T10:00:00Z' };

/** Fake client: records `.gt` calls; every chain resolves with the given rows. */
function fakeClient(rows: unknown[]) {
  const gtCalls: unknown[][] = [];
  const builder: Record<string, unknown> = {};
  const result = { data: rows, count: rows.length, error: null };
  for (const m of ['select', 'eq', 'order']) builder[m] = vi.fn(() => builder);
  builder.gt = vi.fn((...a: unknown[]) => { gtCalls.push(a); return builder; });
  builder.single = vi.fn(async () => ({ data: rows[0] ?? { gift_modal_dismissed_at: DISMISSED }, error: null }));
  builder.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return { client: { from: vi.fn(() => builder) }, gtCalls };
}

const req = (url: string) => new Request(`http://x${url}`, { headers: { Authorization: 'Bearer t' } });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthedUser.mockResolvedValue({ id: 'u1' });
});

describe('player gift routes', () => {
  it('lists every unclaimed gift even after the player closed the popup (no dismissed_at filter)', async () => {
    const { client, gtCalls } = fakeClient([OLD_GIFT]);
    mockCreateRequestClient.mockResolvedValue({ supabase: client, token: 't' });
    const res = await listGifts(req('/api/player/gifts'));
    const body = await res.json();
    expect(body.gifts.map((g: { id: string }) => g.id)).toEqual(['old']);
    expect(gtCalls).toEqual([]);
  });

  it('counts every unclaimed gift, not only ones newer than the dismissal', async () => {
    const { client, gtCalls } = fakeClient([OLD_GIFT, { ...OLD_GIFT, id: 'old2' }]);
    mockCreateRequestClient.mockResolvedValue({ supabase: client, token: 't' });
    const res = await unclaimedCount(req('/api/player/gifts/unclaimed-count') as never);
    expect((await res.json()).count).toBe(2);
    expect(gtCalls).toEqual([]);
  });

  it.each([
    ['list', () => listGifts(req('/api/player/gifts'))],
    ['count', () => unclaimedCount(req('/api/player/gifts/unclaimed-count') as never)],
    ['by id', () => giftById(req('/api/player/gifts/g1') as never, { params: Promise.resolve({ id: 'g1' }) })],
  ])('%s reads with the Bearer-aware client so cookie-less sessions see their gifts', async (_n, call) => {
    const { client } = fakeClient([OLD_GIFT]);
    mockCreateRequestClient.mockResolvedValue({ supabase: client, token: 't' });
    await call();
    expect(mockCreateRequestClient).toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
