import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/auth/attribution (t_a80f937b)
 *
 * Server-side persist of first-touch attribution onto the caller's own
 * profile. The hard guarantee: NEVER overwrite a non-null column — the
 * OAuth callback, email-confirm return and the handle_new_user trigger can
 * all race, and the first writer must win per column.
 */

const getUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: async () => ({
    supabase: { auth: { getUser: (...a: unknown[]) => getUser(...a) } },
    token: null,
  }),
}));

// The route emits the server-canonical growth:signup_completed through this
// chokepoint (t_b6131f7d). Mocked: the real one talks to PostHog.
const captureEduServerEvents = vi.fn();
vi.mock('@/backend/utils/educationTelemetry', () => ({
  captureEduServerEvents: (...a: unknown[]) => captureEduServerEvents(...a),
}));

interface ProfileRow {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_path: string | null;
  signup_surface: string | null;
  is_test_account: boolean;
}

const state = {
  profile: null as ProfileRow | null,
  updates: [] as Array<Record<string, string>>,
  updateError: null as { message: string } | null,
};

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.profile, error: null }),
          }),
        }),
        update: (values: Record<string, string>) => ({
          eq: async () => {
            state.updates.push(values);
            return { error: state.updateError };
          },
        }),
      };
    },
  }),
}));

import { POST } from '../route';
import { sanitizeReferrerDomain, sanitizeLandingPath } from '@/lib/auth/attributionSanitize';

const AUTHED = { data: { user: { id: 'user-1' } }, error: null };
const ANON = { data: { user: null }, error: new Error('no session') };
const ANON_USER = { data: { user: { id: 'anon-1', is_anonymous: true } }, error: null };

const EMPTY_PROFILE: ProfileRow = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  referrer: null,
  landing_path: null,
  signup_surface: null,
  is_test_account: false,
};

