import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => { throw new Error('must not reach auth'); }) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: vi.fn(), getProProductId: vi.fn(), probeCheckoutUrl: vi.fn() }));

import { POST } from '../checkout/route';

describe('checkout from the native app', () => {
  it('is refused before any auth or Polar work', async () => {
    const req = new NextRequest('https://www.lexiclash.live/api/subscription/checkout', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; wv) LexiClashApp/1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
