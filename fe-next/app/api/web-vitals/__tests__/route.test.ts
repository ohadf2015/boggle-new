import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const insert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(() => ({ insert })) })),
  getSessionUser: vi.fn(async () => ({ user: null })),
}));

import { POST } from '../route';

const send = (headerUa: string, bodyUa = headerUa) =>
  POST(
    new NextRequest('https://www.lexiclash.live/api/web-vitals', {
      method: 'POST',
      headers: { 'user-agent': headerUa },
      body: JSON.stringify({
        metric_name: 'CLS', metric_value: 0.3, metric_rating: 'poor', page_url: 'https://www.lexiclash.live/en',
        page_path: '/en', device_type: 'desktop', connection_type: null, navigation_type: 'navigate',
        session_id: 's', user_agent: bodyUa, metadata: {},
      }),
    }),
  );

describe('POST /api/web-vitals', () => {
  beforeEach(() => insert.mockClear());

  it('stores a real browser sample', async () => {
    const res = await send('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1');
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it.each([
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.7680.165 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11) Chrome/120 Mobile Safari/537.36 Chrome-Lighthouse',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1)',
  ])('accepts but does not store an automated client: %s', async (ua) => {
    const res = await send(ua);
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
  });

  it('drops a sample whose body names a headless browser even when the header looks real', async () => {
    await send('Mozilla/5.0 Safari/604.1', 'Mozilla/5.0 HeadlessChrome/146.0 Safari/537.36');
    expect(insert).not.toHaveBeenCalled();
  });
});
