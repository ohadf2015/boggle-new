import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => { throw new Error('must not reach auth'); }) }));
vi.mock('@/lib/polar', () => ({ getPolarClient: vi.fn(), getProProductId: vi.fn(), probeCheckoutUrl: vi.fn() }));

import { POST } from '../checkout/route';
import { POST as RESUME } from '../resume/route';

describe('checkout from the native app', () => {
  it('is refused before any auth or Polar work', async () => {
    const req = new NextRequest('https://www.lexiclash.live/api/subscription/checkout', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; wv) LexiClashApp/1' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('resume is refused too: a Polar renewal is not switched back on inside the store app', async () => {
    const req = new NextRequest('https://www.lexiclash.live/api/subscription/resume', {
      method: 'POST',
      headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; wv) LexiClashApp/1' },
    });
    expect((await RESUME(req)).status).toBe(403);
  });
});
