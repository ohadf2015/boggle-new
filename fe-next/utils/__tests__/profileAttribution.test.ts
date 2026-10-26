import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a) } },
}));
vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), info: vi.fn(), log: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { persistProfileAttribution } from '../profileAttribution';
import { captureFirstTouch } from '../utmCapture';

/**
 * persistProfileAttribution (t_a80f937b): the OAuth-callback / email-confirm
 * persist path. Sends the stored first touch + signup surface to
 * /api/auth/attribution with the session bearer, never throws.
 */
describe('persistProfileAttribution', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    window.history.replaceState({}, '', '/he?utm_source=google');
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('POSTs first touch + signup surface with the session bearer', async () => {
    captureFirstTouch(); // default now — must not be older than the 90d TTL
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const ok = await persistProfileAttribution('results_inline');

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/attribution');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      utm_source: 'google',
      landing_path: '/he?utm_source=google',
      signup_surface: 'results_inline',
    });
  });

  it('works without a stored first touch when only the surface is known', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const ok = await persistProfileAttribution('header_or_menu');
    expect(ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.signup_surface).toBe('header_or_menu');
    expect(body.utm_source).toBeNull();
  });

  it('skips the round-trip entirely when there is nothing to persist', async () => {
    const ok = await persistProfileAttribution(null);
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends no Authorization header when there is no session (cookie path)', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await persistProfileAttribution('edu_access');
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('returns false and never throws on network failure', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(persistProfileAttribution('header_or_menu')).resolves.toBe(false);
  });

  it('returns false on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(persistProfileAttribution('header_or_menu')).resolves.toBe(false);
  });
});
