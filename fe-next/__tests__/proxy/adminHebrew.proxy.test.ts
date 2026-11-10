import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) },
  })),
}));

const { proxy } = await import('../../proxy');
const req = (path: string) => new NextRequest(`https://www.lexiclash.live${path}`);

describe('admin pages are Hebrew-only', () => {
  it.each(['en', 'es', 'sv', 'ja', 'ru'])('redirects /%s/admin to /he/admin', async (loc) => {
    const res = await proxy(req(`/${loc}/admin`));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://www.lexiclash.live/he/admin');
  });

  it('keeps sub-path and query', async () => {
    const res = await proxy(req('/en/admin/education/teacher/abc?x=1'));
    expect(res.headers.get('location')).toBe('https://www.lexiclash.live/he/admin/education/teacher/abc?x=1');
  });

  it('leaves /he/admin and non-admin pages alone', async () => {
    expect(await proxy(req('/he/admin'))).toHaveProperty('status', 200);
    const other = await proxy(req('/en/administrators-guide'));
    expect(other.headers.get('location')).toBeNull();
  });
});
