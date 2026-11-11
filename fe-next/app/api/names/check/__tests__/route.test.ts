import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));

import { POST } from '../route';

const post = (body: unknown) => POST(new NextRequest('http://x/api/names/check', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/names/check', () => {
  it('Given a chosen name, Then it is ok', async () => {
    expect(await (await post({ name: 'Zigzag' })).json()).toEqual({ ok: true });
  });

  it('Given a profane name, Then it says why', async () => {
    expect(await (await post({ name: 'shit' })).json()).toEqual({ ok: false, reason: 'profane' });
  });

  it('Given no name, Then it is empty', async () => {
    expect(await (await post({})).json()).toEqual({ ok: false, reason: 'empty' });
  });
});
