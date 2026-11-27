import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const auth = vi.hoisted(() => ({ ok: true }));
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: async () =>
    auth.ok ? { success: true } : { success: false, response: new Response('no', { status: 401 }) },
}));

import { GET } from '../route';

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/admin/holiday-greeting-preview?${qs}`));

describe('GET /api/admin/holiday-greeting-preview', () => {
  it('given holiday and language, it renders that variant', async () => {
    const res = await get('holiday=christmas&language=ru');
    const html = await res.text();
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('email-christmas.png');
    expect(html).toContain('lang="ru"');
  });

  it('given unknown values, it falls back to Hanukkah in English', async () => {
    const html = await (await get('holiday=easter&language=xx')).text();
    expect(html).toContain('email-hanukkah.png');
    expect(html).toContain('lang="en"');
  });

  it('given a non-admin, it refuses', async () => {
    auth.ok = false;
    expect((await get('')).status).toBe(401);
    auth.ok = true;
  });
});