function req(body: unknown): Request {
  return new Request('https://www.lexiclash.live/api/auth/attribution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/attribution', () => {
  beforeEach(() => {
    getUser.mockReset();
    captureEduServerEvents.mockReset();
    state.profile = { ...EMPTY_PROFILE };
    state.updates = [];
    state.updateError = null;
  });

  it('rejects unauthenticated callers', async () => {
    getUser.mockResolvedValue(ANON);
    const res = await POST(req({ utm_source: 'google' }));
    expect(res.status).toBe(401);
    expect(state.updates).toHaveLength(0);
  });

  it('rejects an invalid body', async () => {
    getUser.mockResolvedValue(AUTHED);
    const res = await POST(req({ utm_source: 42 }));
    expect(res.status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it('writes all attribution columns onto an empty profile', async () => {
    getUser.mockResolvedValue(AUTHED);
    const res = await POST(req({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'sp-boggle',
      referrer_domain: 'google.com',
      landing_path: '/he/education?utm_source=google',
      signup_surface: 'results_inline',
    }));
    expect(res.status).toBe(200);
    expect(state.updates).toEqual([{
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'sp-boggle',
      referrer: 'google.com',
      landing_path: '/he/education?utm_source=google',
      signup_surface: 'results_inline',
    }]);
  });

  it('NEVER overwrites existing non-null columns (first writer wins)', async () => {
    getUser.mockResolvedValue(AUTHED);
    state.profile = { ...EMPTY_PROFILE, utm_source: 'tiktok', signup_surface: 'header_or_menu' };
    const res = await POST(req({
      utm_source: 'google',
      signup_surface: 'results_inline',
      referrer_domain: 'google.com',
    }));
    expect(res.status).toBe(200);
    expect(state.updates).toEqual([{ referrer: 'google.com' }]);
  });

  it('performs no update when there is nothing new to write', async () => {
    getUser.mockResolvedValue(AUTHED);
    state.profile = { ...EMPTY_PROFILE, utm_source: 'tiktok' };
    const res = await POST(req({ utm_source: 'google' }));
    expect(res.status).toBe(200);
    expect(state.updates).toHaveLength(0);
    expect(await res.json()).toMatchObject({ ok: true, applied: [] });
  });

  it('404s when the profile row does not exist yet (trigger race)', async () => {
    getUser.mockResolvedValue(AUTHED);
    state.profile = null;
    const res = await POST(req({ utm_source: 'google' }));
    expect(res.status).toBe(404);
    expect(state.updates).toHaveLength(0);
  });

  it('reduces a full referrer URL to its domain and strips non-utm query params', async () => {
    getUser.mockResolvedValue(AUTHED);
    const res = await POST(req({
      referrer_domain: 'https://www.google.com/search?q=boggle',
      landing_path: '/en/play?token=secret&utm_source=bing',
    }));
    expect(res.status).toBe(200);
    expect(state.updates[0].referrer).toBe('www.google.com');
    expect(state.updates[0].landing_path).toBe('/en/play?utm_source=bing');
  });
});

describe('POST /api/auth/attribution — server-canonical GR signup (t_b6131f7d)', () => {
  beforeEach(() => {
    getUser.mockReset();
    captureEduServerEvents.mockReset();
    state.profile = { ...EMPTY_PROFILE };
    state.updates = [];
    state.updateError = null;
  });

  it('emits growth:signup_completed exactly when the signup_surface write wins', async () => {
    getUser.mockResolvedValue(AUTHED);
    const res = await POST(req({ signup_surface: 'header_or_menu', utm_source: 'google' }));
    expect(res.status).toBe(200);
    expect(captureEduServerEvents).toHaveBeenCalledTimes(1);
    const [events] = captureEduServerEvents.mock.calls[0];
    expect(events).toEqual([{
      distinctId: 'user-1',
      event: 'growth:signup_completed',
      properties: expect.objectContaining({
        source: 'header_or_menu',
        utm_source: 'google',
        is_test_account: false,
      }),
    }]);
  });

  it('cross-device: a second browser finds signup_surface set and emits nothing', async () => {
    getUser.mockResolvedValue(AUTHED);
    // First device already wrote signup_surface; second device carries a new referrer.
    state.profile = { ...EMPTY_PROFILE, signup_surface: 'header_or_menu' };
    const res = await POST(req({ signup_surface: 'header_or_menu', referrer_domain: 'google.com' }));
    expect(res.status).toBe(200);
    // The new column is still persisted (first-writer-wins per column)…
    expect(state.updates).toEqual([{ referrer: 'google.com' }]);
    // …but it is NOT a second signup.
    expect(captureEduServerEvents).not.toHaveBeenCalled();
  });

  it('emits nothing when there is nothing to write (reload of an attributed account)', async () => {
    getUser.mockResolvedValue(AUTHED);
    state.profile = { ...EMPTY_PROFILE, signup_surface: 'results_inline' };
    const res = await POST(req({ signup_surface: 'results_inline' }));
    expect(res.status).toBe(200);
    expect(state.updates).toHaveLength(0);
    expect(captureEduServerEvents).not.toHaveBeenCalled();
  });

  it('anonymous classroom-guest sessions are not signups: no write, no event', async () => {
    getUser.mockResolvedValue(ANON_USER);
    const res = await POST(req({ signup_surface: 'header_or_menu', utm_source: 'google' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, applied: [] });
    expect(state.updates).toHaveLength(0);
    expect(captureEduServerEvents).not.toHaveBeenCalled();
  });

  it('marks QA signups on the event so funnels can exclude them', async () => {
    getUser.mockResolvedValue(AUTHED);
    state.profile = { ...EMPTY_PROFILE, is_test_account: true };
    const res = await POST(req({ signup_surface: 'header_or_menu' }));
    expect(res.status).toBe(200);
    const [events] = captureEduServerEvents.mock.calls[0];
    expect(events[0].properties.is_test_account).toBe(true);
  });
});

describe('sanitizers', () => {
  it('sanitizeReferrerDomain keeps bare domains and hostnames of URLs', () => {
    expect(sanitizeReferrerDomain('google.com')).toBe('google.com');
    expect(sanitizeReferrerDomain('https://m.facebook.com/a?x=1')).toBe('m.facebook.com');
    expect(sanitizeReferrerDomain('')).toBeNull();
    expect(sanitizeReferrerDomain('not a domain/with spaces')).toBeNull();
  });

  it('sanitizeLandingPath keeps only absolute paths with utm_* params', () => {
    expect(sanitizeLandingPath('/he')).toBe('/he');
    expect(sanitizeLandingPath('/he?utm_source=x&next=/secret')).toBe('/he?utm_source=x');
    // Full URLs and non-path input are rejected outright (client sends paths only).
    expect(sanitizeLandingPath('https://evil.com/he')).toBeNull();
    expect(sanitizeLandingPath('javascript:alert(1)')).toBeNull();
  });
});
